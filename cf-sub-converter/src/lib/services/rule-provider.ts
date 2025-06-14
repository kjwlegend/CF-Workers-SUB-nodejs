/**
 * Rule provider service for downloading and caching ACL4SSR rules
 * ACL4SSR规则提供者服务，用于下载和缓存规则
 */

import logger from '@/lib/logger'

interface RuleCache {
  [key: string]: {
    rules: string[]
    lastUpdated: number
    ttl: number
  }
}

// 内存缓存，24小时过期
const ruleCache: RuleCache = {}
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

/**
 * 规则集URL映射
 */
const RULE_URLS = {
  CFnat:
    'https://raw.githubusercontent.com/cmliu/ACL4SSR/refs/heads/main/Clash/CFnat.list',
  LocalAreaNetwork:
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/LocalAreaNetwork.list',
  UnBan:
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/UnBan.list',
  BanAD:
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanAD.list',
  BanProgramAD:
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanProgramAD.list',
  Adobe:
    'https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/adobe.list',
  GoogleFCM:
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/GoogleFCM.list',
  GoogleCN:
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/GoogleCN.list',
  SteamCN:
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/SteamCN.list',
  Microsoft:
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Microsoft.list',
  Apple:
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Apple.list',
  Telegram:
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Telegram.list',
  OpenAi:
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/OpenAi.list',
  AI: 'https://raw.githubusercontent.com/juewuy/ShellClash/master/rules/ai.list',
  Copilot:
    'https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/Copilot.list',
  GithubCopilot:
    'https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/GithubCopilot.list',
  Claude:
    'https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/Claude.list',
  YouTube:
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/YouTube.list',
  Netflix:
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Netflix.list',
  ProxyMedia:
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyMedia.list',
  Emby: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/Emby.list',
  ProxyLite:
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyLite.list',
  CMBlog:
    'https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/CMBlog.list',
  ChinaDomain:
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaDomain.list',
  ChinaCompanyIp:
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaCompanyIp.list',
}

/**
 * 下载单个规则集
 */
async function downloadRuleSet(name: string, url: string): Promise<string[]> {
  try {
    logger.debug('Downloading rule set:', { name, url })

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CF-Workers-SUB/1.0',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const content = await response.text()
    const rules = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && !line.startsWith(';'))
      .filter((line) => line.includes(',')) // 确保是有效的规则格式

    logger.debug('Downloaded rule set:', { name, ruleCount: rules.length })
    return rules
  } catch (error) {
    logger.error('Failed to download rule set:', { name, url, error })
    return []
  }
}

/**
 * 获取规则集（带缓存）
 */
export async function getRuleSet(
  name: string,
  customUrl?: string
): Promise<string[]> {
  const now = Date.now()

  // 检查缓存
  if (
    ruleCache[name] &&
    now - ruleCache[name].lastUpdated < ruleCache[name].ttl
  ) {
    logger.debug('Using cached rule set:', {
      name,
      ruleCount: ruleCache[name].rules.length,
    })
    return ruleCache[name].rules
  }

  // 下载规则集
  const url = customUrl || RULE_URLS[name as keyof typeof RULE_URLS]
  if (!url) {
    logger.warn('Unknown rule set:', name)
    return []
  }

  const rules = await downloadRuleSet(name, url)

  // 缓存结果
  ruleCache[name] = {
    rules,
    lastUpdated: now,
    ttl: CACHE_TTL,
  }

  return rules
}

/**
 * 批量获取多个规则集
 */
export async function getRuleSets(
  names: string[]
): Promise<{ [key: string]: string[] }> {
  const results: { [key: string]: string[] } = {}

  // 并发下载所有规则集
  const promises = names.map(async (name) => {
    const rules = await getRuleSet(name)
    results[name] = rules
  })

  await Promise.all(promises)

  logger.info('Downloaded rule sets:', {
    count: names.length,
    totalRules: Object.values(results).reduce(
      (sum, rules) => sum + rules.length,
      0
    ),
  })

  return results
}

/**
 * 清除缓存
 */
export function clearRuleCache(): void {
  Object.keys(ruleCache).forEach((key) => delete ruleCache[key])
  logger.info('Rule cache cleared')
}

/**
 * 获取缓存状态
 */
export function getCacheStatus(): {
  [key: string]: { ruleCount: number; age: number }
} {
  const now = Date.now()
  const status: { [key: string]: { ruleCount: number; age: number } } = {}

  Object.entries(ruleCache).forEach(([name, cache]) => {
    status[name] = {
      ruleCount: cache.rules.length,
      age: Math.floor((now - cache.lastUpdated) / 1000), // age in seconds
    }
  })

  return status
}
