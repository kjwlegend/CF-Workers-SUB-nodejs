/**
 * Configuration management for the subscription converter
 */

export interface Config {
  token: string
  guestToken: string
  tgToken: string
  tgChatId: string
  tgEnabled: boolean
  subName: string
  subUpdateTime: number
  subApi: string
  subConfig: string
  subProtocol: string
  warp?: string
  url302?: string
  proxyUrl?: string
  port: number
  nodeEnv: string
  defaultMainData: string
  total: number
  timestamp: number
}

const config: Config = {
  // Server Configuration
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Security
  token: process.env.TOKEN || 'auto',
  guestToken: process.env.GUEST_TOKEN || process.env.GUEST || '',

  // Telegram Configuration
  tgToken: process.env.TG_TOKEN || '',
  tgChatId: process.env.TG_CHAT_ID || '',
  tgEnabled: parseInt(process.env.TG_ENABLED || '0') === 1,

  // Subscription Configuration
  subName: process.env.SUB_NAME || 'CF-SUB-CONVERTER',
  subUpdateTime: parseInt(process.env.SUB_UPDATE_TIME || '6'),
  subApi: process.env.SUB_API || 'SUBAPI.cmliussss.net',
  subConfig:
    process.env.SUB_CONFIG ||
    'https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/config/ACL4SSR_Online_MultiCountry.ini',
  subProtocol: process.env.SUB_PROTOCOL || 'https',

  // Default data
  defaultMainData:
    process.env.LINK ||
    `
https://raw.githubusercontent.com/mfuu/v2ray/master/v2ray
  `.trim(),

  // Flow and expiry settings
  total: 99, // TB
  timestamp: 4102329600000, // 2099-12-31

  warp: process.env.WARP,
  url302: process.env.URL_302,
  proxyUrl: process.env.PROXY_URL,
}

// Auto-generate guest token if not provided
if (!config.guestToken && config.token) {
  // This will be set dynamically using crypto functions
  config.guestToken = 'auto-generated'
}

export default config
