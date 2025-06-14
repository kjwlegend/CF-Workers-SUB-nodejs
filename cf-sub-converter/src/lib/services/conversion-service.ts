import config from '@/lib/config'
import { logger } from '@/lib/logger'
import { SubscriptionFormat } from '@/lib/utils/format-detector'

export async function convertSubscription(
  subscriptionData: string,
  format: SubscriptionFormat,
  origin: string,
  fakeToken: string
): Promise<string> {
  // 处理 UTF-8 编码
  const utf8Encoder = new TextEncoder()
  const encodedData = utf8Encoder.encode(subscriptionData)
  const utf8Decoder = new TextDecoder()
  const text = utf8Decoder.decode(encodedData)

  // 去重处理
  const uniqueLines = new Set(text.split('\n').filter((line) => line.trim()))
  const result = Array.from(uniqueLines).join('\n')

  // Base64 编码
  let base64Data: string
  try {
    base64Data = btoa(result)
  } catch (e) {
    // 如果标准 btoa 失败，使用自定义编码
    base64Data = encodeBase64(result)
  }

  // 如果是 base64 格式，直接返回
  if (format === 'base64') {
    return base64Data
  }

  // 构建订阅转换 URL
  const subscriptionUrl = `${origin}/${fakeToken}?token=${fakeToken}`
  const subConverterUrl = buildConverterUrl(format, subscriptionUrl)

  try {
    // 调用外部转换服务
    const response = await fetch(subConverterUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'CF-Workers-SUB/1.0',
      },
    })

    if (!response.ok) {
      throw new Error(`Converter API failed: ${response.status}`)
    }

    let convertedContent = await response.text()

    // 如果是 Clash 格式，进行特殊处理
    if (format === 'clash') {
      convertedContent = fixClashConfig(convertedContent)
    }

    return convertedContent
  } catch (error) {
    logger.error('Subscription conversion failed:', error)
    // 转换失败时回退到 Base64
    return base64Data
  }
}

function buildConverterUrl(
  format: SubscriptionFormat,
  subscriptionUrl: string
): string {
  const baseUrl = `${config.subProtocol}://${config.subApi}/sub`
  const encodedUrl = encodeURIComponent(subscriptionUrl)
  const encodedConfig = encodeURIComponent(config.subConfig)

  const commonParams = [
    `url=${encodedUrl}`,
    'insert=false',
    `config=${encodedConfig}`,
    'emoji=true',
    'list=false',
    'tfo=false',
    'scv=true',
    'fdn=false',
    'sort=false',
  ]

  switch (format) {
    case 'clash':
      return `${baseUrl}?target=clash&${commonParams.join('&')}&new_name=true`

    case 'singbox':
      return `${baseUrl}?target=singbox&${commonParams.join('&')}&new_name=true`

    case 'surge':
      return `${baseUrl}?target=surge&ver=4&${commonParams.join(
        '&'
      )}&new_name=true`

    case 'quanx':
      return `${baseUrl}?target=quanx&${commonParams.join('&')}&udp=true`

    case 'loon':
      return `${baseUrl}?target=loon&${commonParams.join('&')}`

    default:
      return `${baseUrl}?target=clash&${commonParams.join('&')}&new_name=true`
  }
}

function fixClashConfig(content: string): string {
  if (
    !content.includes('wireguard') ||
    content.includes('remote-dns-resolve')
  ) {
    return content
  }

  const lines = content.includes('\r\n')
    ? content.split('\r\n')
    : content.split('\n')
  let result = ''

  for (const line of lines) {
    if (line.includes('type: wireguard')) {
      const oldPattern = ', mtu: 1280, udp: true'
      const newPattern = ', mtu: 1280, remote-dns-resolve: true, udp: true'
      result += line.replace(new RegExp(oldPattern, 'g'), newPattern) + '\n'
    } else {
      result += line + '\n'
    }
  }

  return result
}

function encodeBase64(data: string): string {
  const binary = new TextEncoder().encode(data)
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
  return base64.slice(0, base64.length - padding) + '=='.slice(0, padding)
}
