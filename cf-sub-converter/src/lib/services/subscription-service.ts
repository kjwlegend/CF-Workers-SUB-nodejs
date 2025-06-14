import { NextRequest } from 'next/server'
import config from '@/lib/config'
import { logger } from '@/lib/logger'
import { isValidBase64 } from '@/lib/utils/validator'
import { prisma } from '@/lib/prisma'

interface SubscriptionResponse {
  status: 'fulfilled' | 'rejected' | 'timeout'
  value?: string
  apiUrl: string
}

export async function getSubscriptionData(
  request: NextRequest,
  userAgent: string
): Promise<string> {
  // 获取存储的订阅内容
  let mainData = ''
  let subscriptionUrls: string[] = []

  try {
    // 从数据库获取订阅内容
    const subscription = await prisma.subscription.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    if (subscription) {
      mainData = subscription.content
    }
  } catch (error) {
    logger.error('Failed to get subscription from database:', error)
  }

  // 如果数据库没有数据，使用环境变量
  if (!mainData) {
    mainData = process.env.LINK || config.defaultMainData || ''
    if (process.env.LINKSUB) {
      subscriptionUrls = parseSubscriptionUrls(process.env.LINKSUB)
    }
  }

  // 解析主数据，分离自建节点和订阅链接
  const allLinks = parseSubscriptionUrls(mainData)
  const selfNodes: string[] = []
  const subUrls: string[] = []

  for (const link of allLinks) {
    if (link.toLowerCase().startsWith('http')) {
      subUrls.push(link)
    } else {
      selfNodes.push(link)
    }
  }

  // 合并订阅链接
  subscriptionUrls = [...subscriptionUrls, ...subUrls]

  // 获取外部订阅内容
  let externalNodes = ''
  if (subscriptionUrls.length > 0) {
    const subscriptionContent = await fetchSubscriptions(
      subscriptionUrls,
      request,
      userAgent
    )
    externalNodes = subscriptionContent.join('\n')
  }

  // 添加 WARP 节点
  if (process.env.WARP) {
    const warpNodes = parseSubscriptionUrls(process.env.WARP)
    externalNodes += '\n' + warpNodes.join('\n')
  }

  // 合并所有节点
  const allNodes = selfNodes.join('\n') + '\n' + externalNodes

  // 去重处理
  const uniqueLines = new Set(
    allNodes
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  )

  return Array.from(uniqueLines).join('\n')
}

async function fetchSubscriptions(
  urls: string[],
  request: NextRequest,
  userAgent: string
): Promise<string[]> {
  if (!urls || urls.length === 0) {
    return []
  }

  // 去重
  const uniqueUrls = [...new Set(urls)].filter((url) => url?.trim?.())

  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, 2000) // 2秒超时

  const results: string[] = []

  try {
    // 并发请求所有订阅链接
    const responses = await Promise.allSettled(
      uniqueUrls.map((url) =>
        fetchSingleSubscription(url, request, userAgent, controller.signal)
      )
    )

    // 处理响应
    const processedResponses: SubscriptionResponse[] = responses.map(
      (response, index) => {
        if (response.status === 'rejected') {
          const reason = response.reason
          if (reason && reason.name === 'AbortError') {
            return {
              status: 'timeout',
              apiUrl: uniqueUrls[index],
            }
          }
          logger.error(
            `Subscription fetch failed: ${uniqueUrls[index]}`,
            reason
          )
          return {
            status: 'rejected',
            apiUrl: uniqueUrls[index],
          }
        }
        return {
          status: 'fulfilled',
          value: response.value,
          apiUrl: uniqueUrls[index],
        }
      }
    )

    // 处理成功的响应
    for (const response of processedResponses) {
      if (response.status === 'fulfilled' && response.value) {
        const content = response.value

        // 检查内容类型并处理
        if (
          content.includes('proxies:') ||
          (content.includes('outbounds"') && content.includes('inbounds"'))
        ) {
          // Clash 或 Singbox 配置，跳过（这些需要通过转换服务处理）
          continue
        } else if (content.includes('://')) {
          // 明文订阅
          results.push(content)
        } else if (isValidBase64(content)) {
          // Base64 订阅
          try {
            const decoded = atob(content.replace(/\s/g, ''))
            const decodedText = new TextDecoder().decode(
              new Uint8Array(decoded.split('').map((c) => c.charCodeAt(0)))
            )
            results.push(decodedText)
          } catch (error) {
            logger.error('Failed to decode base64 subscription:', error)
            // 生成异常订阅标记
            const errorNode = generateErrorNode(response.apiUrl)
            results.push(errorNode)
          }
        } else {
          // 异常订阅，生成错误节点
          const errorNode = generateErrorNode(response.apiUrl)
          results.push(errorNode)
        }
      }
    }
  } catch (error) {
    logger.error('Failed to fetch subscriptions:', error)
  } finally {
    clearTimeout(timeout)
  }

  return results
}

async function fetchSingleSubscription(
  url: string,
  request: NextRequest,
  userAgent: string,
  signal: AbortSignal
): Promise<string> {
  // 构建自定义 User-Agent
  const customUA = `${atob(
    'djJyYXlOLzYuNDU='
  )} cmliu/CF-Workers-SUB v2rayn(${userAgent})`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': customUA,
      Accept: 'text/html,application/xhtml+xml,application/xml;',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    signal,
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return await response.text()
}

function parseSubscriptionUrls(data: string): string[] {
  if (!data) return []

  // 清理文本：替换各种分隔符为换行符
  const cleanText = data
    .replace(/[\t"'|\r\n]+/g, '\n')
    .replace(/\n+/g, '\n')
    .trim()

  if (!cleanText) return []

  return cleanText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function generateErrorNode(apiUrl: string): string {
  const hostname = apiUrl.split('://')[1]?.split('/')[0] || 'unknown'
  return `trojan://CMLiussss@127.0.0.1:8888?security=tls&allowInsecure=1&type=tcp&headerType=none#异常订阅 ${hostname}`
}
