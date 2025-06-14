/**
 * Telegram notification service
 */

import TelegramBot from 'node-telegram-bot-api'
import config from './config'
import logger from './logger'

class TelegramService {
  private bot: TelegramBot | null = null

  constructor() {
    if (config.tgToken && config.tgChatId) {
      this.bot = new TelegramBot(config.tgToken, { polling: false })
    }
  }

  /**
   * Send a notification message to Telegram
   * @param type Message type
   * @param ip IP address
   * @param additionalData Additional data to include in the message
   */
  async sendMessage(
    type: string,
    ip: string,
    additionalData: string = ''
  ): Promise<void> {
    if (!this.bot || !config.tgEnabled) return

    try {
      // Get IP information
      const ipInfo = await this.getIpInfo(ip)

      // Construct message
      const message = this.constructMessage(type, ip, ipInfo, additionalData)

      // Send message
      await this.bot.sendMessage(config.tgChatId, message, {
        parse_mode: 'HTML',
      })
    } catch (error) {
      logger.error('Failed to send Telegram message:', error)
    }
  }

  /**
   * Get IP information from ip-api.com
   */
  private async getIpInfo(ip: string) {
    try {
      const response = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`)
      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      logger.error('Failed to get IP info:', error)
    }
    return null
  }

  /**
   * Construct message with IP information
   */
  private constructMessage(
    type: string,
    ip: string,
    ipInfo: any,
    additionalData: string
  ): string {
    let message = `${type}\nIP: ${ip}\n`

    if (ipInfo) {
      message += `国家: ${ipInfo.country}\n`
      message += `<tg-spoiler>城市: ${ipInfo.city}\n`
      message += `组织: ${ipInfo.org}\n`
      message += `ASN: ${ipInfo.as}\n`
    }

    message += `${additionalData}</tg-spoiler>`

    return message
  }
}

export default new TelegramService()
