import { PrismaClient } from '@prisma/client'

/**
 * Prisma client singleton
 * 确保在开发环境中不会创建多个 Prisma 客户端实例
 */

// 全局类型声明
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

// 创建 Prisma 客户端实例
const createPrismaClient = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    errorFormat: 'pretty',
  })
}

// 在开发环境中使用全局变量避免热重载时创建多个实例
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
const prisma = globalThis.__prisma ?? createPrismaClient()

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma
}

// 优雅关闭处理
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

// 数据库连接测试函数
export async function testDatabaseConnection() {
  try {
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    return true
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.error('❌ Database connection failed:', (error as any).message)
    return false
  }
}

// 数据库健康检查
export async function healthCheck() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$queryRaw`SELECT 1 as health`
    return { status: 'healthy', result }
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { status: 'unhealthy', error: (error as any).message }
  }
}

export { prisma }
export default prisma
