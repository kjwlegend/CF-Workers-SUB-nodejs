import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import {
  validateToken,
  getRequestIP,
  getUserAgentType,
} from '@/lib/utils/validator'
import {
  getSubscriptionFormat,
  convertSubscription,
} from '@/lib/utils/converter'
import telegramService from '@/lib/telegram'
import logger from '@/lib/logger'
import config from '@/lib/config'

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
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Log access
    await prisma.accessLog.create({
      data: {
        ip,
        userAgent,
        path: url.pathname,
        token: token || undefined,
      },
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

    // Get subscription format
    const format = getSubscriptionFormat(userAgent, url)

    // Get subscription content from database
    const subscription = await prisma.subscription.findFirst({
      where: { token: token || '' },
      orderBy: { updatedAt: 'desc' },
    })

    if (!subscription) {
      return new NextResponse('No subscription found', { status: 404 })
    }

    // Convert subscription to requested format
    const converted = await convertSubscription(
      subscription.content,
      format,
      request.url
    )

    // Return response with appropriate headers
    return new NextResponse(converted.content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename*=utf-8''${encodeURIComponent(
          config.subName
        )}`,
        'Profile-Update-Interval': config.subUpdateTime.toString(),
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
