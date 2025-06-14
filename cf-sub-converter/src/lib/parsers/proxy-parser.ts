/**
 * Proxy protocol parser for various subscription formats
 * 支持多种协议的代理解析器
 */

import logger from '@/lib/logger'
import { ClashProxy } from '@/lib/converters/clash-config'

export interface ParsedProxy {
  protocol: string
  name: string
  server: string
  port: number
  [key: string]: any
}

/**
 * 解析VMESS协议
 */
export function parseVmess(vmessUrl: string): ParsedProxy | null {
  try {
    // vmess://base64encoded
    const base64Part = vmessUrl.replace('vmess://', '')
    const decoded = Buffer.from(base64Part, 'base64').toString('utf-8')
    const config = JSON.parse(decoded)

    return {
      protocol: 'vmess',
      name: config.ps || `${config.add}:${config.port}`,
      server: config.add,
      port: parseInt(config.port),
      uuid: config.id,
      alterId: parseInt(config.aid || '0'),
      cipher: config.scy || 'auto',
      network: config.net || 'tcp',
      type: config.type || 'none',
      host: config.host || '',
      path: config.path || '',
      tls: config.tls === 'tls',
      sni: config.sni || '',
      alpn: config.alpn ? config.alpn.split(',') : undefined,
      'skip-cert-verify': config.verify_cert !== 'true',
    }
  } catch (error) {
    logger.warn('Failed to parse VMESS URL:', { url: vmessUrl, error })
    return null
  }
}

/**
 * 解析VLESS协议
 */
export function parseVless(vlessUrl: string): ParsedProxy | null {
  try {
    // vless://uuid@server:port?params#name
    const url = new URL(vlessUrl)
    const params = new URLSearchParams(url.search)

    return {
      protocol: 'vless',
      name:
        decodeURIComponent(url.hash.slice(1)) || `${url.hostname}:${url.port}`,
      server: url.hostname,
      port: parseInt(url.port),
      uuid: url.username,
      flow: params.get('flow') || '',
      network: params.get('type') || 'tcp',
      tls:
        params.get('security') === 'tls' ||
        params.get('security') === 'reality',
      'skip-cert-verify': params.get('allowInsecure') === '1',
      sni: params.get('sni') || '',
      alpn: params.get('alpn') ? params.get('alpn')!.split(',') : undefined,
      'reality-opts':
        params.get('security') === 'reality'
          ? {
              'public-key': params.get('pbk') || '',
              'short-id': params.get('sid') || '',
            }
          : undefined,
      'ws-opts':
        params.get('type') === 'ws'
          ? {
              path: params.get('path') || '/',
              headers: params.get('host') ? { Host: params.get('host')! } : {},
            }
          : undefined,
      'grpc-opts':
        params.get('type') === 'grpc'
          ? {
              'grpc-service-name': params.get('serviceName') || '',
            }
          : undefined,
    }
  } catch (error) {
    logger.warn('Failed to parse VLESS URL:', { url: vlessUrl, error })
    return null
  }
}

/**
 * 解析Trojan协议
 */
export function parseTrojan(trojanUrl: string): ParsedProxy | null {
  try {
    // trojan://password@server:port?params#name
    const url = new URL(trojanUrl)
    const params = new URLSearchParams(url.search)

    return {
      protocol: 'trojan',
      name:
        decodeURIComponent(url.hash.slice(1)) || `${url.hostname}:${url.port}`,
      server: url.hostname,
      port: parseInt(url.port),
      password: url.username,
      sni: params.get('sni') || url.hostname,
      'skip-cert-verify': params.get('allowInsecure') === '1',
      alpn: params.get('alpn') ? params.get('alpn')!.split(',') : undefined,
      network: params.get('type') || 'tcp',
      'ws-opts':
        params.get('type') === 'ws'
          ? {
              path: params.get('path') || '/',
              headers: params.get('host') ? { Host: params.get('host')! } : {},
            }
          : undefined,
      'grpc-opts':
        params.get('type') === 'grpc'
          ? {
              'grpc-service-name': params.get('serviceName') || '',
            }
          : undefined,
    }
  } catch (error) {
    logger.warn('Failed to parse Trojan URL:', { url: trojanUrl, error })
    return null
  }
}

/**
 * 解析Shadowsocks协议
 */
export function parseShadowsocks(ssUrl: string): ParsedProxy | null {
  try {
    // ss://base64encoded#name 或 ss://method:password@server:port#name
    let decoded: string
    let name = ''

    if (ssUrl.includes('#')) {
      const [urlPart, namePart] = ssUrl.split('#')
      name = decodeURIComponent(namePart)
      decoded = urlPart.replace('ss://', '')
    } else {
      decoded = ssUrl.replace('ss://', '')
    }

    // 尝试base64解码
    let config: any
    if (decoded.includes('@')) {
      // 新格式: method:password@server:port
      const [methodPassword, serverPort] = decoded.split('@')
      const [method, password] = methodPassword.split(':')
      const [server, port] = serverPort.split(':')

      config = {
        method,
        password,
        server,
        port: parseInt(port),
      }
    } else {
      // 旧格式: base64编码
      const decodedConfig = Buffer.from(decoded, 'base64').toString('utf-8')
      const [methodPassword, serverPort] = decodedConfig.split('@')
      const [method, password] = methodPassword.split(':')
      const [server, port] = serverPort.split(':')

      config = {
        method,
        password,
        server,
        port: parseInt(port),
      }
    }

    return {
      protocol: 'ss',
      name: name || `${config.server}:${config.port}`,
      server: config.server,
      port: config.port,
      cipher: config.method,
      password: config.password,
    }
  } catch (error) {
    logger.warn('Failed to parse Shadowsocks URL:', { url: ssUrl, error })
    return null
  }
}

/**
 * 解析Hysteria协议
 */
export function parseHysteria(hysteriaUrl: string): ParsedProxy | null {
  try {
    // hysteria://server:port?params#name
    const url = new URL(hysteriaUrl)
    const params = new URLSearchParams(url.search)

    return {
      protocol: 'hysteria',
      name:
        decodeURIComponent(url.hash.slice(1)) || `${url.hostname}:${url.port}`,
      server: url.hostname,
      port: parseInt(url.port),
      auth: url.username || params.get('auth') || '',
      'auth-str': params.get('auth') || '',
      up: params.get('up') || '',
      down: params.get('down') || '',
      'skip-cert-verify': params.get('insecure') === '1',
      sni: params.get('peer') || params.get('sni') || '',
      alpn: params.get('alpn') ? params.get('alpn')!.split(',') : undefined,
    }
  } catch (error) {
    logger.warn('Failed to parse Hysteria URL:', { url: hysteriaUrl, error })
    return null
  }
}

/**
 * 通用代理解析器
 */
export function parseProxy(proxyUrl: string): ParsedProxy | null {
  const trimmedUrl = proxyUrl.trim()

  if (!trimmedUrl || !trimmedUrl.includes('://')) {
    return null
  }

  const protocol = trimmedUrl.split('://')[0].toLowerCase()

  switch (protocol) {
    case 'vmess':
      return parseVmess(trimmedUrl)
    case 'vless':
      return parseVless(trimmedUrl)
    case 'trojan':
      return parseTrojan(trimmedUrl)
    case 'ss':
      return parseShadowsocks(trimmedUrl)
    case 'hysteria':
      return parseHysteria(trimmedUrl)
    default:
      logger.warn('Unsupported protocol:', protocol)
      return null
  }
}

/**
 * 将解析的代理转换为Clash格式
 */
export function toClashProxy(proxy: ParsedProxy): ClashProxy | null {
  try {
    const base: Partial<ClashProxy> = {
      name: proxy.name,
      server: proxy.server,
      port: proxy.port,
    }

    switch (proxy.protocol) {
      case 'vmess':
        return {
          ...base,
          type: 'vmess',
          uuid: proxy.uuid,
          alterId: proxy.alterId || 0,
          cipher: proxy.cipher || 'auto',
          network: proxy.network || 'tcp',
          tls: proxy.tls || false,
          'skip-cert-verify': proxy['skip-cert-verify'] || false,
          ...(proxy.network === 'ws' && {
            'ws-opts': {
              path: proxy.path || '/',
              headers: proxy.host ? { Host: proxy.host } : {},
            },
          }),
          ...(proxy.sni && { servername: proxy.sni }),
          ...(proxy.alpn && { alpn: proxy.alpn }),
        } as ClashProxy

      case 'vless':
        return {
          ...base,
          type: 'vless',
          uuid: proxy.uuid,
          flow: proxy.flow || '',
          network: proxy.network || 'tcp',
          tls: proxy.tls || false,
          'skip-cert-verify': proxy['skip-cert-verify'] || false,
          ...(proxy['reality-opts'] && {
            'reality-opts': proxy['reality-opts'],
          }),
          ...(proxy['ws-opts'] && { 'ws-opts': proxy['ws-opts'] }),
          ...(proxy['grpc-opts'] && { 'grpc-opts': proxy['grpc-opts'] }),
          ...(proxy.sni && { servername: proxy.sni }),
          ...(proxy.alpn && { alpn: proxy.alpn }),
        } as ClashProxy

      case 'trojan':
        return {
          ...base,
          type: 'trojan',
          password: proxy.password,
          sni: proxy.sni || proxy.server,
          'skip-cert-verify': proxy['skip-cert-verify'] || false,
          network: proxy.network || 'tcp',
          ...(proxy['ws-opts'] && { 'ws-opts': proxy['ws-opts'] }),
          ...(proxy['grpc-opts'] && { 'grpc-opts': proxy['grpc-opts'] }),
          ...(proxy.alpn && { alpn: proxy.alpn }),
        } as ClashProxy

      case 'ss':
        return {
          ...base,
          type: 'ss',
          cipher: proxy.cipher,
          password: proxy.password,
        } as ClashProxy

      case 'hysteria':
        return {
          ...base,
          type: 'hysteria',
          'auth-str': proxy['auth-str'] || proxy.auth || '',
          protocol: proxy.protocol || 'udp',
          up: proxy.up || '',
          down: proxy.down || '',
          'skip-cert-verify': proxy['skip-cert-verify'] || false,
          ...(proxy.sni && { sni: proxy.sni }),
          ...(proxy.alpn && { alpn: proxy.alpn }),
        } as ClashProxy

      default:
        logger.warn(
          'Unsupported protocol for Clash conversion:',
          proxy.protocol
        )
        return null
    }
  } catch (error) {
    logger.error('Failed to convert proxy to Clash format:', { proxy, error })
    return null
  }
}

/**
 * 批量解析代理列表
 */
export function parseProxyList(proxyUrls: string[]): ParsedProxy[] {
  const results: ParsedProxy[] = []

  for (const url of proxyUrls) {
    const parsed = parseProxy(url)
    if (parsed) {
      results.push(parsed)
    }
  }

  logger.info('Parsed proxy list:', {
    total: proxyUrls.length,
    successful: results.length,
    failed: proxyUrls.length - results.length,
  })

  return results
}

/**
 * 批量转换为Clash代理
 */
export function toClashProxyList(proxies: ParsedProxy[]): ClashProxy[] {
  const results: ClashProxy[] = []

  for (const proxy of proxies) {
    const clashProxy = toClashProxy(proxy)
    if (clashProxy) {
      results.push(clashProxy)
    }
  }

  logger.info('Converted to Clash proxies:', {
    total: proxies.length,
    successful: results.length,
    failed: proxies.length - results.length,
  })

  return results
}
