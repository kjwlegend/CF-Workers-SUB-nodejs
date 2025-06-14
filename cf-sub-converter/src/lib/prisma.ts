// 暂时使用简化的数据库接口，避免 Prisma 生成问题
interface Subscription {
  id: number
  content: string
  createdAt: Date
  updatedAt: Date
}

interface AccessLog {
  id: number
  ip: string
  userAgent: string
  path: string
  createdAt: Date
}

// 简化的数据库操作接口
export const prisma = {
  subscription: {
    findFirst: async (options?: any): Promise<Subscription | null> => {
      // 暂时返回 null，实际实现需要连接数据库
      return null
    },
    create: async (data: any): Promise<Subscription> => {
      // 暂时返回模拟数据
      return {
        id: 1,
        content: data.data.content,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    },
    update: async (options: any): Promise<Subscription> => {
      return {
        id: options.where.id,
        content: options.data.content,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    },
  },
  accessLog: {
    create: async (data: any): Promise<AccessLog> => {
      // 暂时只记录到控制台
      console.log('Access log:', data.data)
      return {
        id: 1,
        ip: data.data.ip,
        userAgent: data.data.userAgent,
        path: data.data.path,
        createdAt: new Date(),
      }
    },
  },
}
