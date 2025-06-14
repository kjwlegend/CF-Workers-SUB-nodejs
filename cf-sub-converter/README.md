# CF-SUB-CONVERTER

一个基于 Next.js 的订阅转换和管理系统，支持多种订阅格式的转换和管理。

## 功能特点

- 支持多种订阅格式转换（Base64、Clash、Singbox、Surge、QuanX、Loon）
- 访客订阅系统
- Telegram 通知功能
- 订阅内容管理
- 二维码生成
- 访问日志记录
- 响应式设计

## 技术栈

- Next.js 14
- TypeScript
- Tailwind CSS
- Prisma
- SQLite
- Winston Logger
- Telegram Bot API

## 快速开始

1. 克隆项目：

```bash
git clone https://github.com/yourusername/cf-sub-converter.git
cd cf-sub-converter
```

2. 安装依赖：

```bash
npm install
```

3. 配置环境变量：

在项目根目录创建 `.env` 文件，并添加以下配置：

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Security
TOKEN=auto
GUEST_TOKEN=
TG_TOKEN=
TG_CHAT_ID=
TG_ENABLED=0

# Subscription Configuration
SUB_NAME=CF-SUB-CONVERTER
SUB_UPDATE_TIME=6
SUB_API=SUBAPI.cmliussss.net
SUB_CONFIG=https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/config/ACL4SSR_Online_MultiCountry.ini
SUB_PROTOCOL=https

# Database
DATABASE_URL="file:./dev.db"
```

环境变量说明：

- `PORT`: 服务器端口号
- `NODE_ENV`: 运行环境（development/production）
- `TOKEN`: 访问令牌，设置为 "auto" 时自动生成
- `GUEST_TOKEN`: 访客访问令牌，留空时自动生成
- `TG_TOKEN`: Telegram Bot Token
- `TG_CHAT_ID`: Telegram 聊天 ID
- `TG_ENABLED`: 是否启用 Telegram 通知（0/1）
- `SUB_NAME`: 订阅名称
- `SUB_UPDATE_TIME`: 订阅更新时间（小时）
- `SUB_API`: 订阅转换 API 地址
- `SUB_CONFIG`: 订阅配置文件地址
- `SUB_PROTOCOL`: 订阅协议（http/https）
- `DATABASE_URL`: 数据库连接 URL

4. 初始化数据库：

```bash
npx prisma migrate dev
```

5. 启动开发服务器：

```bash
npm run dev
```

## 部署

1. 构建项目：

```bash
npm run build
```

2. 启动生产服务器：

```bash
npm start
```

## 使用说明

### 订阅管理

1. 访问主页 `http://localhost:3000` 查看所有订阅链接
2. 点击链接可以复制订阅地址
3. 扫描二维码可以直接添加订阅

### 访客订阅

1. 点击"查看访客订阅"按钮
2. 使用访客订阅链接或二维码
3. 访客订阅只能使用订阅功能，无法查看配置页

### Telegram 通知

1. 在 `.env` 文件中配置 Telegram Bot Token 和 Chat ID
2. 设置 `TG_ENABLED=1` 启用通知功能
3. 系统会自动发送访问和编辑通知

## API 接口

### 获取订阅

```
GET /api/sub?token=<token>
```

### 编辑订阅

```
GET /api/edit?token=<token>
POST /api/edit?token=<token>
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
