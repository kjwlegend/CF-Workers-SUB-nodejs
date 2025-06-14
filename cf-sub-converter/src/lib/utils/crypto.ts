/**
 * Cryptographic utility functions
 */

import { createHash } from 'crypto'

/**
 * Double MD5 hash function
 * @param text Input text to hash
 * @returns MD5 hash of the input text
 */
export async function md5md5(text: string): Promise<string> {
  // First MD5 hash
  const firstHash = createHash('md5').update(text).digest('hex')

  // Second MD5 hash using substring of first hash
  const secondHash = createHash('md5')
    .update(firstHash.slice(7, 27))
    .digest('hex')

  return secondHash.toLowerCase()
}

// 别名函数，保持与原代码一致
export const md5Double = md5md5

/**
 * Generate fake token based on current date and main token
 * @param mainToken Main token
 * @returns Generated fake token
 */
export async function generateFakeToken(mainToken: string): Promise<string> {
  const currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)
  const timeTemp = Math.ceil(currentDate.getTime() / 1000)
  return await md5md5(`${mainToken}${timeTemp}`)
}

/**
 * Base64 encode a string
 * @param str Input string to encode
 * @returns Base64 encoded string
 */
export function base64Encode(str: string): string {
  try {
    return btoa(str)
  } catch (e) {
    // Fallback for non-ASCII characters
    const binary = new TextEncoder().encode(str)
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
}

/**
 * Base64 decode a string
 * @param str Base64 encoded string
 * @returns Decoded string
 */
export function base64Decode(str: string): string {
  const bytes = new Uint8Array(
    atob(str)
      .split('')
      .map((c) => c.charCodeAt(0))
  )
  const decoder = new TextDecoder('utf-8')
  return decoder.decode(bytes)
}

/**
 * Check if a string is valid Base64
 * @param str String to check
 * @returns True if the string is valid Base64
 */
export function isValidBase64(str: string): boolean {
  const cleanStr = str.replace(/\s/g, '')
  const base64Regex = /^[A-Za-z0-9+/=]+$/
  return base64Regex.test(cleanStr)
}
