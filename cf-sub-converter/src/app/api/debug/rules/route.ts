/**
 * Debug API for rule provider status and testing
 * 规则提供者状态调试API
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getRuleSet,
  getRuleSets,
  getCacheStatus,
  clearRuleCache,
} from '@/lib/services/rule-provider'
import logger from '@/lib/logger'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'status'
  const ruleSet = searchParams.get('ruleset')

  try {
    switch (action) {
      case 'status':
        // 获取缓存状态
        const cacheStatus = getCacheStatus()
        return NextResponse.json({
          success: true,
          data: {
            cacheStatus,
            totalCachedRuleSets: Object.keys(cacheStatus).length,
            totalRules: Object.values(cacheStatus).reduce(
              (sum, status) => sum + status.ruleCount,
              0
            ),
          },
        })

      case 'download':
        if (!ruleSet) {
          return NextResponse.json(
            {
              success: false,
              error: 'Missing ruleset parameter',
            },
            { status: 400 }
          )
        }

        logger.info('Debug: Downloading rule set', { ruleSet })
        const rules = await getRuleSet(ruleSet)

        return NextResponse.json({
          success: true,
          data: {
            ruleSet,
            ruleCount: rules.length,
            sampleRules: rules.slice(0, 10),
            downloadTime: new Date().toISOString(),
          },
        })

      case 'download-all':
        // 下载所有规则集
        const allRuleSetNames = [
          'CFnat',
          'LocalAreaNetwork',
          'UnBan',
          'BanAD',
          'BanProgramAD',
          'Adobe',
          'GoogleFCM',
          'GoogleCN',
          'SteamCN',
          'Microsoft',
          'Apple',
          'Telegram',
          'OpenAi',
          'AI',
          'Copilot',
          'GithubCopilot',
          'Claude',
          'YouTube',
          'Netflix',
          'ProxyMedia',
          'Emby',
          'ProxyLite',
          'CMBlog',
          'ChinaDomain',
          'ChinaCompanyIp',
        ]

        logger.info('Debug: Downloading all rule sets', {
          count: allRuleSetNames.length,
        })
        const startTime = Date.now()
        const allRuleSets = await getRuleSets(allRuleSetNames)
        const downloadTime = Date.now() - startTime

        const summary = Object.entries(allRuleSets).map(([name, rules]) => ({
          name,
          ruleCount: rules.length,
          sampleRule: rules[0] || null,
        }))

        return NextResponse.json({
          success: true,
          data: {
            downloadTime: `${downloadTime}ms`,
            totalRuleSets: allRuleSetNames.length,
            totalRules: Object.values(allRuleSets).reduce(
              (sum, rules) => sum + rules.length,
              0
            ),
            summary,
          },
        })

      case 'clear':
        // 清除缓存
        clearRuleCache()
        logger.info('Debug: Rule cache cleared')

        return NextResponse.json({
          success: true,
          message: 'Rule cache cleared successfully',
        })

      case 'test-clash':
        // 测试Clash配置生成
        const { LocalConverter } = await import(
          '@/lib/converters/local-converter'
        )

        const testProxyData = `vmess://eyJ2IjoiMiIsInBzIjoi6aaZ6KeB6IqC54K5IiwiYWRkIjoiMTI3LjAuMC4xIiwicG9ydCI6IjEyMzQiLCJpZCI6IjI0NmFhNzk1LTA2MzctNGY0Yy04ZjY0LTJjOGZiMjRjMWJhZCIsImFpZCI6IjAiLCJzY3kiOiJhdXRvIiwibmV0Ijoid3MiLCJ0eXBlIjoibm9uZSIsImhvc3QiOiJURy5DTUxpdXNzc3MubG9zZXlvdXJpcC5jb20iLCJwYXRoIjoiLz9lZD0yNTYwIiwidGxzIjoidGxzIiwic25pIjoiVEcuQ01MaXVzc3NzLmxvc2V5b3VyaXAuY29tIiwiYWxwbiI6IiJ9`

        logger.info('Debug: Testing Clash configuration generation')
        const clashStartTime = Date.now()
        const clashConfig = await LocalConverter.convert(testProxyData, 'clash')
        const clashGenerationTime = Date.now() - clashStartTime

        // 分析配置
        const hasRuleProviders = clashConfig.includes('rule-providers:')
        const hasInlineRules =
          clashConfig.includes('DOMAIN-SUFFIX,') ||
          clashConfig.includes('DOMAIN,')
        const hasProxyGroups = clashConfig.includes('🚀 节点选择')

        const ruleLines = clashConfig
          .split('\n')
          .filter(
            (line) =>
              line.trim().startsWith('- ') &&
              (line.includes('DOMAIN') ||
                line.includes('IP-CIDR') ||
                line.includes('GEOIP'))
          )

        return NextResponse.json({
          success: true,
          data: {
            generationTime: `${clashGenerationTime}ms`,
            configSize: clashConfig.length,
            analysis: {
              hasRuleProviders,
              hasInlineRules,
              hasProxyGroups,
              totalRules: ruleLines.length,
            },
            preview: clashConfig.split('\n').slice(0, 30).join('\n'),
          },
        })

      default:
        return NextResponse.json(
          {
            success: false,
            error:
              'Invalid action. Available actions: status, download, download-all, clear, test-clash',
          },
          { status: 400 }
        )
    }
  } catch (error) {
    logger.error('Debug API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ruleSets } = body

    if (action === 'download-custom' && Array.isArray(ruleSets)) {
      logger.info('Debug: Downloading custom rule sets', { ruleSets })
      const customRuleSets = await getRuleSets(ruleSets)

      return NextResponse.json({
        success: true,
        data: {
          requestedRuleSets: ruleSets,
          downloadedRuleSets: Object.keys(customRuleSets),
          totalRules: Object.values(customRuleSets).reduce(
            (sum, rules) => sum + rules.length,
            0
          ),
          details: Object.entries(customRuleSets).map(([name, rules]) => ({
            name,
            ruleCount: rules.length,
            sampleRules: rules.slice(0, 5),
          })),
        },
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid POST action or missing ruleSets array',
      },
      { status: 400 }
    )
  } catch (error) {
    logger.error('Debug API POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
