import { NextRequest, NextResponse } from 'next/server'
import { validateToken, getRequestIP } from '@/lib/utils/validator'
import telegramService from '@/lib/telegram'
import logger from '@/lib/logger'
import config from '@/lib/config'
import * as storage from '@/lib/storage'
import { md5md5 } from '@/lib/utils/crypto'
// import { detectSubscriptionFormat } from '@/lib/utils/format-detector'
// import { getSubscriptionData } from '@/lib/services/subscription-service'
// import { convertSubscription } from '@/lib/services/conversion-service'
// import { prisma } from '@/lib/prisma'

/**
 * 数据聚合函数 - 模拟原始 CF Worker 的 ADD 函数
 * 将多行文本数据清理并转换为数组
 */
async function ADD(envadd: string): Promise<string[]> {
  // 替换制表符、引号、管道符、回车换行为换行符，然后去重换行
  let addtext = envadd.replace(/[\t"'|\r\n]+/g, '\n').replace(/\n+/g, '\n')

  // 去除首尾换行符
  if (addtext.charAt(0) === '\n') addtext = addtext.slice(1)
  if (addtext.charAt(addtext.length - 1) === '\n')
    addtext = addtext.slice(0, addtext.length - 1)

  const add = addtext.split('\n').filter((line) => line.trim() !== '')
  logger.debug('ADD function processed data:', {
    input: envadd.length,
    output: add.length,
  })
  return add
}

/**
 * 获取订阅内容 - 模拟原始 CF Worker 的 getSUB 函数
 */
async function getSUB(
  api: string[],
  request: NextRequest,
  userAgent: string
): Promise<[string[], string]> {
  if (!api || api.length === 0) {
    return [[], '']
  }

  // 去重
  const uniqueApis = [...new Set(api)]
  let newapi = ''
  let 订阅转换URLs = ''
  let 异常订阅 = ''

  logger.info('Fetching subscriptions:', {
    count: uniqueApis.length,
    urls: uniqueApis,
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, 5000) // 5秒超时

  try {
    // 并发请求所有订阅链接
    const responses = await Promise.allSettled(
      uniqueApis.map(async (apiUrl) => {
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

    // 处理响应结果
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i]
      const apiUrl = uniqueApis[i]

      if (response.status === 'fulfilled') {
        const { content } = response.value

        if (content.includes('proxies:')) {
          // Clash 配置
          logger.debug('Detected Clash subscription:', apiUrl)
          订阅转换URLs += '|' + apiUrl
        } else if (
          content.includes('outbounds"') &&
          content.includes('inbounds"')
        ) {
          // Singbox 配置
          logger.debug('Detected Singbox subscription:', apiUrl)
          订阅转换URLs += '|' + apiUrl
        } else if (content.includes('://')) {
          // 明文订阅（包含协议的节点配置）
          logger.debug('Detected plain text subscription:', apiUrl)
          newapi += content + '\n'
        } else if (isValidBase64(content)) {
          // Base64 编码的订阅
          logger.debug('Detected Base64 subscription:', apiUrl)
          try {
            const decoded = Buffer.from(content, 'base64').toString('utf-8')
            newapi += decoded + '\n'
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error)
            logger.warn('Base64 decode failed:', {
              url: apiUrl,
              error: errorMessage,
            })
            // 添加异常订阅标记
            const 异常订阅LINK = `trojan://CMLiussss@127.0.0.1:8888?security=tls&allowInsecure=1&type=tcp&headerType=none#异常订阅 ${
              apiUrl.split('://')[1].split('/')[0]
            }`
            异常订阅 += `${异常订阅LINK}\n`
          }
        } else {
          // 无法识别的订阅格式
          logger.warn('Unknown subscription format:', apiUrl)
          const 异常订阅LINK = `trojan://CMLiussss@127.0.0.1:8888?security=tls&allowInsecure=1&type=tcp&headerType=none#异常订阅 ${
            apiUrl.split('://')[1].split('/')[0]
          }`
          异常订阅 += `${异常订阅LINK}\n`
        }
      } else {
        // 请求失败
        logger.error('Subscription request failed:', {
          url: apiUrl,
          error: response.reason,
        })
        const 异常订阅LINK = `trojan://CMLiussss@127.0.0.1:8888?security=tls&allowInsecure=1&type=tcp&headerType=none#请求失败 ${
          apiUrl.split('://')[1].split('/')[0]
        }`
        异常订阅 += `${异常订阅LINK}\n`
      }
    }
  } catch (error) {
    logger.error('getSUB error:', error)
  } finally {
    clearTimeout(timeout)
  }

  // 将处理后的内容转换为数组
  const 订阅内容 = await ADD(newapi + 异常订阅)

  logger.info('getSUB completed:', {
    totalNodes: 订阅内容.length,
    conversionUrls: 订阅转换URLs,
  })

  return [订阅内容, 订阅转换URLs]
}

/**
 * 检查是否为有效的 Base64 字符串
 */
function isValidBase64(str: string): boolean {
  const cleanStr = str.replace(/\s/g, '')
  const base64Regex = /^[A-Za-z0-9+/=]+$/
  return base64Regex.test(cleanStr) && cleanStr.length > 0
}

/**
 * 代理 URL 请求 - 用于调用外部转换服务
 * 实现完整的订阅转换逻辑，包括 fakeToken 机制
 */
async function proxyURL(
  订阅转换URL: string,
  originalUrl: URL
): Promise<Response> {
  try {
    // 解析转换服务 URL
    const proxyUrls = 订阅转换URL.split('|').filter((url) => url.trim() !== '')
    if (proxyUrls.length === 0) {
      throw new Error('No conversion URLs available')
    }

    // 随机选择一个转换服务
    const selectedUrl = proxyUrls[Math.floor(Math.random() * proxyUrls.length)]
    const parsedURL = new URL(selectedUrl)

    // 构建转换请求 URL
    let newURL = `${parsedURL.protocol}//${parsedURL.hostname}${parsedURL.pathname}`
    if (originalUrl.search) {
      newURL += originalUrl.search
    }

    logger.info('Proxying to conversion service:', {
      originalUrl: selectedUrl,
      newURL,
    })

    // 发送请求到转换服务
    const response = await fetch(newURL, {
      method: 'GET',
      headers: {
        'User-Agent': 'CF-Workers-SUB/1.0',
        Accept: '*/*',
      },
    })

    if (!response.ok) {
      throw new Error(
        `Conversion service error: ${response.status} ${response.statusText}`
      )
    }

    const content = await response.text()

    // 如果是 Clash 配置，应用修复
    let finalContent = content
    if (
      content.includes('wireguard') &&
      !content.includes('remote-dns-resolve')
    ) {
      finalContent = clashFix(content)
    }

    return new Response(finalContent, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type':
          response.headers.get('Content-Type') || 'text/plain; charset=utf-8',
        'Profile-Update-Interval': config.subUpdateTime.toString(),
        'X-New-URL': newURL,
      },
    })
  } catch (error) {
    logger.error('proxyURL error:', error)
    throw error
  }
}

/**
 * 检查是否为有效的 fakeToken
 * fakeToken 是基于主 token 和当前日期生成的
 */
async function checkFakeToken(token: string): Promise<boolean> {
  try {
    const { md5Double } = await import('@/lib/utils/crypto')
    const mainToken = config.token

    // 检查当前日期的 fakeToken
    const currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)
    const timeTemp = Math.ceil(currentDate.getTime() / 1000)
    const currentFakeToken = await md5Double(`${mainToken}${timeTemp}`)

    if (token === currentFakeToken) {
      return true
    }

    // 检查前一天的 fakeToken（容错处理）
    const previousDate = new Date(currentDate)
    previousDate.setDate(previousDate.getDate() - 1)
    const previousTimeTemp = Math.ceil(previousDate.getTime() / 1000)
    const previousFakeToken = await md5Double(`${mainToken}${previousTimeTemp}`)

    if (token === previousFakeToken) {
      return true
    }

    // 检查是否为 md5Double(fakeToken) 格式（用于内部订阅 URL）
    const hashedCurrentFakeToken = await md5Double(currentFakeToken)
    const hashedPreviousFakeToken = await md5Double(previousFakeToken)

    return token === hashedCurrentFakeToken || token === hashedPreviousFakeToken
  } catch (error) {
    logger.error('checkFakeToken error:', error)
    return false
  }
}

/**
 * Clash 配置修复函数
 */
function clashFix(content: string): string {
  if (
    content.includes('wireguard') &&
    !content.includes('remote-dns-resolve')
  ) {
    const lines = content.includes('\r\n')
      ? content.split('\r\n')
      : content.split('\n')
    let result = ''

    for (const line of lines) {
      if (line.includes('type: wireguard')) {
        const 备改内容 = ', mtu: 1280, udp: true'
        const 正确内容 = ', mtu: 1280, remote-dns-resolve: true, udp: true'
        result += line.replace(new RegExp(备改内容, 'g'), 正确内容) + '\n'
      } else {
        result += line + '\n'
      }
    }

    return result
  }
  return content
}

/**
 * 调用外部订阅转换服务
 * 实现完整的 subconverter API 调用逻辑
 */
async function callSubConverter(
  targetFormat: string,
  subscriptionUrl: string,
  originalUrl: URL
): Promise<Response> {
  try {
    // 构建转换服务 URL
    const baseUrl = `${config.subProtocol}://${config.subApi}/sub`
    const params = new URLSearchParams({
      target: targetFormat,
      url: encodeURIComponent(subscriptionUrl),
      insert: 'false',
      config: encodeURIComponent(config.subConfig),
      emoji: 'true',
      list: 'false',
      tfo: 'false',
      scv: 'true',
      fdn: 'false',
      sort: 'false',
      new_name: 'true',
    })

    // 格式特定参数
    if (targetFormat === 'surge') {
      params.set('ver', '4')
    } else if (targetFormat === 'quanx') {
      params.set('udp', 'true')
    }

    const subConverterUrl = `${baseUrl}?${params.toString()}`

    logger.info('Calling subconverter:', {
      targetFormat,
      subscriptionUrl,
      subConverterUrl,
    })

    // 调用转换服务
    const response = await fetch(subConverterUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'CF-Workers-SUB/1.0',
        Accept: '*/*',
      },
    })

    if (!response.ok) {
      throw new Error(
        `Subconverter error: ${response.status} ${response.statusText}`
      )
    }

    let content = await response.text()

    // Clash 特殊处理
    if (targetFormat === 'clash') {
      content = clashFix(content)
    }

    logger.info('Subconverter success:', {
      targetFormat,
      contentLength: content.length,
    })

    return new Response(content, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename*=utf-8''${encodeURIComponent(
          config.subName
        )}`,
        'Profile-Update-Interval': config.subUpdateTime.toString(),
      },
    })
  } catch (error) {
    logger.error('Subconverter failed:', error)
    throw error
  }
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

    // 获取路径中的 token
    const pathToken = resolvedParams.slug?.[0]
    if (!pathToken) {
      logger.warn('No path token found, redirecting to home')
      return NextResponse.redirect(new URL('/', request.url))
    }

    // 验证 token（包括 fakeToken 验证）
    const tokenValid = await validateToken(pathToken, url)

    // 检查是否为 fakeToken 访问
    const isFakeTokenAccess = await checkFakeToken(pathToken)

    if (!tokenValid && !isFakeTokenAccess) {
      logger.warn('Invalid token access:', { token: pathToken, ip })

      // 发送 Telegram 通知
      try {
        await telegramService.sendMessage(
          '❌ 非法访问',
          ip,
          `Token: ${pathToken}\nUser-Agent: ${userAgent}\nURL: ${url.toString()}`
        )
      } catch (error) {
        logger.error('Failed to send Telegram notification:', error)
      }

      return new Response('Unauthorized', { status: 401 })
    }

    // 如果是 fakeToken 访问，强制返回 base64 格式
    const forcedBase64 = isFakeTokenAccess

    // 检查是否为浏览器访问（重定向到编辑页面）
    const isBrowser = userAgent.toLowerCase().includes('mozilla')
    if (isBrowser && !url.searchParams.has('sub')) {
      logger.info('Browser detected, redirecting to edit page')
      return NextResponse.redirect(
        new URL(`/edit?token=${pathToken}`, request.url)
      )
    }

    // 获取存储的订阅内容
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

    // **核心逻辑：数据聚合和分类**
    logger.info('Starting data aggregation and classification')

    // 1. 将存储内容转换为数组
    const 重新汇总所有链接 = await ADD(storedContent)

    // 2. 分离自建节点和订阅链接
    let 自建节点 = ''
    let 订阅链接 = ''

    for (const link of 重新汇总所有链接) {
      if (link.toLowerCase().startsWith('http')) {
        订阅链接 += link + '\n' // HTTP链接 = 订阅链接
      } else {
        自建节点 += link + '\n' // 非HTTP = 节点配置
      }
    }

    logger.info('Data classification completed:', {
      totalLinks: 重新汇总所有链接.length,
      selfBuiltNodes: 自建节点.split('\n').filter((n) => n.trim()).length,
      subscriptionLinks: 订阅链接.split('\n').filter((n) => n.trim()).length,
    })

    // 3. 获取外部订阅内容
    let req_data = 自建节点 // 从自建节点开始
    let 订阅转换URL = ''

    const 订阅链接数组 = await ADD(订阅链接)
    const validSubscriptionUrls = 订阅链接数组.filter(
      (url) => url.trim() !== ''
    )

    if (validSubscriptionUrls.length > 0) {
      logger.info('Fetching external subscriptions:', {
        count: validSubscriptionUrls.length,
      })

      const [订阅内容, 转换URLs] = await getSUB(
        validSubscriptionUrls,
        request,
        userAgent
      )

      // 聚合所有内容
      req_data += 订阅内容.join('\n')

      // 更新转换 URL
      if (转换URLs) {
        订阅转换URL += 转换URLs
      }

      logger.info('External subscriptions processed:', {
        fetchedNodes: 订阅内容.length,
        conversionUrls: 转换URLs,
      })
    }

    // 4. 格式检测和转换
    let 订阅格式 = 'base64'

    // 根据 User-Agent 和 URL 参数检测格式（完全模拟原始 CF Worker 逻辑）
    if (
      userAgent.includes('null') ||
      userAgent.includes('subconverter') ||
      userAgent.includes('nekobox') ||
      userAgent.includes('cf-workers-sub')
    ) {
      订阅格式 = 'base64'
    } else if (
      userAgent.includes('clash') ||
      (url.searchParams.has('clash') && !userAgent.includes('subconverter'))
    ) {
      订阅格式 = 'clash'
    } else if (
      userAgent.includes('sing-box') ||
      userAgent.includes('singbox') ||
      ((url.searchParams.has('sb') || url.searchParams.has('singbox')) &&
        !userAgent.includes('subconverter'))
    ) {
      订阅格式 = 'singbox'
    } else if (
      userAgent.includes('surge') ||
      (url.searchParams.has('surge') && !userAgent.includes('subconverter'))
    ) {
      订阅格式 = 'surge'
    } else if (
      userAgent.includes('quantumult%20x') ||
      (url.searchParams.has('quanx') && !userAgent.includes('subconverter'))
    ) {
      订阅格式 = 'quanx'
    } else if (
      userAgent.includes('loon') ||
      (url.searchParams.has('loon') && !userAgent.includes('subconverter'))
    ) {
      订阅格式 = 'loon'
    }

    // URL 参数优先级更高
    if (url.searchParams.has('b64') || url.searchParams.has('base64')) {
      订阅格式 = 'base64'
    }

    logger.info('Format detection:', {
      userAgent,
      订阅格式,
      hasConversionUrls: !!订阅转换URL,
    })

    // 5. 内容去重和清理（模拟原始 CF Worker 逻辑）
    const utf8Encoder = new TextEncoder()
    const encodedData = utf8Encoder.encode(req_data)
    const utf8Decoder = new TextDecoder()
    const text = utf8Decoder.decode(encodedData)

    // 去重
    const uniqueLines = new Set(text.split('\n').filter((line) => line.trim()))
    const result = [...uniqueLines].join('\n')

    // 6. Base64 编码
    let base64Data: string
    try {
      base64Data = Buffer.from(result, 'utf-8').toString('base64')
    } catch (e) {
      // 备用编码方法（模拟原始 CF Worker）
      const binary = new TextEncoder().encode(result)
      let base64 = ''
      const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

      for (let i = 0; i < binary.length; i += 3) {
        const byte1 = binary[i]
        const byte2 = binary[i + 1] || 0
        const byte3 = binary[i + 2] || 0

        base64 += chars[byte1 >> 2]
        base64 += chars[((byte1 & 3) << 4) | (byte2 >> 4)]
        base64 += chars[((byte2 & 15) << 2) | (byte3 >> 6)]
        base64 += chars[byte3 & 63]
      }

      const padding = 3 - (binary.length % 3 || 3)
      base64Data =
        base64.slice(0, base64.length - padding) + '=='.slice(0, padding)
    }

    // 7. 如果是 base64 格式或 fakeToken 访问，直接返回
    if (订阅格式 === 'base64' || forcedBase64) {
      logger.info('Returning base64 subscription:', {
        originalLength: result.length,
        base64Length: base64Data.length,
        nodeCount: result.split('\n').filter((line) => line.includes('://'))
          .length,
      })

      // 发送成功通知
      try {
        await telegramService.sendMessage(
          '✅ 订阅获取',
          ip,
          `Token: ${pathToken}\nUser-Agent: ${userAgent}\n节点数量: ${
            result.split('\n').filter((line) => line.includes('://')).length
          }`
        )
      } catch (error) {
        logger.error('Failed to send Telegram notification:', error)
      }

      return new Response(base64Data, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Profile-Update-Interval': config.subUpdateTime.toString(),
          'Cache-Control': 'no-cache',
        },
      })
    }

    // 8. 其他格式需要调用外部转换服务
    logger.info('Converting to target format:', 订阅格式)

    // 生成 fakeToken（模拟原始 CF Worker 逻辑）
    const currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)
    const timeTemp = Math.ceil(currentDate.getTime() / 1000)
    const { md5Double } = await import('@/lib/utils/crypto')
    const fakeToken = await md5Double(`${pathToken}${timeTemp}`)

    // 构建订阅转换 URL（模拟原始 CF Worker 逻辑）
    let 内部订阅URL = `${url.origin}/${await md5Double(
      fakeToken
    )}?token=${fakeToken}`
    if (订阅转换URL) {
      内部订阅URL += '|' + 订阅转换URL
    }

    logger.info('Generated internal subscription URL:', {
      fakeToken,
      内部订阅URL,
    })

    try {
      // 调用外部转换服务
      const conversionResult = await callSubConverter(
        订阅格式,
        内部订阅URL,
        url
      )

      logger.info('Conversion successful:', 订阅格式)

      // 发送成功通知
      try {
        await telegramService.sendMessage(
          '✅ 订阅转换',
          ip,
          `Token: ${pathToken}\nUser-Agent: ${userAgent}\n格式: ${订阅格式}\n节点数量: ${
            result.split('\n').filter((line) => line.includes('://')).length
          }`
        )
      } catch (error) {
        logger.error('Failed to send Telegram notification:', error)
      }

      return conversionResult
    } catch (error) {
      logger.error('Conversion failed, falling back to base64:', error)

      // 转换失败，返回 base64 作为回退
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
