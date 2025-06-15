# ⚙ 自建汇聚订阅 CF-Workers-SUB (Node.js 版本)

![自建汇聚订阅 CF-Workers-SUB](./sub.png)

> **⚠️ 重要声明**
>
> 本项目是由 **kjwlegend** 基于原 [CF-Workers-SUB](https://github.com/cmliu/CF-Workers-SUB) 项目重新编写的 **Node.js 版本**。
>
> **个人使用声明：** 此项目主要用于个人使用，由于开发者仅使用 V2RAY 和 Clash 客户端，未对其他协议进行完整测试。改写后可能存在 bug，请自行修复或反馈。
>
> **技术栈：** 采用 Node.js + PNPM 包管理器开发，保留了原项目的 `_worker.js` 文件以供参考。

这是一个将多个节点和订阅合并为单一链接的工具，支持自动适配与自定义分流，简化了订阅管理。

> [!CAUTION] > **汇聚订阅非 base64 订阅时**，会自动生成一个**有效期为 24 小时的临时订阅**，并提交给**订阅转换后端**来完成订阅转换，可避免您的汇聚订阅地址泄露。

> [!WARNING] > **汇聚订阅非 base64 订阅时**，如果您的节点数量**十分庞大**，订阅转换后端将需要较长时间才能完成订阅转换，这会导致部分梯子客户端在订阅时提示超时而无法完成订阅（说直白一点就是**汇聚节点池的节点时容易导致 Clash 订阅超时**）！
>
> 可自行删减订阅节点数量，提高订阅转换效率！

## 🛠 功能特点

1. **节点链接自动转换成 base64 订阅链接：** 这是最基础的功能，可以将您的节点自动转换为 base64 格式的订阅链接；
2. **将多个 base64 订阅汇聚成一个订阅链接：** 可以将多个订阅（例如不同的机场）合并成一个订阅，只需使用一个订阅地址即可获取所有节点；
3. **自动适配不同梯子的格式订阅链接：** 依托[订阅转换](https://sub.cmliussss.com/)服务，自动将订阅转换为不同梯子所需的格式，实现一条订阅适配多种梯子；
4. **专属代理分流规则：** 自定义分流规则，实现个性化的分流模式；
5. **更多功能等待发掘...**

## 🎬 视频教程

- **[自建订阅！CF-Workers-SUB 教你如何将多节点多订阅汇聚合并为一个订阅！](https://youtu.be/w6rRY4FDd58)**

## 🤝 社区支持

- Telegram 交流群: [@CMLiussss](https://t.me/CMLiussss)
- 感谢 [Alice Networks](https://alicenetworks.net/) 提供的云服务器维持 [CM 订阅转换服务](https://sub.cmliussss.com/)

## 🚀 Node.js 版本使用方法

### 📋 环境要求

- Node.js 16.x 或更高版本
- PNPM 包管理器

### 🔧 安装步骤

1. **克隆项目**

   ```bash
   git clone https://github.com/kjwlegend/CF-Workers-SUB-nodejs.git
   cd CF-Workers-SUB-nodejs
   ```

2. **安装依赖**

   ```bash
   pnpm install
   ```

3. **配置环境变量**

   复制环境变量配置文件：

   ```bash
   cp .env.example .env
   ```

   编辑 `.env` 文件，配置必要的环境变量（详见下方变量说明）。

4. **启动服务**

   开发模式：

   ```bash
   pnpm dev
   ```

   生产模式：

   ```bash
   pnpm start
   ```

5. **访问订阅**

   默认启动后，可通过以下地址访问：

   ```
   http://localhost:3000/auto
   或
   http://localhost:3000/?token=auto
   ```

### 📝 添加节点和订阅

启动服务后，访问配置的 TOKEN 路径（默认 `/auto`），在页面中添加您的节点链接和订阅链接，确保每行一个链接，例如：

```
vless://b7a392e2-4ef0-4496-90bc-1c37bb234904@cf.090227.xyz:443?encryption=none&security=tls&sni=edgetunnel-2z2.pages.dev&fp=random&type=ws&host=edgetunnel-2z2.pages.dev&path=%2F%3Fed%3D2048#%E5%8A%A0%E5%85%A5%E6%88%91%E7%9A%84%E9%A2%91%E9%81%93t.me%2FCMLiussss%E8%A7%A3%E9%94%81%E6%9B%B4%E5%A4%9A%E4%BC%98%E9%80%89%E8%8A%82%E7%82%B9
vmess://ew0KICAidiI6ICIyIiwNCiAgInBzIjogIuWKoOWFpeaIkeeahOmikemBk3QubWUvQ01MaXVzc3Nz6Kej6ZSB5pu05aSa5LyY6YCJ6IqC54K5PuiLseWbvSDlgKvmlabph5Hono3ln44iLA0KICAiYWRkIjogImNmLjA5MDIyNy54eXoiLA0KICAicG9ydCI6ICI4NDQzIiwNCiAgImlkIjogIjAzZmNjNjE4LWI5M2QtNjc5Ni02YWVkLThhMzhjOTc1ZDU4MSIsDQogICJhaWQiOiAiMCIsDQogICJzY3kiOiAiYXV0byIsDQogICJuZXQiOiAid3MiLA0KICAidHlwZSI6ICJub25lIiwNCiAgImhvc3QiOiAicHBmdjJ0bDl2ZW9qZC1tYWlsbGF6eS5wYWdlcy5kZXYiLA0KICAicGF0aCI6ICIvamFkZXIuZnVuOjQ0My9saW5rdndzIiwNCiAgInRscyI6ICJ0bHMiLA0KICAic25pIjogInBwZnYydGw5dmVvamQtbWFpbGxhenkucGFnZXMuZGV2IiwNCiAgImFscG4iOiAiIiwNCiAgImZwIjogIiINCn0=
https://sub.xf.free.hr/auto
https://hy2sub.pages.dev
```

## 📋 环境变量说明

在 `.env` 文件中配置以下变量：

| 变量名    | 示例                                                                                                                                                       | 必填 | 备注                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------- |
| PORT      | `3000`                                                                                                                                                     | ❌   | 服务启动端口，默认 3000                                    |
| TOKEN     | `auto`                                                                                                                                                     | ✅   | 汇聚订阅的订阅配置路径地址，例如：`/auto`                  |
| GUEST     | `test`                                                                                                                                                     | ❌   | 汇聚订阅的访客订阅 TOKEN，例如：`/sub?token=test`          |
| LINK      | `vless://b7a39...`,`vmess://ew0K...`,`https://sub...`                                                                                                      | ❌   | 可同时放入多个节点链接与多个订阅链接，链接之间用换行做间隔 |
| TGTOKEN   | `6894123456:XXXXXXXXXX0qExVsBPUhHDAbXXXXXqWXgBA`                                                                                                           | ❌   | 发送 TG 通知的机器人 token                                 |
| TGID      | `6946912345`                                                                                                                                               | ❌   | 接收 TG 通知的账户数字 ID                                  |
| SUBNAME   | `CF-Workers-SUB`                                                                                                                                           | ❌   | 订阅名称                                                   |
| SUBAPI    | `SUBAPI.cmliussss.net`                                                                                                                                     | ❌   | clash、singbox 等 订阅转换后端                             |
| SUBCONFIG | [https://raw.github.../ACL4SSR_Online_MultiCountry.ini](https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/config/ACL4SSR_Online_MultiCountry.ini) | ❌   | clash、singbox 等 订阅转换配置文件                         |

## 🛠️ 开发相关

### 📁 项目结构

```
CF-Workers-SUB-nodejs/
├── cf-sub-converter/                    # 源代码目录
├── _worker.js             # 原 Cloudflare Workers 代码（保留参考）
├── package.json           # 项目配置
├── .env.example          # 环境变量示例
└── README.md             # 项目说明
```

### 🔧 可用脚本

```bash
pnpm dev      # 开发模式启动
pnpm start    # 生产模式启动
pnpm build    # 构建项目（如适用）
pnpm test     # 运行测试（如适用）
```

## ⚠️ 注意事项

1. **协议支持：** 本 Node.js 版本主要测试了 V2RAY 和 Clash 协议，其他协议可能存在兼容性问题。
2. **Telegram 通知：** TGTOKEN 和 TGID 需要先到 Telegram 注册机器人并获取相应凭证， 但功能未测试， 仅供参考（可能有 bug)
3. **原始代码参考：** 项目保留了原始的 `_worker.js` 文件，可作为功能参考或回滚使用。
4. **个人使用：** 本项目主要面向个人学习和测试

## ⭐ Star 星星走起

[![Stargazers over time](https://starchart.cc/cmliu/CF-Workers-SUB.svg?variant=adaptive)](https://starchart.cc/cmliu/CF-Workers-SUB)

## 🙏 致谢

- **原项目作者：** [cmliu](https://github.com/cmliu) - 感谢提供优秀的原始项目
- **Node.js 重写：** [kjwlegend](https://github.com/kjwlegend) - 本 Node.js 版本的开发者
- **服务支持：** [Alice Networks LTD](https://alicenetworks.net/)
- **技术参考：** [mianayang](https://github.com/mianayang/myself/blob/main/cf-workers/sub/sub.js)、[ACL4SSR](https://github.com/ACL4SSR/ACL4SSR/tree/master/Clash/config)、[肥羊](https://sub.v1.mk/)

---

**License:** 遵循原项目开源协议  
**维护者：** kjwlegend  
**最后更新：** 2025 年 6 月
