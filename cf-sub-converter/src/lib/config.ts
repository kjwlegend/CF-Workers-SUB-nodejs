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

/**
 * Get configuration with environment variable support
 * This function ensures proper environment variable loading in Next.js
 */
function getConfig(): Config {
  // Debug: Log available environment variables (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Environment Variables Debug:')
    console.log('TOKEN:', process.env.TOKEN || 'undefined')
    console.log('GUEST_TOKEN:', process.env.GUEST_TOKEN || 'undefined')
    console.log('TG_TOKEN:', process.env.TG_TOKEN || 'undefined')
    console.log('SUB_API:', process.env.SUB_API || 'undefined')
  }

  const config: Config = {
    // Server Configuration
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',

    // Security - with fallback handling
    token: process.env.TOKEN || 'auto',
    guestToken: process.env.GUEST_TOKEN || process.env.GUEST || '',

    // Telegram Configuration
    tgToken: process.env.TG_TOKEN || '',
    tgChatId: process.env.TG_CHAT_ID || process.env.TG_ID || '',
    tgEnabled: parseInt(process.env.TG_ENABLED || process.env.TG || '0') === 1,

    // Subscription Configuration
    subName: process.env.SUB_NAME || process.env.SUBNAME || 'CF-SUB-CONVERTER',
    subUpdateTime: parseInt(
      process.env.SUB_UPDATE_TIME || process.env.SUBUPTIME || '6'
    ),
    subApi: process.env.SUB_API || process.env.SUBAPI || 'SUBAPI.cmliussss.net',
    subConfig:
      process.env.SUB_CONFIG ||
      process.env.SUBCONFIG ||
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
    url302: process.env.URL_302 || process.env.URL302,
    proxyUrl: process.env.PROXY_URL || process.env.URL,
  }

  // Auto-generate guest token if not provided
  if (!config.guestToken && config.token) {
    // This will be set dynamically using crypto functions
    config.guestToken = 'auto-generated'
  }

  // Debug: Log final config (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🚀 Final Config:')
    console.log('token:', config.token)
    console.log('guestToken:', config.guestToken)
    console.log('subApi:', config.subApi)
    console.log('subName:', config.subName)
  }

  return config
}

// Export the configuration
const config = getConfig()
export default config

/**
 * Runtime configuration getter for dynamic environment variable access
 * Use this when you need to get fresh environment variables at runtime
 */
export function getRuntimeConfig(): Config {
  return getConfig()
}
