/**
 * Local Clash configuration generator based on ACL4SSR rules
 * 基于ACL4SSR规则的本地Clash配置生成器
 */

import logger from '@/lib/logger'

export interface ClashProxy {
  name: string
  type: string
  server: string
  port: number
  [key: string]: any
}

export interface ClashConfig {
  port: number
  'socks-port': number
  'allow-lan': boolean
  mode: string
  'log-level': string
  'external-controller': string
  proxies: ClashProxy[]
  'proxy-groups': any[]
  'rule-providers': any
  rules: string[]
}

/**
 * ACL4SSR规则提供者配置 - 基于cmliu版本
 */
const ACL4SSR_RULE_PROVIDERS = {
  CFnat: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/refs/heads/main/Clash/CFnat.list',
    path: './ruleset/CFnat.yaml',
    interval: 86400,
  },
  LocalAreaNetwork: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/LocalAreaNetwork.list',
    path: './ruleset/LocalAreaNetwork.yaml',
    interval: 86400,
  },
  UnBan: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/UnBan.list',
    path: './ruleset/UnBan.yaml',
    interval: 86400,
  },
  BanAD: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanAD.list',
    path: './ruleset/BanAD.yaml',
    interval: 86400,
  },
  BanProgramAD: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanProgramAD.list',
    path: './ruleset/BanProgramAD.yaml',
    interval: 86400,
  },
  Adobe: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/adobe.list',
    path: './ruleset/Adobe.yaml',
    interval: 86400,
  },
  GoogleFCM: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/GoogleFCM.list',
    path: './ruleset/GoogleFCM.yaml',
    interval: 86400,
  },
  GoogleCN: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/GoogleCN.list',
    path: './ruleset/GoogleCN.yaml',
    interval: 86400,
  },
  SteamCN: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/SteamCN.list',
    path: './ruleset/SteamCN.yaml',
    interval: 86400,
  },
  Microsoft: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Microsoft.list',
    path: './ruleset/Microsoft.yaml',
    interval: 86400,
  },
  Apple: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Apple.list',
    path: './ruleset/Apple.yaml',
    interval: 86400,
  },
  Telegram: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Telegram.list',
    path: './ruleset/Telegram.yaml',
    interval: 86400,
  },
  OpenAi: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/OpenAi.list',
    path: './ruleset/OpenAi.yaml',
    interval: 86400,
  },
  AI: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/juewuy/ShellClash/master/rules/ai.list',
    path: './ruleset/AI.yaml',
    interval: 86400,
  },
  Copilot: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/Copilot.list',
    path: './ruleset/Copilot.yaml',
    interval: 86400,
  },
  GithubCopilot: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/GithubCopilot.list',
    path: './ruleset/GithubCopilot.yaml',
    interval: 86400,
  },
  Claude: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/Claude.list',
    path: './ruleset/Claude.yaml',
    interval: 86400,
  },
  YouTube: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/YouTube.list',
    path: './ruleset/YouTube.yaml',
    interval: 86400,
  },
  Netflix: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Netflix.list',
    path: './ruleset/Netflix.yaml',
    interval: 86400,
  },
  ProxyMedia: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyMedia.list',
    path: './ruleset/ProxyMedia.yaml',
    interval: 86400,
  },
  Emby: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/Emby.list',
    path: './ruleset/Emby.yaml',
    interval: 86400,
  },
  ProxyLite: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyLite.list',
    path: './ruleset/ProxyLite.yaml',
    interval: 86400,
  },
  CMBlog: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/CMBlog.list',
    path: './ruleset/CMBlog.yaml',
    interval: 86400,
  },
  ChinaDomain: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaDomain.list',
    path: './ruleset/ChinaDomain.yaml',
    interval: 86400,
  },
  ChinaCompanyIp: {
    type: 'http',
    behavior: 'classical',
    url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaCompanyIp.list',
    path: './ruleset/ChinaCompanyIp.yaml',
    interval: 86400,
  },
}

/**
 * 生成代理组 - 基于cmliu的ACL4SSR配置
 */
function generateProxyGroups(proxyNames: string[]) {
  return [
    {
      name: '🚀 节点选择',
      type: 'select',
      proxies: ['♻️ 自动选择', '☑️ 手动切换', 'DIRECT'],
    },
    {
      name: '☑️ 手动切换',
      type: 'select',
      proxies: proxyNames,
    },
    {
      name: '♻️ 自动选择',
      type: 'url-test',
      proxies: proxyNames,
      url: 'http://www.gstatic.com/generate_204',
      interval: 300,
      tolerance: 50,
    },
    {
      name: '📹 油管视频',
      type: 'select',
      proxies: ['🚀 节点选择', '♻️ 自动选择', '☑️ 手动切换', 'DIRECT'],
    },
    {
      name: '🎥 奈飞视频',
      type: 'select',
      proxies: [
        '🚀 节点选择',
        '♻️ 自动选择',
        '☑️ 手动切换',
        'DIRECT',
        ...proxyNames.filter((name) =>
          /NF|奈飞|解锁|Netflix|NETFLIX|Media|MITM/i.test(name)
        ),
      ],
    },
    {
      name: '🌍 国外媒体',
      type: 'select',
      proxies: ['🚀 节点选择', '♻️ 自动选择', '🎯 全球直连', ...proxyNames],
    },
    {
      name: '📲 电报信息',
      type: 'select',
      proxies: ['🚀 节点选择', '🎯 全球直连', ...proxyNames],
    },
    {
      name: '🤖 OpenAi',
      type: 'select',
      proxies: ['🚀 节点选择', '♻️ 自动选择', '☑️ 手动切换', 'DIRECT'],
    },
    {
      name: 'Ⓜ️ 微软服务',
      type: 'select',
      proxies: ['🎯 全球直连', '🚀 节点选择', ...proxyNames],
    },
    {
      name: '🍎 苹果服务',
      type: 'select',
      proxies: ['🚀 节点选择', '🎯 全球直连', ...proxyNames],
    },
    {
      name: '📢 谷歌FCM',
      type: 'select',
      proxies: ['🚀 节点选择', '🎯 全球直连', '♻️ 自动选择', ...proxyNames],
    },
    {
      name: '🎯 全球直连',
      type: 'select',
      proxies: ['DIRECT', '🚀 节点选择', '♻️ 自动选择'],
    },
    {
      name: '🛑 全球拦截',
      type: 'select',
      proxies: ['REJECT', 'DIRECT'],
    },
    {
      name: '🍃 应用净化',
      type: 'select',
      proxies: ['REJECT', 'DIRECT'],
    },
    {
      name: '🐟 漏网之鱼',
      type: 'select',
      proxies: ['🚀 节点选择', '🎯 全球直连', '♻️ 自动选择', ...proxyNames],
    },
  ]
}

/**
 * ACL4SSR规则映射 - 基于官方配置文件
 * 格式：[规则集名称, 策略组, URL]
 */
export const ACL4SSR_RULE_MAPPING: [string, string, string][] = [
  // 本地网络和直连
  [
    'LocalAreaNetwork',
    '🎯 全球直连',
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/LocalAreaNetwork.list',
  ],
  [
    'UnBan',
    '🎯 全球直连',
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/UnBan.list',
  ],

  // 广告拦截
  [
    'BanAD',
    '🛑 全球拦截',
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanAD.list',
  ],
  [
    'BanProgramAD',
    '🍃 应用净化',
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanProgramAD.list',
  ],

  // 服务分流
  [
    'GoogleFCM',
    '📢 谷歌FCM',
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/GoogleFCM.list',
  ],
  [
    'GoogleCN',
    '🎯 全球直连',
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/GoogleCN.list',
  ],
  [
    'SteamCN',
    '🎯 全球直连',
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/SteamCN.list',
  ],
  [
    'Microsoft',
    'Ⓜ️ 微软服务',
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Microsoft.list',
  ],
  [
    'Apple',
    '🍎 苹果服务',
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Apple.list',
  ],
  [
    'Telegram',
    '📲 电报信息',
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Telegram.list',
  ],

  // 流媒体
  [
    'ProxyMedia',
    '🌍 国外媒体',
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyMedia.list',
  ],

  // 代理规则
  [
    'ProxyLite',
    '🚀 节点选择',
    'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyLite.list',
  ],
]

/**
 * 固定规则（不需要下载）
 */
const FIXED_RULES = ['GEOIP,CN,🎯 全球直连', 'MATCH,🐟 漏网之鱼']

/**
 * 生成Clash配置
 */
export function generateClashConfig(proxies: ClashProxy[]): ClashConfig {
  const proxyNames = proxies.map((p) => p.name)

  logger.info('Generating Clash config with ACL4SSR rules:', {
    proxyCount: proxies.length,
    ruleProviders: Object.keys(ACL4SSR_RULE_PROVIDERS).length,
    ruleMappings: ACL4SSR_RULE_MAPPING.length,
  })

  return {
    port: 7890,
    'socks-port': 7891,
    'allow-lan': true,
    mode: 'Rule',
    'log-level': 'info',
    'external-controller': '127.0.0.1:9090',
    proxies,
    'proxy-groups': generateProxyGroups(proxyNames),
    'rule-providers': ACL4SSR_RULE_PROVIDERS,
    rules: [...FIXED_RULES], // 临时使用固定规则，实际规则将在转换时生成
  }
}

/**
 * 修复Clash配置中的WireGuard问题
 */
export function fixClashConfig(configText: string): string {
  if (
    configText.includes('wireguard') &&
    !configText.includes('remote-dns-resolve')
  ) {
    const lines = configText.includes('\r\n')
      ? configText.split('\r\n')
      : configText.split('\n')

    let result = ''
    for (const line of lines) {
      if (line.includes('type: wireguard')) {
        const oldPattern = ', mtu: 1280, udp: true'
        const newPattern = ', mtu: 1280, remote-dns-resolve: true, udp: true'
        result += line.replace(new RegExp(oldPattern, 'g'), newPattern) + '\n'
      } else {
        result += line + '\n'
      }
    }
    return result
  }
  return configText
}
