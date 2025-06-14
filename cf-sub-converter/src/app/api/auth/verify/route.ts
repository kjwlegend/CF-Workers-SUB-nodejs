import { NextRequest, NextResponse } from 'next/server'
import config from '@/lib/config'

/**
 * Token verification API endpoint
 * Token 验证 API 端点
 *
 * 用于安全地验证客户端提供的 token 是否正确
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required', valid: false },
        { status: 400 }
      )
    }

    // 验证 token 是否匹配主 token 或访客 token
    const isValid = token === config.token || token === config.guestToken

    // 记录验证尝试（不记录实际的 token 值）
    console.log('Token verification attempt:', {
      valid: isValid,
      ip:
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(
      {
        valid: isValid,
        message: isValid ? 'Token verified successfully' : 'Invalid token',
      },
      {
        status: isValid ? 200 : 401,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Token verification error:', error)

    return NextResponse.json(
      {
        error: 'Verification failed',
        message: errorMessage,
        valid: false,
      },
      { status: 500 }
    )
  }
}
