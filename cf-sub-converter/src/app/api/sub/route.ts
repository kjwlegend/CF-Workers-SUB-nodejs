import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { validateToken, getRequestIP } from '@/lib/utils/validator'
import {
  getSubscriptionFormat,
  convertSubscription,
} from '@/lib/utils/converter'
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
    logger.info('Subscription API access:', {
      ip,
      userAgent,
      path: url.pathname,
      token,
    })

    // Send Telegram notification
    if (config.tgEnabled) {
      await telegramService.sendMessage(
        `#获取订阅 ${config.subName}`,
        ip,
        `UA: ${userAgent}\n域名: ${url.hostname}\n入口: ${
          url.pathname + url.search
        }`
      )
    }

    // Get subscription content
    const content = storage.getSubscriptionContent(token || '')

    // Return base64 encoded content
    const base64Content = Buffer.from(
      content || config.defaultMainData
    ).toString('base64')

    return new NextResponse(base64Content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Profile-Update-Interval': `${config.subUpdateTime}`,
      },
    })
  } catch (error) {
    logger.error('Subscription API error:', error)
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

    // Get subscription content from request body
    const content = await request.text()

    // Save subscription to database
    await prisma.subscription.create({
      data: {
        content,
        format: 'base64',
        token: token || '',
      },
    })

    return new NextResponse('Subscription saved successfully')
  } catch (error) {
    logger.error('Subscription API error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
