'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import config from '@/lib/config'

interface SubscriptionLinksProps {
  token: string
  baseUrl: string
  compact?: boolean // 紧凑模式
  showGuest?: boolean // 是否显示访客订阅
}

interface Format {
  name: string
  format: string
}

const formats: Format[] = [
  { name: '自适应', format: '' },
  { name: 'Base64', format: 'b64' },
  { name: 'Clash', format: 'clash' },
  { name: 'Singbox', format: 'sb' },
  { name: 'Surge', format: 'surge' },
  { name: 'Loon', format: 'loon' },
]

export default function SubscriptionLinks({
  token,
  baseUrl,
  compact = false,
  showGuest = true,
}: SubscriptionLinksProps) {
  const [guestVisible, setGuestVisible] = useState(false)
  const [expandedQR, setExpandedQR] = useState<string | null>(null)

  const generateSubscriptionUrl = (format: string, isGuest = false) => {
    if (isGuest) {
      return format
        ? `${baseUrl}/sub?token=${config.guestToken}&${format}`
        : `${baseUrl}/sub?token=${config.guestToken}`
    }
    return format ? `${baseUrl}/${token}?${format}` : `${baseUrl}/${token}`
  }

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url)
    alert('已复制到剪贴板')
  }

  const SubscriptionItem = ({
    name,
    format,
    isGuest = false,
  }: {
    name: string
    format: string
    isGuest?: boolean
  }) => {
    const url = generateSubscriptionUrl(format, isGuest)
    const itemKey = `${isGuest ? 'guest-' : ''}${format}`

    if (compact) {
      return (
        <div className="flex items-center justify-between p-2 border rounded">
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-gray-700">{name}:</span>
            <button
              onClick={() => copyToClipboard(url)}
              className="ml-2 text-blue-600 hover:underline text-sm truncate block"
              title={url}
            >
              {url}
            </button>
          </div>
          <div className="flex items-center space-x-2 ml-2">
            <button
              onClick={() =>
                setExpandedQR(expandedQR === itemKey ? null : itemKey)
              }
              className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
            >
              QR
            </button>
          </div>
          {expandedQR === itemKey && (
            <div className="absolute z-10 bg-white border shadow-lg p-2 rounded mt-2">
              <QRCodeSVG
                value={url}
                size={120}
                level="H"
                includeMargin={true}
              />
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-2">{name}订阅地址:</h3>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => copyToClipboard(url)}
            className="text-blue-600 hover:underline break-all flex-1"
          >
            {url}
          </button>
          <div className="w-32 h-32 flex-shrink-0">
            <QRCodeSVG value={url} size={128} level="H" includeMargin={true} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 主订阅链接 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {compact ? '订阅链接' : '订阅地址'}
        </h2>
        <div className={compact ? 'space-y-2' : 'space-y-6'}>
          {formats.map(({ name, format }) => (
            <SubscriptionItem key={format} name={name} format={format} />
          ))}
        </div>
      </div>

      {/* 访客订阅 */}
      {showGuest && (
        <div>
          <button
            onClick={() => setGuestVisible(!guestVisible)}
            className="text-blue-600 hover:underline text-sm"
          >
            {guestVisible ? '隐藏访客订阅∧' : '查看访客订阅∨'}
          </button>

          {guestVisible && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <p className="text-sm text-gray-600 mb-2">
                访客订阅只能使用订阅功能，无法查看配置页！
              </p>
              <p className="text-sm mb-4">
                GUEST TOKEN:{' '}
                <code className="bg-gray-200 px-1 rounded">
                  {config.guestToken}
                </code>
              </p>

              <div className={compact ? 'space-y-2' : 'space-y-4'}>
                {formats.map(({ name, format }) => (
                  <SubscriptionItem
                    key={`guest-${format}`}
                    name={name}
                    format={format}
                    isGuest={true}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
