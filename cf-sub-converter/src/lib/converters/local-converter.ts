/**
 * Local subscription converter service
 * 本地订阅转换服务，替代外部subconverter依赖
 */

import yaml from 'js-yaml'
import logger from '@/lib/logger'
import {
  parseProxyList,
  toClashProxyList,
  ParsedProxy,
} from '@/lib/parsers/proxy-parser'
import {
  generateClashConfig,
  fixClashConfig,
  ClashProxy,
} from '@/lib/converters/clash-config'
import { getRuleSets, getRuleSet } from '@/lib/services/rule-provider'

export type SupportedFormat =
  | 'base64'
  | 'clash'
  | 'singbox'
  | 'surge'
  | 'quanx'
  | 'loon'

/**
 * 本地转换服务类
 */
export class LocalConverter {
  /**
   * 转换订阅内容到指定格式
   */
  static async convert(
    content: string,
    targetFormat: SupportedFormat,
    options: {
      filename?: string
      updateInterval?: number
    } = {}
  ): Promise<string> {
    try {
      logger.info('Starting local conversion:', {
        targetFormat,
        contentLength: content.length,
        options,
      })

      // 1. 解析输入内容
      const proxyUrls = this.parseContent(content)
      logger.info('Parsed proxy URLs:', { count: proxyUrls.length })

      // 2. 解析代理配置
      const parsedProxies = parseProxyList(proxyUrls)
      logger.info('Parsed proxies:', { count: parsedProxies.length })

      if (parsedProxies.length === 0) {
        throw new Error('No valid proxies found in content')
      }

      // 3. 根据目标格式转换
      let result: string

      switch (targetFormat) {
        case 'base64':
          result = this.toBase64(proxyUrls)
          break
        case 'clash':
          result = await this.toClash(parsedProxies, options)
          break
        case 'singbox':
          result = await this.toSingbox(parsedProxies, options)
          break
        case 'surge':
          result = await this.toSurge(parsedProxies, options)
          break
        case 'quanx':
          result = await this.toQuantumultX(parsedProxies, options)
          break
        case 'loon':
          result = await this.toLoon(parsedProxies, options)
          break
        default:
          throw new Error(`Unsupported format: ${targetFormat}`)
      }

      logger.info('Conversion completed:', {
        targetFormat,
        resultLength: result.length,
      })

      return result
    } catch (error) {
      logger.error('Conversion failed:', { targetFormat, error })
      throw error
    }
  }

  /**
   * 解析内容，提取代理URL
   */
  private static parseContent(content: string): string[] {
    const lines = content.split('\n')
    const proxyUrls: string[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && trimmed.includes('://')) {
        proxyUrls.push(trimmed)
      }
    }

    return proxyUrls
  }

  /**
   * 转换为Base64格式
   */
  private static toBase64(proxyUrls: string[]): string {
    const validUrls = proxyUrls.filter((url) => url.trim() !== '')
    const content = validUrls.join('\n')
    return Buffer.from(content, 'utf-8').toString('base64')
  }

  /**
   * 转换为Clash格式
   */
  private static async toClash(
    proxies: ParsedProxy[],
    options: { filename?: string; updateInterval?: number } = {}
  ): Promise<string> {
    // 转换为Clash代理格式
    const clashProxies = toClashProxyList(proxies)

    if (clashProxies.length === 0) {
      throw new Error('No valid Clash proxies generated')
    }

    // 生成基础Clash配置
    const config = generateClashConfig(clashProxies)

    // 下载并内联规则集
    logger.info('Downloading rule sets for inline rules...')

    // 从clash-config.ts导入规则映射
    const { ACL4SSR_RULE_MAPPING } = await import(
      '@/lib/converters/clash-config'
    )

    // 提取规则集名称和URL
    const ruleSetNames = ACL4SSR_RULE_MAPPING.map(
      ([name]: [string, string, string]) => name
    )
    const ruleSetUrls = Object.fromEntries(
      ACL4SSR_RULE_MAPPING.map(([name, , url]: [string, string, string]) => [
        name,
        url,
      ])
    )

    try {
      // 使用自定义URL下载规则集
      const ruleSets: { [key: string]: string[] } = {}

      // 并发下载所有规则集
      const downloadPromises = ACL4SSR_RULE_MAPPING.map(
        async ([name, , url]: [string, string, string]) => {
          const rules = await getRuleSet(name, url)
          ruleSets[name] = rules
        }
      )

      await Promise.all(downloadPromises)

      // 生成内联规则
      const inlineRules: string[] = []

      // 按照ACL4SSR的顺序添加规则
      for (const [ruleSetName, policy] of ACL4SSR_RULE_MAPPING as [
        string,
        string,
        string
      ][]) {
        const rules = ruleSets[ruleSetName] || []

        if (rules.length > 0) {
          // 添加内联规则
          for (const rule of rules) {
            if (rule.trim() && rule.includes(',')) {
              // 规则格式：DOMAIN-SUFFIX,example.com -> DOMAIN-SUFFIX,example.com,策略组
              inlineRules.push(`${rule},${policy}`)
            }
          }
          logger.debug(
            `Inlined ${rules.length} rules for ${ruleSetName} -> ${policy}`
          )
        } else {
          logger.warn(`No rules found for rule set: ${ruleSetName}`)
        }
      }

      // 添加固定规则
      inlineRules.push('GEOIP,CN,🎯 全球直连')
      inlineRules.push('MATCH,🐟 漏网之鱼')

      // 更新配置
      const finalConfig = {
        ...config,
        rules: inlineRules,
      }

      // 移除rule-providers，因为我们使用内联规则
      delete finalConfig['rule-providers']

      logger.info('Generated Clash config with inline rules:', {
        totalRules: inlineRules.length,
        proxies: clashProxies.length,
        ruleSetCount: ruleSetNames.length,
      })

      // 转换为YAML
      const yamlContent = yaml.dump(finalConfig, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        quotingType: '"',
        forceQuotes: false,
      })

      // 应用修复
      const fixedContent = fixClashConfig(yamlContent)

      return fixedContent
    } catch (error) {
      logger.error(
        'Failed to download rule sets, using rule-providers fallback:',
        error
      )

      // 如果下载失败，使用rule-providers作为fallback
      const yamlContent = yaml.dump(config, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        quotingType: '"',
        forceQuotes: false,
      })

      const fixedContent = fixClashConfig(yamlContent)
      return fixedContent
    }
  }

  /**
   * 转换为Sing-box格式
   */
  private static async toSingbox(
    proxies: ParsedProxy[],
    options: { filename?: string; updateInterval?: number } = {}
  ): Promise<string> {
    const outbounds = proxies
      .map((proxy) => this.toSingboxOutbound(proxy))
      .filter(Boolean)

    const config = {
      log: {
        level: 'info',
        timestamp: true,
      },
      dns: {
        servers: [
          {
            tag: 'google',
            address: 'https://8.8.8.8/dns-query',
          },
          {
            tag: 'local',
            address: '223.5.5.5',
            detour: 'direct',
          },
        ],
        rules: [
          {
            geosite: 'cn',
            server: 'local',
          },
        ],
      },
      inbounds: [
        {
          type: 'mixed',
          tag: 'mixed-in',
          listen: '127.0.0.1',
          listen_port: 2080,
        },
      ],
      outbounds: [
        {
          type: 'selector',
          tag: 'proxy',
          outbounds: ['auto', ...outbounds.map((o) => o.tag), 'direct'],
        },
        {
          type: 'urltest',
          tag: 'auto',
          outbounds: outbounds.map((o) => o.tag),
          url: 'http://www.gstatic.com/generate_204',
          interval: '10m',
        },
        ...outbounds,
        {
          type: 'direct',
          tag: 'direct',
        },
        {
          type: 'block',
          tag: 'block',
        },
      ],
      route: {
        rules: [
          {
            geosite: 'cn',
            outbound: 'direct',
          },
          {
            geoip: 'cn',
            outbound: 'direct',
          },
        ],
      },
    }

    return JSON.stringify(config, null, 2)
  }

  /**
   * 转换为Surge格式
   */
  private static async toSurge(
    proxies: ParsedProxy[],
    options: { filename?: string; updateInterval?: number } = {}
  ): Promise<string> {
    const proxyLines = proxies
      .map((proxy) => this.toSurgeProxy(proxy))
      .filter(Boolean)

    const config = [
      '[General]',
      'loglevel = notify',
      'internet-test-url = http://www.gstatic.com/generate_204',
      'proxy-test-url = http://www.gstatic.com/generate_204',
      'test-timeout = 3',
      'dns-server = 223.5.5.5, 8.8.8.8',
      '',
      '[Proxy]',
      ...proxyLines,
      '',
      '[Proxy Group]',
      `Proxy = select, ${proxies.map((p) => p.name).join(', ')}, DIRECT`,
      'Auto = url-test, ' +
        proxies.map((p) => p.name).join(', ') +
        ', url = http://www.gstatic.com/generate_204',
      '',
      '[Rule]',
      'GEOIP,CN,DIRECT',
      'FINAL,Proxy',
    ]

    return config.join('\n')
  }

  /**
   * 转换为QuantumultX格式
   */
  private static async toQuantumultX(
    proxies: ParsedProxy[],
    options: { filename?: string; updateInterval?: number } = {}
  ): Promise<string> {
    const proxyLines = proxies
      .map((proxy) => this.toQuantumultXProxy(proxy))
      .filter(Boolean)

    const config = [
      '[general]',
      'dns_exclusion_list = *.cmpassport.com, *.jegotrip.com.cn, *.icitymobile.mobi, id6.me',
      '',
      '[dns]',
      'server=223.5.5.5',
      'server=8.8.8.8',
      '',
      '[policy]',
      `static=Proxy, ${proxies
        .map((p) => p.name)
        .join(
          ', '
        )}, direct, img-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Proxy.png`,
      '',
      '[server_remote]',
      '',
      '[filter_remote]',
      'https://raw.githubusercontent.com/DivineEngine/Profiles/master/Quantumult/Filter/China.list, tag=China, force-policy=direct, update-interval=86400, opt-parser=false, enabled=true',
      '',
      '[rewrite_remote]',
      '',
      '[server_local]',
      ...proxyLines,
      '',
      '[filter_local]',
      'geoip, cn, direct',
      'final, Proxy',
      '',
      '[rewrite_local]',
      '',
      '[mitm]',
    ]

    return config.join('\n')
  }

  /**
   * 转换为Loon格式
   */
  private static async toLoon(
    proxies: ParsedProxy[],
    options: { filename?: string; updateInterval?: number } = {}
  ): Promise<string> {
    const proxyLines = proxies
      .map((proxy) => this.toLoonProxy(proxy))
      .filter(Boolean)

    const config = [
      '[General]',
      'dns-server = 223.5.5.5, 8.8.8.8',
      'allow-wifi-access = false',
      'wifi-access-http-port = 7222',
      'wifi-access-socket5-port = 7221',
      'proxy-test-url = http://www.gstatic.com/generate_204',
      'test-timeout = 3',
      '',
      '[Proxy]',
      ...proxyLines,
      '',
      '[Proxy Group]',
      `Proxy = select, ${proxies.map((p) => p.name).join(', ')}, DIRECT`,
      'Auto = url-test, ' +
        proxies.map((p) => p.name).join(', ') +
        ', url = http://www.gstatic.com/generate_204, interval = 600',
      '',
      '[Rule]',
      'GEOIP, CN, DIRECT',
      'FINAL, Proxy',
      '',
      '[Remote Proxy]',
      '',
      '[Remote Filter]',
      '',
      '[Remote Rule]',
      '',
      '[URL Rewrite]',
      '',
      '[MITM]',
    ]

    return config.join('\n')
  }

  /**
   * 转换为Sing-box outbound格式
   */
  private static toSingboxOutbound(proxy: ParsedProxy): any {
    const base = {
      tag: proxy.name,
      type: proxy.protocol === 'ss' ? 'shadowsocks' : proxy.protocol,
    }

    switch (proxy.protocol) {
      case 'vmess':
        return {
          ...base,
          server: proxy.server,
          server_port: proxy.port,
          uuid: proxy.uuid,
          alter_id: proxy.alterId || 0,
          security: proxy.cipher || 'auto',
          transport:
            proxy.network === 'ws'
              ? {
                  type: 'ws',
                  path: proxy.path || '/',
                  headers: proxy.host ? { Host: proxy.host } : {},
                }
              : undefined,
          tls: proxy.tls
            ? {
                enabled: true,
                server_name: proxy.sni || proxy.server,
                insecure: proxy['skip-cert-verify'] || false,
              }
            : undefined,
        }

      case 'vless':
        return {
          ...base,
          server: proxy.server,
          server_port: proxy.port,
          uuid: proxy.uuid,
          flow: proxy.flow || '',
          transport:
            proxy.network === 'ws'
              ? {
                  type: 'ws',
                  path: proxy['ws-opts']?.path || '/',
                  headers: proxy['ws-opts']?.headers || {},
                }
              : undefined,
          tls: proxy.tls
            ? {
                enabled: true,
                server_name: proxy.sni || proxy.server,
                insecure: proxy['skip-cert-verify'] || false,
              }
            : undefined,
        }

      case 'trojan':
        return {
          ...base,
          server: proxy.server,
          server_port: proxy.port,
          password: proxy.password,
          tls: {
            enabled: true,
            server_name: proxy.sni || proxy.server,
            insecure: proxy['skip-cert-verify'] || false,
          },
        }

      case 'ss':
        return {
          ...base,
          server: proxy.server,
          server_port: proxy.port,
          method: proxy.cipher,
          password: proxy.password,
        }

      default:
        return null
    }
  }

  /**
   * 转换为Surge代理格式
   */
  private static toSurgeProxy(proxy: ParsedProxy): string | null {
    switch (proxy.protocol) {
      case 'vmess':
        return `${proxy.name} = vmess, ${proxy.server}, ${
          proxy.port
        }, username=${proxy.uuid}, tls=${proxy.tls}, ws=${
          proxy.network === 'ws'
        }`

      case 'trojan':
        return `${proxy.name} = trojan, ${proxy.server}, ${proxy.port}, password=${proxy.password}, tls=true`

      case 'ss':
        return `${proxy.name} = ss, ${proxy.server}, ${proxy.port}, encrypt-method=${proxy.cipher}, password=${proxy.password}`

      default:
        return null
    }
  }

  /**
   * 转换为QuantumultX代理格式
   */
  private static toQuantumultXProxy(proxy: ParsedProxy): string | null {
    switch (proxy.protocol) {
      case 'vmess':
        return `vmess=${proxy.server}:${
          proxy.port
        }, method=aes-128-gcm, password=${proxy.uuid}, obfs=${
          proxy.network
        }, obfs-host=${proxy.host || proxy.server}, tag=${proxy.name}`

      case 'trojan':
        return `trojan=${proxy.server}:${proxy.port}, password=${proxy.password}, over-tls=true, tls-verification=true, tag=${proxy.name}`

      case 'ss':
        return `shadowsocks=${proxy.server}:${proxy.port}, method=${proxy.cipher}, password=${proxy.password}, tag=${proxy.name}`

      default:
        return null
    }
  }

  /**
   * 转换为Loon代理格式
   */
  private static toLoonProxy(proxy: ParsedProxy): string | null {
    switch (proxy.protocol) {
      case 'vmess':
        return `${proxy.name} = vmess, ${proxy.server}, ${proxy.port}, ${
          proxy.uuid
        }, transport=${proxy.network}, host=${
          proxy.host || proxy.server
        }, path=${proxy.path || '/'}, over-tls=${proxy.tls}`

      case 'trojan':
        return `${proxy.name} = trojan, ${proxy.server}, ${proxy.port}, ${proxy.password}`

      case 'ss':
        return `${proxy.name} = shadowsocks, ${proxy.server}, ${proxy.port}, ${proxy.cipher}, ${proxy.password}`

      default:
        return null
    }
  }
}
