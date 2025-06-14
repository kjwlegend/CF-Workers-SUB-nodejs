import { NextRequest, NextResponse } from 'next/server'
import { validateToken, getRequestIP } from '@/lib/utils/validator'
import telegramService from '@/lib/telegram'
import logger from '@/lib/logger'
import config from '@/lib/config'
import * as storage from '@/lib/storage'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return new Response('Token is required', { status: 400 })
    }

    // 验证 token
    if (!(await validateToken(token, url))) {
      return new Response('Invalid token', { status: 401 })
    }

    // 获取存储的内容
    const content = storage.getSubscriptionContent(token)

    // 记录访问
    const ip = getRequestIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    logger.info('Edit page accessed', {
      ip,
      userAgent,
      token: token.substring(0, 3) + '***', // 只记录前3位
    })

    // 发送 Telegram 通知
    if (config.tgEnabled) {
      await telegramService.sendMessage(
        '#编辑订阅',
        ip,
        `UA: ${userAgent}\n域名: ${url.hostname}\n入口: ${
          url.pathname + url.search
        }`
      )
    }

    // 返回纯文本内容
    return new Response(content || config.defaultMainData, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    logger.error('Edit GET error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return new Response('Token is required', { status: 400 })
    }

    // 验证 token
    if (!(await validateToken(token, url))) {
      return new Response('Invalid token', { status: 401 })
    }

    // 获取请求体内容
    const content = await request.text()

    // 保存到存储
    storage.saveSubscriptionContent(token, content)

    // 记录保存操作
    const ip = getRequestIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    logger.info('Subscription content saved', {
      ip,
      userAgent,
      token: token.substring(0, 3) + '***',
      contentLength: content.length,
    })

    // 发送 Telegram 通知
    if (config.tgEnabled) {
      await telegramService.sendMessage(
        '#保存订阅',
        ip,
        `UA: ${userAgent}\n域名: ${url.hostname}\n内容长度: ${content.length}`
      )
    }

    return new Response('保存成功', {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch (error) {
    logger.error('Edit POST error:', error)
    return new Response('保存失败', { status: 500 })
  }
}
