import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { validateToken, getRequestIP } from '@/lib/utils/validator'
import telegramService from '@/lib/telegram'
import logger from '@/lib/logger'
import config from '@/lib/config'
import * as storage from '@/lib/storage'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const ip = getRequestIP(request)

    // Validate token
    if (!(await validateToken(token, url))) {
      logger.warn('Invalid token access attempt', { ip, userAgent, token })
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Log access
    try {
      logger.info('Edit API access:', {
        ip,
        userAgent,
        path: url.pathname,
        token,
      })
    } catch (error) {
      logger.error('Failed to log access:', error)
    }

    // Send Telegram notification for edit access
    if (config.tgEnabled) {
      await telegramService.sendMessage(
        `#编辑订阅 ${config.subName}`,
        ip,
        `UA: ${userAgent}\n域名: ${url.hostname}\n入口: ${
          url.pathname + url.search
        }`
      )
    }

    // API请求：返回纯文本内容
    const content = getSubscriptionContent(token || '')
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch (error) {
    logger.error('Edit API error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const ip = getRequestIP(request)

    // Validate token
    if (!(await validateToken(token, url))) {
      logger.warn('Invalid token access attempt', { ip, userAgent, token })
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get content from request body
    const content = await request.text()

    // Save content using storage
    storage.saveSubscriptionContent(token || '', content)

    logger.info('Subscription content saved', {
      token,
      contentLength: content.length,
      storageStats: storage.getStorageStats(),
    })

    return new NextResponse('保存成功')
  } catch (error) {
    logger.error('Edit API save error:', error)
    return new NextResponse('保存失败: ' + (error as Error).message, {
      status: 500,
    })
  }
}

/**
 * 获取订阅内容
 */
function getSubscriptionContent(token: string): string {
  try {
    // 首先尝试从内存存储获取
    const storedContent = storage.getSubscriptionContent(token)
    if (storedContent) {
      return storedContent
    }

    // 如果没有存储的内容，返回默认配置内容
    return config.defaultMainData || ''
  } catch (error) {
    logger.error('Failed to get subscription content:', error)
    return config.defaultMainData || ''
  }
}
