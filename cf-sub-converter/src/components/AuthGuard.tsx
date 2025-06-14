'use client'

import { useState, useEffect, useCallback } from 'react'

interface AuthGuardProps {
  children: React.ReactNode
  requiredToken?: string
}

export default function AuthGuard({ children, requiredToken }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)

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

  const checkAuthentication = useCallback(async () => {
    try {
      // 检查是否已经通过 URL 参数验证
      const url = new URL(window.location.href)
      const tokenParam = url.searchParams.get('token')

      if (tokenParam) {
        const isValid = await verifyToken(tokenParam)
        if (isValid) {
          setIsAuthenticated(true)
          setLoading(false)
          return
        }
      }

      // 检查 sessionStorage 中是否有有效的认证
      const authToken = sessionStorage.getItem('auth_token')
      const authTime = sessionStorage.getItem('auth_time')

      if (authToken && authTime) {
        const now = Date.now()
        const authTimestamp = parseInt(authTime)
        // 认证有效期 1 小时
        if (now - authTimestamp < 60 * 60 * 1000) {
          // 验证存储的 token 是否仍然有效
          const isValid = await verifyToken(authToken)
          if (isValid) {
            setIsAuthenticated(true)
            setLoading(false)
            return
          } else {
            // 清除无效的认证信息
            sessionStorage.removeItem('auth_token')
            sessionStorage.removeItem('auth_time')
          }
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Authentication check failed:', error)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuthentication()
  }, [requiredToken, checkAuthentication])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setVerifying(true)

    if (!password.trim()) {
      setError('请输入密码')
      setVerifying(false)
      return
    }

    try {
      const isValid = await verifyToken(password)

      if (isValid) {
        setIsAuthenticated(true)
        // 保存认证状态到 sessionStorage
        sessionStorage.setItem('auth_token', password)
        sessionStorage.setItem('auth_time', Date.now().toString())
      } else {
        setError('密码错误')
        setPassword('')
      }
    } catch (error) {
      console.error('Login failed:', error)
      setError('验证失败，请重试')
    } finally {
      setVerifying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">验证中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">访问验证</h2>
            <p className="mt-2 text-sm text-gray-600">
              请输入密码以访问订阅管理页面
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="password" className="sr-only">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={verifying}
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="请输入访问密码"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={verifying}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {verifying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    验证中...
                  </>
                ) : (
                  '登录'
                )}
              </button>
            </div>
          </form>

          <div className="text-center">
            <p className="text-xs text-gray-500">提示：密码为配置的 TOKEN 值</p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
