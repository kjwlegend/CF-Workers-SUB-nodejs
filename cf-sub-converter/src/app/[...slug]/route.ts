import { NextRequest, NextResponse } from 'next/server'
import { validateToken, getRequestIP } from '@/lib/utils/validator'
import telegramService from '@/lib/telegram'
import logger from '@/lib/logger'
import config from '@/lib/config'
import * as storage from '@/lib/storage'
import { md5md5 } from '@/lib/utils/crypto'
import {
  LocalConverter,
  SupportedFormat,
} from '@/lib/converters/local-converter'
// import { detectSubscriptionFormat } from '@/lib/utils/format-detector'
// import { getSubscriptionData } from '@/lib/services/subscription-service'
// import { convertSubscription } from '@/lib/services/conversion-service'
// import { prisma } from '@/lib/prisma'

/**
 * Data aggregation function - mimics original CF Worker's ADD function
 * 数据聚合函数 - 模拟原始 CF Worker 的 ADD 函数
 */
async function processRawData(rawData: string): Promise<string[]> {
  // Replace tabs, quotes, pipes, carriage returns and newlines with newlines, then deduplicate newlines
  let processedText = rawData
    .replace(/[\t"'|\r\n]+/g, '\n')
    .replace(/\n+/g, '\n')

  // Remove leading and trailing newlines
  if (processedText.charAt(0) === '\n') processedText = processedText.slice(1)
  if (processedText.charAt(processedText.length - 1) === '\n')
    processedText = processedText.slice(0, processedText.length - 1)

  const dataArray = processedText
    .split('\n')
    .filter((line) => line.trim() !== '')
  logger.debug('processRawData function processed data:', {
    input: rawData.length,
    output: dataArray.length,
  })
  return dataArray
}

/**
 * Fetch subscription content - mimics original CF Worker's getSUB function
 * 获取订阅内容 - 模拟原始 CF Worker 的 getSUB 函数
 */
async function fetchSubscriptions(
  subscriptionUrls: string[],
  request: NextRequest,
  userAgent: string
): Promise<[string[], string]> {
  if (!subscriptionUrls || subscriptionUrls.length === 0) {
    return [[], '']
  }

  // Remove duplicates
  const uniqueUrls = [...new Set(subscriptionUrls)]
  let aggregatedContent = ''
  let conversionUrls = ''
  let errorNodes = ''

  logger.info('Fetching subscriptions:', {
    count: uniqueUrls.length,
    urls: uniqueUrls,
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, 5000) // 5 second timeout

  try {
    // Concurrent requests to all subscription links
    const responses = await Promise.allSettled(
      uniqueUrls.map(async (apiUrl) => {
        try {
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'User-Agent': `v2rayN/6.45 cmliu/CF-Workers-SUB (${userAgent})`,
              Accept: '*/*',
            },
            signal: controller.signal,
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          return {
            apiUrl,
            content: await response.text(),
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          logger.warn('Subscription fetch failed:', {
            url: apiUrl,
            error: errorMessage,
          })
          throw error
        }
      })
    )

    // Process response results
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i]
      const apiUrl = uniqueUrls[i]

      if (response.status === 'fulfilled') {
        const { content } = response.value

        if (content.includes('proxies:')) {
          // Clash configuration
          logger.debug('Detected Clash subscription:', apiUrl)
          conversionUrls += '|' + apiUrl
        } else if (
          content.includes('outbounds"') &&
          content.includes('inbounds"')
        ) {
          // Singbox configuration
          logger.debug('Detected Singbox subscription:', apiUrl)
          conversionUrls += '|' + apiUrl
        } else if (content.includes('://')) {
          // Plain text subscription (contains protocol node configuration)
          logger.debug('Detected plain text subscription:', apiUrl)
          aggregatedContent += content + '\n'
        } else if (isValidBase64(content)) {
          // Base64 encoded subscription
          logger.debug('Detected Base64 subscription:', apiUrl)
          try {
            const decoded = Buffer.from(content, 'base64').toString('utf-8')
            aggregatedContent += decoded + '\n'
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error)
            logger.warn('Base64 decode failed:', {
              url: apiUrl,
              error: errorMessage,
            })
            // Add error subscription marker
            const errorNodeLink = `trojan://CMLiussss@127.0.0.1:8888?security=tls&allowInsecure=1&type=tcp&headerType=none#Error_Sub_${
              apiUrl.split('://')[1].split('/')[0]
            }`
            errorNodes += `${errorNodeLink}\n`
          }
        } else {
          // Unrecognized subscription format
          logger.warn('Unknown subscription format:', apiUrl)
          const errorNodeLink = `trojan://CMLiussss@127.0.0.1:8888?security=tls&allowInsecure=1&type=tcp&headerType=none#Unknown_Sub_${
            apiUrl.split('://')[1].split('/')[0]
          }`
          errorNodes += `${errorNodeLink}\n`
        }
      } else {
        // Request failed
        logger.error('Subscription request failed:', {
          url: apiUrl,
          error: response.reason,
        })
        const errorNodeLink = `trojan://CMLiussss@127.0.0.1:8888?security=tls&allowInsecure=1&type=tcp&headerType=none#Failed_Req_${
          apiUrl.split('://')[1].split('/')[0]
        }`
        errorNodes += `${errorNodeLink}\n`
      }
    }
  } catch (error) {
    logger.error('fetchSubscriptions error:', error)
  } finally {
    clearTimeout(timeout)
  }

  // Convert processed content to array
  const subscriptionContent = await processRawData(
    aggregatedContent + errorNodes
  )

  logger.info('fetchSubscriptions completed:', {
    totalNodes: subscriptionContent.length,
    conversionUrls: conversionUrls,
  })

  return [subscriptionContent, conversionUrls]
}

/**
 * Check if string is valid Base64
 */
function isValidBase64(str: string): boolean {
  const cleanStr = str.replace(/\s/g, '')
  const base64Regex = /^[A-Za-z0-9+/=]+$/
  return base64Regex.test(cleanStr) && cleanStr.length > 0
}

/**
 * Get correct server URL, prioritizing request headers
 * This is important for applications deployed behind proxy servers
 */
function getServerUrl(request: NextRequest, fallbackUrl: URL): string {
  // 1. Check X-Forwarded-Host header (set by proxy servers)
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (forwardedHost) {
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    return `${protocol}://${forwardedHost}`
  }

  // 2. Check Host header
  const host = request.headers.get('host')
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    const protocol =
      request.headers.get('x-forwarded-proto') ||
      (host.includes('localhost') || host.includes('127.0.0.1')
        ? 'http'
        : 'https')
    return `${protocol}://${host}`
  }

  // 3. Fallback to URL origin
  return fallbackUrl.origin
}

/**
 * Check if token is a valid fakeToken
 * fakeToken is generated based on main token and current date
 */
async function checkFakeToken(token: string): Promise<boolean> {
  try {
    const { md5Double } = await import('@/lib/utils/crypto')
    const mainToken = config.token

    // Check current date's fakeToken
    const currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)
    const timeTemp = Math.ceil(currentDate.getTime() / 1000)
    const currentFakeToken = await md5Double(`${mainToken}${timeTemp}`)

    if (token === currentFakeToken) {
      return true
    }

    // Check previous day's fakeToken (error tolerance)
    const previousDate = new Date(currentDate)
    previousDate.setDate(previousDate.getDate() - 1)
    const previousTimeTemp = Math.ceil(previousDate.getTime() / 1000)
    const previousFakeToken = await md5Double(`${mainToken}${previousTimeTemp}`)

    if (token === previousFakeToken) {
      return true
    }

    // Check if it's md5Double(fakeToken) format (for internal subscription URLs)
    const hashedCurrentFakeToken = await md5Double(currentFakeToken)
    const hashedPreviousFakeToken = await md5Double(previousFakeToken)

    return token === hashedCurrentFakeToken || token === hashedPreviousFakeToken
  } catch (error) {
    logger.error('checkFakeToken error:', error)
    return false
  }
}

/**
 * Detect subscription format based on User-Agent and URL parameters
 */
function detectSubscriptionFormat(
  userAgent: string,
  url: URL
): SupportedFormat {
  const lowerUserAgent = userAgent.toLowerCase()

  // URL parameters have higher priority
  if (url.searchParams.has('b64') || url.searchParams.has('base64')) {
    return 'base64'
  } else if (url.searchParams.has('clash')) {
    return 'clash'
  } else if (url.searchParams.has('sb') || url.searchParams.has('singbox')) {
    return 'singbox'
  } else if (url.searchParams.has('surge')) {
    return 'surge'
  } else if (url.searchParams.has('quanx')) {
    return 'quanx'
  } else if (url.searchParams.has('loon')) {
    return 'loon'
  }

  // User-Agent based detection (mimics original CF Worker logic)
  if (
    lowerUserAgent.includes('null') ||
    lowerUserAgent.includes('subconverter') ||
    lowerUserAgent.includes('nekobox') ||
    lowerUserAgent.includes('cf-workers-sub')
  ) {
    return 'base64'
  } else if (
    lowerUserAgent.includes('clash') &&
    !lowerUserAgent.includes('subconverter')
  ) {
    return 'clash'
  } else if (
    (lowerUserAgent.includes('sing-box') ||
      lowerUserAgent.includes('singbox')) &&
    !lowerUserAgent.includes('subconverter')
  ) {
    return 'singbox'
  } else if (
    lowerUserAgent.includes('surge') &&
    !lowerUserAgent.includes('subconverter')
  ) {
    return 'surge'
  } else if (
    lowerUserAgent.includes('quantumult%20x') &&
    !lowerUserAgent.includes('subconverter')
  ) {
    return 'quanx'
  } else if (
    lowerUserAgent.includes('loon') &&
    !lowerUserAgent.includes('subconverter')
  ) {
    return 'loon'
  }

  // Default to base64
  return 'base64'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const resolvedParams = await params
    const url = new URL(request.url)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const ip = getRequestIP(request)

    logger.info('Subscription request:', {
      url: url.toString(),
      userAgent,
      ip,
      params: resolvedParams,
    })

    // Get token from path
    const pathToken = resolvedParams.slug?.[0]
    if (!pathToken) {
      logger.warn('No path token found, redirecting to home')
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Validate token (including fakeToken validation)
    const tokenValid = await validateToken(pathToken, url)

    // Check if it's fakeToken access
    const isFakeTokenAccess = await checkFakeToken(pathToken)

    if (!tokenValid && !isFakeTokenAccess) {
      logger.warn('Invalid token access:', { token: pathToken, ip })

      // Send Telegram notification
      try {
        await telegramService.sendMessage(
          '❌ Unauthorized Access',
          ip,
          `Token: ${pathToken}\nUser-Agent: ${userAgent}\nURL: ${url.toString()}`
        )
      } catch (error) {
        logger.error('Failed to send Telegram notification:', error)
      }

      return new Response('Unauthorized', { status: 401 })
    }

    // If it's fakeToken access, force return base64 format
    const forcedBase64 = isFakeTokenAccess

    // Browser access redirection logic is disabled for debugging
    // const isBrowser = userAgent.toLowerCase().includes('mozilla')
    // if (isBrowser && !url.searchParams.has('sub')) {
    //   logger.info('Browser detected, redirecting to edit page')
    //   const serverUrl = getServerUrl(request, url)
    //   return NextResponse.redirect(
    //     new URL(`/edit?token=${pathToken}`, serverUrl)
    //   )
    // }

    // Get stored subscription content
    const storedContent = storage.getSubscriptionContent(pathToken) || ''
    logger.info('Retrieved stored content:', {
      token: pathToken,
      length: storedContent.length,
    })

    if (!storedContent.trim()) {
      logger.warn('No subscription content found for token:', pathToken)
      return new Response('No subscription content found', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      })
    }

    // **Core Logic: Data aggregation and classification**
    logger.info('Starting data aggregation and classification')

    // 1. Convert stored content to array
    const allLinks = await processRawData(storedContent)

    // 2. Separate self-built nodes and subscription links
    let selfBuiltNodes = ''
    let subscriptionLinks = ''

    for (const link of allLinks) {
      if (link.toLowerCase().startsWith('http')) {
        subscriptionLinks += link + '\n' // HTTP links = subscription links
      } else {
        selfBuiltNodes += link + '\n' // Non-HTTP = node configuration
      }
    }

    logger.info('Data classification completed:', {
      totalLinks: allLinks.length,
      selfBuiltNodesCount: selfBuiltNodes.split('\n').filter((n) => n.trim())
        .length,
      subscriptionLinksCount: subscriptionLinks
        .split('\n')
        .filter((n) => n.trim()).length,
    })

    // 3. Get external subscription content
    let aggregatedData = selfBuiltNodes // Start with self-built nodes
    let conversionUrls = ''

    const subscriptionUrlArray = await processRawData(subscriptionLinks)
    const validSubscriptionUrls = subscriptionUrlArray.filter(
      (url) => url.trim() !== ''
    )

    if (validSubscriptionUrls.length > 0) {
      logger.info('Fetching external subscriptions:', {
        count: validSubscriptionUrls.length,
      })

      const [subscriptionContent, externalConversionUrls] =
        await fetchSubscriptions(validSubscriptionUrls, request, userAgent)

      // Aggregate all content
      aggregatedData += subscriptionContent.join('\n')

      // Update conversion URLs
      if (externalConversionUrls) {
        conversionUrls += externalConversionUrls
      }

      logger.info('External subscriptions processed:', {
        fetchedNodes: subscriptionContent.length,
        conversionUrls: externalConversionUrls,
      })
    }

    // 4. Format detection and conversion
    let subscriptionFormat = detectSubscriptionFormat(userAgent, url)

    // If forced base64 (fakeToken access), override format
    if (forcedBase64) {
      subscriptionFormat = 'base64'
    }

    logger.info('Format detection:', {
      userAgent,
      subscriptionFormat,
      hasConversionUrls: !!conversionUrls,
      forcedBase64,
    })

    // 5. Content deduplication and cleanup (mimics original CF Worker logic)
    const utf8Encoder = new TextEncoder()
    const encodedData = utf8Encoder.encode(aggregatedData)
    const utf8Decoder = new TextDecoder()
    const text = utf8Decoder.decode(encodedData)

    // Deduplication
    const uniqueLines = new Set(text.split('\n').filter((line) => line.trim()))
    const finalContent = [...uniqueLines].join('\n')

    logger.info('Content processing completed:', {
      originalLength: text.length,
      finalLength: finalContent.length,
      nodeCount: finalContent.split('\n').filter((line) => line.includes('://'))
        .length,
    })

    // 6. Use local converter for format conversion
    try {
      const convertedResult = await LocalConverter.convert(
        finalContent,
        subscriptionFormat,
        {
          filename: config.subName,
          updateInterval: config.subUpdateTime,
        }
      )

      logger.info('Local conversion successful:', {
        format: subscriptionFormat,
        resultLength: convertedResult.length,
      })

      // Send success notification
      try {
        await telegramService.sendMessage(
          '✅ Subscription Generated',
          ip,
          `Token: ${pathToken}\nUser-Agent: ${userAgent}\nFormat: ${subscriptionFormat}\nNodes: ${
            finalContent.split('\n').filter((line) => line.includes('://'))
              .length
          }`
        )
      } catch (error) {
        logger.error('Failed to send Telegram notification:', error)
      }

      // Set appropriate content type based on format
      let contentType = 'text/plain; charset=utf-8'
      if (subscriptionFormat === 'clash') {
        contentType = 'text/yaml; charset=utf-8'
      } else if (subscriptionFormat === 'singbox') {
        contentType = 'application/json; charset=utf-8'
      }

      return new Response(convertedResult, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename*=utf-8''${encodeURIComponent(
            config.subName
          )}`,
          'Profile-Update-Interval': config.subUpdateTime.toString(),
          'Cache-Control': 'no-cache',
        },
      })
    } catch (conversionError) {
      logger.error('Local conversion failed:', conversionError)

      // Fallback to base64 format
      const base64Data = Buffer.from(finalContent, 'utf-8').toString('base64')

      return new Response(base64Data, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Profile-Update-Interval': config.subUpdateTime.toString(),
          'Cache-Control': 'no-cache',
        },
      })
    }
  } catch (error) {
    logger.error('Subscription route error:', error)
    return new Response('Internal Server Error', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  }
}
