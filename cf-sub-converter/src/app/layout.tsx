import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import config from '@/lib/config'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: config.subName,
  description: 'Subscription converter and manager',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
