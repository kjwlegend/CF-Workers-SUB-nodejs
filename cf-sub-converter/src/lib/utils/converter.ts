/**
 * Subscription format conversion utilities
 */

import axios from 'axios'
import config from '../config'
import logger from '../logger'
import { base64Decode, isValidBase64 } from './crypto'

export type SubscriptionFormat =
  | 'base64'
  | 'clash'
  | 'singbox'
  | 'surge'
  | 'quanx'
  | 'loon'

interface SubscriptionResponse {
  content: string
  format: SubscriptionFormat
}

/**
 * Convert subscription content to specified format
 * @param content Original subscription content
 * @param format Target format
 * @param url Original subscription URL
 * @returns Converted subscription content
 */
export async function convertSubscription(
  content: string,
  format: SubscriptionFormat,
  url: string
): Promise<SubscriptionResponse> {
  try {
    if (format === 'base64') {
      return {
        content: await encodeToBase64(content),
        format: 'base64',
      }
    }

    const converterUrl = buildConverterUrl(url, format)
    const response = await axios.get(converterUrl)

    if (format === 'clash') {
      return {
        content: fixClashConfig(response.data),
        format: 'clash',
      }
    }

    return {
      content: response.data,
      format,
    }
  } catch (error) {
    logger.error('Subscription conversion failed:', error)
    // Fallback to base64 if conversion fails
    return {
      content: await encodeToBase64(content),
      format: 'base64',
    }
  }
}

/**
 * Build converter URL for subscription conversion
 */
function buildConverterUrl(url: string, format: SubscriptionFormat): string {
  const baseUrl = `${config.subProtocol}://${config.subApi}/sub`
  const params = new URLSearchParams({
    target: format,
    url: url,
    insert: 'false',
    config: config.subConfig,
    emoji: 'true',
    list: 'false',
    tfo: 'false',
    scv: 'true',
    fdn: 'false',
    sort: 'false',
    new_name: 'true',
  })

  // Add format-specific parameters
  if (format === 'surge') {
    params.set('ver', '4')
  } else if (format === 'quanx') {
    params.set('udp', 'true')
  }

  return `${baseUrl}?${params.toString()}`
}

/**
 * Fix Clash configuration for WireGuard
 */
function fixClashConfig(content: string): string {
  if (
    content.includes('wireguard') &&
    !content.includes('remote-dns-resolve')
  ) {
    const lines = content.split(/\r?\n/)
    return lines
      .map((line) => {
        if (line.includes('type: wireguard')) {
          return line.replace(
            /, mtu: 1280, udp: true/g,
            ', mtu: 1280, remote-dns-resolve: true, udp: true'
          )
        }
        return line
      })
      .join('\n')
  }
  return content
}

/**
 * Encode content to Base64
 */
async function encodeToBase64(content: string): Promise<string> {
  try {
    return btoa(content)
  } catch (e) {
    // Handle non-ASCII characters
    const encoder = new TextEncoder()
    const bytes = encoder.encode(content)
    return Buffer.from(bytes).toString('base64')
  }
}

/**
 * Process subscription content
 * @param content Subscription content
 * @returns Processed content
 */
export function processSubscriptionContent(content: string): string {
  if (isValidBase64(content)) {
    return base64Decode(content)
  }
  return content
}

/**
 * Get subscription format from user agent
 * @param userAgent User agent string
 * @param url URL object
 * @returns Detected subscription format
 */
export function getSubscriptionFormat(
  userAgent: string,
  url: URL
): SubscriptionFormat {
  const ua = userAgent.toLowerCase()

  if (
    ua.includes('null') ||
    ua.includes('subconverter') ||
    ua.includes('nekobox') ||
    ua.includes('cf-workers-sub')
  ) {
    return 'base64'
  }

  if (ua.includes('clash') || url.searchParams.has('clash')) {
    return 'clash'
  }

  if (
    ua.includes('sing-box') ||
    ua.includes('singbox') ||
    url.searchParams.has('sb') ||
    url.searchParams.has('singbox')
  ) {
    return 'singbox'
  }

  if (ua.includes('surge') || url.searchParams.has('surge')) {
    return 'surge'
  }

  if (ua.includes('quantumult%20x') || url.searchParams.has('quanx')) {
    return 'quanx'
  }

  if (ua.includes('loon') || url.searchParams.has('loon')) {
    return 'loon'
  }

  return 'base64'
}
