/**
 * Winston logger configuration for the application
 */

import winston from 'winston'

/**
 * Winston logger configuration
 * 日志记录器配置
 */

// 自定义日志格式
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`

    // 如果有额外的元数据，添加到日志中
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`
    }

    return logMessage
  })
)

// 创建 Winston logger 实例
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: customFormat,
  defaultMeta: { service: 'cf-sub-converter' },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),

    // 文件输出 - 错误日志
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // 文件输出 - 所有日志
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],

  // 异常处理
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],

  // 未捕获的 Promise rejection 处理
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
})

// 在非生产环境下，也输出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  )
}

/**
 * 导出 logger 实例和常用方法
 */

// 导出常用的日志方法
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const info = (message: string, meta?: any) => logger.info(message, meta)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const error = (message: string, meta?: any) =>
  logger.error(message, meta)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const warn = (message: string, meta?: any) => logger.warn(message, meta)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debug = (message: string, meta?: any) =>
  logger.debug(message, meta)

// Add request logging middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    })
  })
  next()
}

export { logger }
export default logger
