'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// 客户端配置接口
interface ClientConfig {
  subName: string
  subUpdateTime: number
  subApi: string
  subProtocol: string
  subConfig: string
  tgEnabled: boolean
}

export default function Home() {
  const [config, setConfig] = useState<ClientConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // 检查是否已经通过 URL 参数验证
    const url = new URL(window.location.href)
    const tokenParam = url.searchParams.get('token')

    if (tokenParam) {
      // 直接跳转到编辑页
      router.push(`/edit?token=${tokenParam}`)
      return
    }

    // 检查 sessionStorage 中是否有有效的认证
    const authToken = sessionStorage.getItem('auth_token')
    const authTime = sessionStorage.getItem('auth_time')

    if (authToken && authTime) {
      const now = Date.now()
      const authTimestamp = parseInt(authTime)
      // 认证有效期 1 小时
      if (now - authTimestamp < 60 * 60 * 1000) {
        // 直接跳转到编辑页
        router.push(`/edit?token=${authToken}`)
        return
      } else {
        // 清除过期的认证信息
        sessionStorage.removeItem('auth_token')
        sessionStorage.removeItem('auth_time')
      }
    }

    // 获取配置信息
    fetchConfig()
  }, [router])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/config')
      if (response.ok) {
        const configData = await response.json()
        setConfig(configData)
      } else {
        console.error('Failed to fetch config:', response.statusText)
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
    } catch (error) {
      console.error('Error fetching config:', error)
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
    } finally {
      setLoading(false)
    }
  }

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setVerifying(true)

    if (!password.trim()) {
      setError('请输入访问密码')
      setVerifying(false)
      return
    }

    try {
      const isValid = await verifyToken(password)

      if (isValid) {
        // 保存认证状态到 sessionStorage
        sessionStorage.setItem('auth_token', password)
        sessionStorage.setItem('auth_time', Date.now().toString())

        // 跳转到编辑页，将密码作为token传递
        router.push(`/edit?token=${password}`)
      } else {
        setError('密码错误，请重试')
        setPassword('')
      }
    } catch (error) {
      console.error('Login failed:', error)
      setError('验证失败，请重试')
    } finally {
      setVerifying(false)
    }
  }

  if (loading || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="max-w-md w-full space-y-8">
          {/* 头部信息 */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {config.subName}
            </h1>
            <p className="text-lg text-gray-600 mb-8">订阅转换管理系统</p>
          </div>

          {/* 登录表单 */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">访问验证</h2>
              <p className="mt-2 text-sm text-gray-600">
                请输入访问密码以进入管理页面
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="password" className="sr-only">
                  访问密码
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={verifying}
                  className="relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="请输入访问密码"
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={verifying}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-lg font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                >
                  {verifying ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      验证中...
                    </>
                  ) : (
                    '进入管理页面'
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                提示：访问密码为系统配置的 TOKEN 值
              </p>
            </div>
          </div>

          {/* 页脚信息 */}
          <div className="text-center text-sm text-gray-600 space-y-2">
            <p>高效的订阅转换服务，支持多种客户端格式</p>
            <div className="flex justify-center space-x-4">
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
          </div>
        </div>
      </div>
    </main>
  )
}
