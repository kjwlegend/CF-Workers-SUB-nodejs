'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import config from '@/lib/config'
import Link from 'next/link'

export default function Home() {
  const [token, setToken] = useState('')
  const [guestVisible, setGuestVisible] = useState(false)
  const [baseUrl, setBaseUrl] = useState('')

  useEffect(() => {
    // 在客户端设置 baseUrl
    setBaseUrl(window.location.origin)

    // 从 URL 获取 token
    const url = new URL(window.location.href)
    const tokenParam = url.searchParams.get('token')
    setToken(tokenParam || config.token)
  }, [])

  const generateSubscriptionUrl = (format: string) => {
    return format ? `${baseUrl}/${token}?${format}` : `${baseUrl}/${token}`
  }

  const formats = [
    { name: '自适应', format: '' },
    { name: 'Base64', format: 'b64' },
    { name: 'Clash', format: 'clash' },
    { name: 'Singbox', format: 'sb' },
    { name: 'Surge', format: 'surge' },
    { name: 'Loon', format: 'loon' },
  ]

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">订阅管理</h1>
          <Link
            href={`/edit?token=${token}`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            编辑订阅
          </Link>
        </div>

        {/* 订阅链接部分 */}
        <div className="space-y-6">
          {formats.map(({ name, format }) => (
            <div key={format} className="p-4 border rounded-lg">
              <h2 className="text-xl font-semibold mb-2">{name}订阅地址:</h2>
              <div className="flex items-center space-x-4">
                <a
                  href={generateSubscriptionUrl(format)}
                  className="text-blue-600 hover:underline"
                  onClick={(e) => {
                    e.preventDefault()
                    navigator.clipboard.writeText(
                      generateSubscriptionUrl(format)
                    )
                    alert('已复制到剪贴板')
                  }}
                >
                  {generateSubscriptionUrl(format)}
                </a>
                <div className="w-32 h-32">
                  <QRCodeSVG
                    value={generateSubscriptionUrl(format)}
                    size={128}
                    level="H"
                    includeMargin={true}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 访客订阅部分 */}
        <div className="mt-8">
          <button
            onClick={() => setGuestVisible(!guestVisible)}
            className="text-blue-600 hover:underline"
          >
            {guestVisible ? '隐藏访客订阅∧' : '查看访客订阅∨'}
          </button>

          {guestVisible && (
            <div className="mt-4 p-4 border rounded-lg">
              <p className="mb-4">访客订阅只能使用订阅功能，无法查看配置页！</p>
              <p className="mb-4">
                GUEST（访客订阅TOKEN）: <strong>{config.guestToken}</strong>
              </p>

              {formats.map(({ name, format }) => (
                <div key={`guest-${format}`} className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">
                    {name}订阅地址:
                  </h3>
                  <div className="flex items-center space-x-4">
                    <a
                      href={`${baseUrl}/sub?token=${config.guestToken}${
                        format ? `&${format}` : ''
                      }`}
                      className="text-blue-600 hover:underline"
                      onClick={(e) => {
                        e.preventDefault()
                        navigator.clipboard.writeText(
                          `${baseUrl}/sub?token=${config.guestToken}${
                            format ? `&${format}` : ''
                          }`
                        )
                        alert('已复制到剪贴板')
                      }}
                    >
                      {`${baseUrl}/sub?token=${config.guestToken}${
                        format ? `&${format}` : ''
                      }`}
                    </a>
                    <div className="w-32 h-32">
                      <QRCodeSVG
                        value={`${baseUrl}/sub?token=${config.guestToken}${
                          format ? `&${format}` : ''
                        }`}
                        size={128}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 页脚 */}
        <footer className="mt-8 text-sm text-gray-600">
          <p>Telegram 交流群 技术大佬在群里！</p>
          <a
            href="https://t.me/CMliussss"
            className="text-blue-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://t.me/CMliussss
          </a>
          <p className="mt-2">github 项目地址 Star!Star!Star!!!</p>
          <a
            href="https://github.com/cmliu/CF-Workers-SUB"
            className="text-blue-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://github.com/cmliu/CF-Workers-SUB
          </a>
        </footer>
      </div>
    </main>
  )
}
