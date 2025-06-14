export type SubscriptionFormat =
  | 'base64'
  | 'clash'
  | 'singbox'
  | 'surge'
  | 'quanx'
  | 'loon'

export function detectSubscriptionFormat(
  userAgent: string,
  searchParams: URLSearchParams
): SubscriptionFormat {
  const ua = userAgent.toLowerCase()

  // 优先检查 URL 参数
  if (searchParams.has('b64') || searchParams.has('base64')) {
    return 'base64'
  }
  if (searchParams.has('clash')) {
    return 'clash'
  }
  if (searchParams.has('sb') || searchParams.has('singbox')) {
    return 'singbox'
  }
  if (searchParams.has('surge')) {
    return 'surge'
  }
  if (searchParams.has('quanx')) {
    return 'quanx'
  }
  if (searchParams.has('loon')) {
    return 'loon'
  }

  // 基于 User-Agent 检测
  if (ua.includes('clash') && !ua.includes('subconverter')) {
    return 'clash'
  }

  if (
    (ua.includes('sing-box') || ua.includes('singbox')) &&
    !ua.includes('subconverter')
  ) {
    return 'singbox'
  }

  if (ua.includes('surge') && !ua.includes('subconverter')) {
    return 'surge'
  }

  if (ua.includes('quantumult%20x') && !ua.includes('subconverter')) {
    return 'quanx'
  }

  if (ua.includes('loon') && !ua.includes('subconverter')) {
    return 'loon'
  }

  // 默认返回 base64
  return 'base64'
}

export function getUAForFormat(format: SubscriptionFormat): string {
  switch (format) {
    case 'clash':
      return 'clash'
    case 'singbox':
      return 'singbox'
    case 'surge':
      return 'surge'
    case 'quanx':
      return 'Quantumult%20X'
    case 'loon':
      return 'Loon'
    default:
      return 'v2rayn'
  }
}
