import { NextRequest, NextResponse } from 'next/server'
import config, { getRuntimeConfig } from '@/lib/config'

/**
 * Debug API endpoint to check environment variables and configuration
 * 调试API端点，用于检查环境变量和配置
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest) {
  try {
    // Get both static and runtime config
    const staticConfig = config
    const runtimeConfig = getRuntimeConfig()

    // Get raw environment variables
    const envVars = {
      TOKEN: process.env.TOKEN,
      GUEST_TOKEN: process.env.GUEST_TOKEN,
      TG_TOKEN: process.env.TG_TOKEN,
      SUB_API: process.env.SUB_API,
      SUB_NAME: process.env.SUB_NAME,
      NODE_ENV: process.env.NODE_ENV,
    }

    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      rawEnvVars: envVars,
      staticConfig: {
        token: staticConfig.token,
        guestToken: staticConfig.guestToken,
        subApi: staticConfig.subApi,
        subName: staticConfig.subName,
        tgEnabled: staticConfig.tgEnabled,
      },
      runtimeConfig: {
        token: runtimeConfig.token,
        guestToken: runtimeConfig.guestToken,
        subApi: runtimeConfig.subApi,
        subName: runtimeConfig.subName,
        tgEnabled: runtimeConfig.tgEnabled,
      },
      processEnvKeys: Object.keys(process.env).filter(
        (key) =>
          key.startsWith('TOKEN') ||
          key.startsWith('TG_') ||
          key.startsWith('SUB_') ||
          key.startsWith('GUEST')
      ),
    }

    return NextResponse.json(debugInfo, { status: 200 })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        error: 'Debug endpoint failed',
        message: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
