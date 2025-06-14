'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import config from '@/lib/config'

export default function EditPage() {
  const [token, setToken] = useState('')
  const [content, setContent] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [guestVisible, setGuestVisible] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 在客户端设置 baseUrl
    setBaseUrl(window.location.origin)

    // 从 URL 获取 token
    const url = new URL(window.location.href)
    const tokenParam = url.searchParams.get('token')
    const currentToken = tokenParam || config.token
    setToken(currentToken)

    // 获取现有内容 - 发送API请求获取纯文本内容
    fetch(`/api/edit?token=${currentToken}`, {
      headers: {
        Accept: 'text/plain',
        'Content-Type': 'text/plain',
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        return res.text()
      })
      .then((text) => {
        setContent(text)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching content:', err)
        setSaveStatus(`获取内容失败: ${err.message}`)
        setLoading(false)
      })
  }, [])

  const handleSave = async () => {
    try {
      setSaveStatus('保存中...')

      const response = await fetch(`/api/edit?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
        },
        body: content,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.text()
      const now = new Date().toLocaleString()
      setSaveStatus(`${result} ${now}`)
      document.title = `编辑已保存 ${now}`

      // 3秒后清除状态
      setTimeout(() => {
        setSaveStatus('')
      }, 3000)
    } catch (error) {
      console.error('Save error:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      setSaveStatus(`保存失败: ${errorMessage}`)
    }
  }

  const formats = [
    { name: '自适应', format: '' },
    { name: 'Base64', format: 'b64' },
    { name: 'Clash', format: 'clash' },
    { name: 'Singbox', format: 'sb' },
    { name: 'Surge', format: 'surge' },
    { name: 'Loon', format: 'loon' },
  ]

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">加载中...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">{config.subName} 订阅编辑</h1>

        {/* 订阅链接部分 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">订阅链接</h2>
          <div className="space-y-6">
            {formats.map(({ name, format }) => (
              <div key={format} className="p-4 border rounded-lg">
                <h3 className="text-lg font-semibold mb-2">{name}订阅地址:</h3>
                <div className="flex items-center space-x-4">
                  <a
                    href={`${baseUrl}/${token}${format ? `?${format}` : ''}`}
                    className="text-blue-600 hover:underline break-all"
                    onClick={(e) => {
                      e.preventDefault()
                      const url = `${baseUrl}/${token}${
                        format ? `?${format}` : ''
                      }`
                      navigator.clipboard.writeText(url)
                      alert('已复制到剪贴板')
                    }}
                  >
                    {`${baseUrl}/${token}${format ? `?${format}` : ''}`}
                  </a>
                  <div className="w-32 h-32 flex-shrink-0">
                    <QRCodeSVG
                      value={`${baseUrl}/${token}${format ? `?${format}` : ''}`}
                      size={128}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 访客订阅部分 */}
        <div className="mb-8">
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
                      className="text-blue-600 hover:underline break-all"
                      onClick={(e) => {
                        e.preventDefault()
                        const url = `${baseUrl}/sub?token=${config.guestToken}${
                          format ? `&${format}` : ''
                        }`
                        navigator.clipboard.writeText(url)
                        alert('已复制到剪贴板')
                      }}
                    >
                      {`${baseUrl}/sub?token=${config.guestToken}${
                        format ? `&${format}` : ''
                      }`}
                    </a>
                    <div className="w-32 h-32 flex-shrink-0">
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

        {/* 编辑部分 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">订阅内容编辑</h2>
          <div className="space-y-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-64 p-4 border rounded-lg font-mono text-sm"
              placeholder="在此输入订阅内容，每行一个节点链接...&#10;&#10;支持的格式：&#10;- 节点链接 (vmess://, vless://, trojan://, ss:// 等)&#10;- 订阅链接 (https://...)&#10;&#10;示例：&#10;vmess://eyJ2IjoiMiIsInBzIjoi..."
            />
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={saveStatus.includes('保存中')}
              >
                {saveStatus.includes('保存中') ? '保存中...' : '保存'}
              </button>
              <span
                className={`text-sm ${
                  saveStatus.includes('失败') ? 'text-red-600' : 'text-gray-600'
                }`}
              >
                {saveStatus}
              </span>
            </div>
          </div>
        </div>

        {/* 配置信息部分 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">订阅转换配置</h2>
          <div className="space-y-2">
            <p>
              SUBAPI（订阅转换后端）:{' '}
              <strong>
                {config.subProtocol}://{config.subApi}
              </strong>
            </p>
            <p>
              SUBCONFIG（订阅转换配置文件）: <strong>{config.subConfig}</strong>
            </p>
          </div>
        </div>

        {/* 页脚 */}
        <footer className="text-sm text-gray-600">
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
