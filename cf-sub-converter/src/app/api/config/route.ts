import { NextRequest, NextResponse } from 'next/server'
import config from '@/lib/config'

/**
 * Configuration API endpoint for client-side access
 * 为客户端提供安全的配置信息访问
 *
 * 注意：此端点只返回非敏感的配置信息
 */
export async function GET(request: NextRequest) {
  try {
    // 只返回客户端需要的非敏感配置信息
    const clientConfig = {
      subName: config.subName,
      subUpdateTime: config.subUpdateTime,
      subApi: config.subApi,
      subProtocol: config.subProtocol,
      subConfig: config.subConfig,
      tgEnabled: config.tgEnabled,
      // 注意：不返回 token、guestToken 等敏感信息
    }

    return NextResponse.json(clientConfig, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        error: 'Failed to get configuration',
        message: errorMessage,
      },
      { status: 500 }
    )
  }
}
