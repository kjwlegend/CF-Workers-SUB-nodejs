import { NextRequest, NextResponse } from 'next/server'
import * as storage from '@/lib/storage'
import config from '@/lib/config'

export async function GET(request: NextRequest) {
  try {
    const stats = storage.getStorageStats()
    const allTokens = storage.getAllTokens()

    const debugInfo = {
      config: {
        token: config.token,
        guestToken: config.guestToken,
        defaultMainData: config.defaultMainData,
      },
      storage: {
        stats,
        allTokens,
        tokenContents: Object.fromEntries(
          allTokens.map((token) => [
            token,
            {
              content: storage.getSubscriptionContent(token),
              hasContent: storage.hasSubscription(token),
            },
          ])
        ),
      },
    }

    return NextResponse.json(debugInfo, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Debug API error: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
