/**
 * Request validation utilities
 */

import { md5md5 } from './crypto'
import config from '../config'

/**
 * Validate request token
 * @param token Token from request
 * @param url Request URL
 * @returns True if token is valid
 */
export async function validateToken(
  token: string | null,
  url: URL
): Promise<boolean> {
  if (!token) return false

  // Get current date at midnight
  const currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)
  const timeTemp = Math.ceil(currentDate.getTime() / 1000)

  // Generate fake token
  const fakeToken = await md5md5(`${config.token}${timeTemp}`)

  // Check if token is valid
  return (
    [config.token, fakeToken, config.guestToken].includes(token) ||
    url.pathname === `/${config.token}` ||
    url.pathname.includes(`/${config.token}?`)
  )
}

/**
 * Validate subscription URL
 * @param url URL to validate
 * @returns True if URL is valid
 */
export function isValidSubscriptionUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)
    return ['http:', 'https:'].includes(parsedUrl.protocol)
  } catch {
    return false
  }
}

/**
 * Validate subscription content
 * @param content Content to validate
 * @returns True if content is valid
 */
export function isValidSubscriptionContent(content: string): boolean {
  if (!content) return false

  // Check for common subscription formats
  const hasProtocol = /^(vmess|vless|trojan|ss|ssr|http|https):\/\//i.test(
    content
  )
  const hasClash = content.includes('proxies:')
  const hasSingbox =
    content.includes('outbounds"') && content.includes('inbounds"')

  return hasProtocol || hasClash || hasSingbox
}

/**
 * Get user agent type
 * @param userAgent User agent string
 * @returns User agent type
 */
export function getUserAgentType(userAgent: string): string {
  const ua = userAgent.toLowerCase()

  if (ua.includes('mozilla')) return 'browser'
  if (ua.includes('clash')) return 'clash'
  if (ua.includes('sing-box') || ua.includes('singbox')) return 'singbox'
  if (ua.includes('surge')) return 'surge'
  if (ua.includes('quantumult')) return 'quanx'
  if (ua.includes('loon')) return 'loon'

  return 'unknown'
}

/**
 * Validate request headers
 * @param headers Request headers
 * @returns True if headers are valid
 */
export function validateHeaders(headers: Headers): boolean {
  const userAgent = headers.get('user-agent')
  return !!userAgent
}

/**
 * Get request IP address
 * @param request Request object
 * @returns IP address
 */
export function getRequestIP(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}
