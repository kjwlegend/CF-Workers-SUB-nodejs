'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SubscriptionLinks from '@/components/SubscriptionLinks'

// 客户端配置接口
interface ClientConfig {
  subName: string
  subUpdateTime: number
  subApi: string
  subProtocol: string
  subConfig: string
  tgEnabled: boolean
}

export default function EditPage() {
  const [token, setToken] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [config, setConfig] = useState<ClientConfig | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [verifying, setVerifying] = useState(true)

  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const tokenParam = searchParams.get('token')

    if (!tokenParam) {
      // 没有token参数，重定向到首页
      router.push('/')
      return
    }

    setToken(tokenParam)
    setBaseUrl(window.location.origin)

    // 验证token并加载数据
    verifyAndLoadData(tokenParam)
  }, [searchParams, router])

  const verifyToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const result = await response.json()
      return result.valid === true
    } catch (error) {
      console.error('Token verification failed:', error)
      return false
    }
  }

  const verifyAndLoadData = async (token: string) => {
    try {
      setVerifying(true)

      // 验证token
      const isValid = await verifyToken(token)
      if (!isValid) {
        // token无效，重定向到首页
        router.push('/')
        return
      }

      setAuthenticated(true)

      // 并行加载配置和内容
      const [configResponse, contentResponse] = await Promise.all([
        fetch('/api/config'),
        fetch(`/api/edit?token=${token}`),
      ])

      // 处理配置
      if (configResponse.ok) {
        const configData = await configResponse.json()
        setConfig(configData)
      } else {
        // 使用默认配置
        setConfig({
          subName: 'CF-SUB-CONVERTER',
          subUpdateTime: 6,
          subApi: 'SUBAPI.cmliussss.net',
          subProtocol: 'https',
          subConfig:
            'https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/config/ACL4SSR_Online_MultiCountry.ini',
          tgEnabled: false,
        })
      }

      // 处理内容
      if (contentResponse.ok) {
        const contentData = await contentResponse.text()
        setContent(contentData)
      } else {
        console.error('Failed to load content:', contentResponse.statusText)
        setContent('')
      }
    } catch (error) {
      console.error('Error loading data:', error)
      router.push('/')
    } finally {
      setVerifying(false)
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!token) return

    setSaving(true)
    setSaveStatus('保存中...')

    try {
      const response = await fetch(`/api/edit?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: content,
      })

      if (response.ok) {
        const now = new Date().toLocaleString()
        setSaveStatus(`已保存 ${now}`)
        document.title = `编辑已保存 ${now}`
      } else {
        setSaveStatus('保存失败')
      }
    } catch (error) {
      console.error('Save error:', error)
      setSaveStatus('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
  }

  const handleLogout = () => {
    // 清除认证信息
    sessionStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_time')
    // 重定向到首页
    router.push('/')
  }

  if (verifying || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {verifying ? '验证中...' : '加载中...'}
          </p>
        </div>
      </div>
    )
  }

  if (!authenticated || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">访问被拒绝</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* 头部 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {config.subName}
            </h1>
            <p className="text-gray-600 mt-1">订阅管理与编辑</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  保存中...
                </>
              ) : (
                '保存配置'
              )}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              退出登录
            </button>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* 左侧：编辑区域 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">订阅配置编辑</h2>
                <div className="text-sm text-gray-500">
                  {saveStatus && (
                    <span
                      className={`${
                        saveStatus.includes('失败')
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {saveStatus}
                    </span>
                  )}
                </div>
              </div>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入订阅链接和节点配置，每行一个..."
              />

              <div className="mt-4 text-sm text-gray-600">
                <p className="mb-2">
                  <strong>使用说明：</strong>
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>每行输入一个订阅链接或节点配置</li>
                  <li>支持 HTTP/HTTPS 订阅链接和各种协议的节点</li>
                  <li>使用 Ctrl+S 快速保存</li>
                  <li>保存后会自动更新所有订阅链接</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 右侧：订阅链接和配置信息 */}
          <div className="space-y-6">
            {/* 订阅链接 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">订阅链接</h2>
              <SubscriptionLinks
                token={token}
                baseUrl={baseUrl}
                compact={false}
                showGuest={true}
              />
            </div>

            {/* 配置信息 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">系统配置</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">订阅名称:</span>
                  <span className="font-medium">{config.subName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">更新间隔:</span>
                  <span className="font-medium">
                    {config.subUpdateTime} 小时
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">转换后端:</span>
                  <span className="font-medium text-xs">
                    {config.subProtocol}://{config.subApi}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">配置文件:</span>
                  <a
                    href={config.subConfig}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs"
                  >
                    查看配置
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Telegram:</span>
                  <span className="font-medium">
                    {config.tgEnabled ? '已启用' : '未启用'}
                  </span>
                </div>
              </div>
            </div>

            {/* 帮助信息 */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                快捷键
              </h3>
              <div className="text-xs text-blue-800 space-y-1">
                <p>
                  <kbd className="bg-blue-200 px-1 rounded">Ctrl+S</kbd>{' '}
                  保存配置
                </p>
                <p>
                  <kbd className="bg-blue-200 px-1 rounded">Ctrl+A</kbd>{' '}
                  全选内容
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 页脚 */}
        <footer className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
          <div className="flex justify-center space-x-6">
            <a
              href="https://t.me/CMliussss"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Telegram 群组
            </a>
            <a
              href="https://github.com/cmliu/CF-Workers-SUB"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub 项目
            </a>
          </div>
          <p className="mt-2 text-gray-500">
            {config.subName} - 高效的订阅转换服务
          </p>
        </footer>
      </div>
    </main>
  )
}
