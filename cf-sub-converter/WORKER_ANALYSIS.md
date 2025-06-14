# CF-Workers-SUB 功能模块分析

## 1. 配置管理模块

### 全局配置变量

- `mytoken`: 主访问令牌 (默认: 'auto')
- `guestToken`: 访客令牌 (可为空，自动生成)
- `BotToken`: Telegram Bot Token
- `ChatID`: Telegram 聊天 ID
- `TG`: Telegram 通知开关 (0/1)
- `FileName`: 订阅文件名 (默认: 'CF-Workers-SUB')
- `SUBUpdateTime`: 订阅更新时间 (默认: 6 小时)
- `total`: 流量总量 (默认: 99TB)
- `timestamp`: 过期时间戳 (默认: 2099-12-31)

### 订阅转换配置

- `subConverter`: 订阅转换后端 (默认: "SUBAPI.cmliussss.net")
- `subConfig`: 订阅配置文件 URL
- `subProtocol`: 协议 (http/https)

### 数据源配置

- `MainData`: 主要节点数据 (自建节点)
- `urls`: 订阅链接数组

## 2. 认证与访问控制模块

### Token 验证机制

- 支持三种 token: `mytoken`, `fakeToken`, `访客订阅`
- `fakeToken` 基于当前日期和 mytoken 生成 (MD5MD5 算法)
- 支持路径访问: `/{mytoken}` 或 `/{mytoken}?xxx`

### 访问控制逻辑

- 未授权访问处理:
  - 发送异常访问通知 (如果 TG=1)
  - 302 重定向 (如果设置 URL302)
  - 反向代理 (如果设置 URL)
  - 返回 nginx 默认页面

## 3. 订阅格式检测模块

### User-Agent 检测

- `null/subconverter/nekobox/cf-workers-sub` → base64
- `clash` → clash
- `sing-box/singbox` → singbox
- `surge` → surge
- `quantumult%20x` → quanx
- `loon` → loon

### URL 参数检测

- `?b64` 或 `?base64` → base64
- `?clash` → clash
- `?sb` 或 `?singbox` → singbox
- `?surge` → surge
- `?quanx` → quanx
- `?loon` → loon

## 4. 数据源管理模块

### KV 存储支持

- 支持 Cloudflare KV 存储
- 文件名: 'LINK.txt'
- 支持数据迁移 (从 '/LINK.txt' 到 'LINK.txt')

### 数据源类型

- 环境变量 `LINK`: 直接节点数据
- 环境变量 `LINKSUB`: 订阅链接
- KV 存储: 持久化存储

### 数据分类处理

- 自建节点: 非 http 开头的链接
- 订阅链接: http 开头的链接

## 5. 订阅获取与处理模块

### 订阅链接处理 (`getSUB` 函数)

- 并发请求多个订阅链接 (2 秒超时)
- 支持多种订阅格式识别:
  - Clash 配置: 包含 'proxies:'
  - Singbox 配置: 包含 'outbounds"' 和 'inbounds"'
  - 明文订阅: 包含 '://'
  - Base64 订阅: 符合 Base64 格式
- 异常订阅处理: 生成错误节点

### 请求处理 (`getUrl` 函数)

- 自定义 User-Agent: `v2rayN/6.45 cmliu/CF-Workers-SUB {追加UA}({原始UA})`
- SSL 证书验证跳过
- 支持重定向跟随

## 6. 订阅转换模块

### Base64 编码

- 支持标准 btoa 和自定义 Base64 编码
- UTF-8 编码处理
- 去重处理

### 外部转换服务

- 支持多种目标格式: clash, singbox, surge, quanx, loon
- 统一的转换参数配置
- 转换失败时回退到 Base64

### Clash 特殊处理 (`clashFix` 函数)

- WireGuard 配置修复
- 添加 `remote-dns-resolve: true` 参数

## 7. 通知系统模块

### Telegram 通知 (`sendMessage` 函数)

- IP 地理位置查询 (ip-api.com)
- 支持的通知类型:
  - 异常访问通知
  - 编辑订阅通知
  - 获取订阅通知
- HTML 格式消息

### 通知内容

- IP 地址和地理位置信息
- User-Agent 信息
- 访问路径和参数

## 8. 编辑界面模块

### KV 函数 (编辑页面)

- GET: 显示编辑界面
- POST: 保存订阅内容
- 完整的 HTML 界面，包含:
  - 所有格式的订阅链接
  - 二维码生成
  - 访客订阅链接
  - 文本编辑器
  - 自动保存功能

### 界面特性

- 响应式设计
- 实时二维码生成
- 一键复制功能
- 自动保存 (失焦和定时)

## 9. 工具函数模块

### 文本处理

- `ADD`: 文本清理和分割
- `base64Decode`: Base64 解码
- `isValidBase64`: Base64 格式验证

### 加密函数

- `MD5MD5`: 双重 MD5 加密 (取中间 20 位再次加密)

### 代理功能

- `proxyURL`: 反向代理功能
- 随机选择代理 URL
- 路径拼接处理

### 默认页面

- `nginx`: 返回 nginx 风格的默认页面

## 10. 环境变量支持

### 必需变量

- `TOKEN`: 主访问令牌
- `DATABASE_URL`: 数据库连接 (Next.js 版本需要)

### 可选变量

- `GUESTTOKEN/GUEST`: 访客令牌
- `TGTOKEN`: Telegram Bot Token
- `TGID`: Telegram 聊天 ID
- `TG`: 通知开关
- `SUBAPI`: 订阅转换 API
- `SUBCONFIG`: 订阅配置文件
- `SUBNAME`: 订阅名称
- `SUBUPTIME`: 更新时间
- `LINK`: 直接节点数据
- `LINKSUB`: 订阅链接
- `WARP`: WARP 节点
- `URL302`: 重定向 URL
- `URL`: 代理 URL
- `KV`: KV 存储绑定

## 11. 路由处理逻辑

### 主要路由

1. 未授权访问 → 默认页面/重定向/代理
2. 浏览器访问 (Mozilla UA + 无参数) → 编辑页面
3. 订阅客户端访问 → 订阅内容

### 访问模式

- `/{token}` - 自适应订阅
- `/{token}?format` - 指定格式订阅
- `/sub?token={token}` - 访客订阅
- 编辑页面 - 浏览器访问

## 12. 响应头设置

### 订阅响应头

- `Content-Type`: text/plain; charset=utf-8
- `Profile-Update-Interval`: 更新间隔
- `Content-Disposition`: 文件下载名称 (转换格式)
- `Subscription-Userinfo`: 流量信息 (已注释)

## 13. 错误处理

### 网络错误

- 订阅获取超时处理
- 转换服务失败回退
- 异常订阅标记

### 数据错误

- Base64 编码异常处理
- UTF-8 编码修复
- 空数据处理
