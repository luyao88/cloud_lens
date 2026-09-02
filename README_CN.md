# 镜云图床 CloudLens

[English](https://github.com/luyao88/cloud_lens/blob/main/README.md) | 简体中文

> 基于 Cloudflare Pages + Imgur 的全栈图床应用，支持图片/视频上传与管理、用户认证、相册管理、CDN 加速，完全免费部署。

## 页面

![镜云图床](https://cloudlens.190223.xyz/v2/AJ1Rixh.png)

[点击体验 Demo](https://cloudlens.190223.xyz/)

## 如何部署

### 一键部署

**Vercel 自动部署**

[![镜云图床](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/luyao88/cloud_lens)

**Cloudflare Pages 自动部署**

[![镜云图床](https://deploy.workers.cloudflare.com/button)](https://dash.cloudflare.com/?to=/:account/workers-and-pages/create/deploy-to-workers&repository=https://github.com/luyao88/cloud_lens)

### 手动部署

1. 准备一个 Cloudflare 账户
2. Fork 本仓库，自由修改 `App.vue` 和 `index.html` 文件中的文案
3. 登录 `Cloudflare Dashboard`，打开 `Workers 和 Pages`，创建 `Pages`
4. `连接到 Git`，选择你刚刚 Fork 的项目，点击开始设置
5. 修改 `框架预设` 为 `Vue`，点击保存并部署

### 环境变量配置

在 Cloudflare Pages 的 `设置 → 环境变量` 中配置以下变量：

| 变量                     | 必填 | 说明                                           |
| ------------------------ | ---- | ---------------------------------------------- |
| `GITHUB_CLIENT_ID`       | 否   | GitHub OAuth 登录                              |
| `GITHUB_CLIENT_SECRET`   | 否   | GitHub OAuth 密钥                              |
| `GOOGLE_CLIENT_ID`       | 否   | Google OAuth 登录                              |
| `GOOGLE_CLIENT_SECRET`   | 否   | Google OAuth 密钥                              |
| `GITEE_CLIENT_ID`        | 否   | Gitee OAuth 登录                               |
| `GITEE_CLIENT_SECRET`    | 否   | Gitee OAuth 密钥                               |
| `OAUTH_REDIRECT_ORIGIN`  | 是   | OAuth 回调域名（如 `https://your-domain.com`） |
| `TOKEN_SIGN_KEY`         | 是   | HMAC 签名密钥（随机字符串）                    |
| `RESEND_API_KEY`         | 否   | Resend 邮件服务 API Key                        |
| `MAIL_FROM`              | 否   | 发件地址（默认 `onboarding@resend.dev`）       |
| `UPLOAD_ALLOWED_ORIGINS` | 否   | 上传 CORS 白名单附加域名                       |

> 不配置 OAuth 和邮件相关变量时，用户仍可匿名上传，仅无法使用登录和相册管理功能。

### 数据库初始化

在 Cloudflare Dashboard 中创建 D1 数据库，并执行 `cloud_lens_data.sql` 建表脚本，然后在 `wrangler.jsonc` 中绑定数据库 ID。

## 特点

### 上传与存储

- 无限图片和视频储存数量，上传至 `Imgur`
- 单次上传上限 100 张文件，超过时提示并停止上传
- 支持图片格式：JPEG、PNG、GIF、APNG、TIFF、BMP、WebP（自动转 PNG）
- 支持视频格式：MP4、WebM、AVI、MOV、MKV、FLV、WMV、MPEG
- 并发限流上传（3 并发），排队管理，支持拖拽、点击、粘贴上传
- 悬浮上传托盘，实时进度展示，上传完成自动收起

### 用户系统

- 多登录方式：GitHub / Google / Gitee OAuth + 邮箱密码注册登录
- 邮箱验证码注册/登录，密码找回，密码修改
- OAuth 账号绑定与解绑，多登录方式关联同一账号
- 个人设置：头像上传（裁剪）、昵称修改、密码管理、邮箱绑定

### 相册管理

- 实体相册（支持 2 级嵌套）、时间分组、标签分组三种浏览模式
- 自定义相册封面、默认上传相册设置
- 图片批量管理：全选、批量移动、批量删标签、批量删除
- 单图操作：复制链接（URL/Markdown/HTML）、二维码、更改相册、灯箱预览

### CDN 加速

- 图片通过 WordPress CDN 全球缓存加速
- 视频通过 Cloudflare 边缘缓存加速

### 性能优化

- 上传进度节流更新（150ms），避免高频渲染卡顿
- 总进度独立节流计算（200ms），减少响应式开销
- 长列表 `content-visibility` 跳过屏幕外项渲染
- 缩略图懒加载、视频懒加载（IntersectionObserver）
- Vite 构建分包优化（vue/ui/utils 独立 chunk）

### 安全机制

- PBKDF2 密码哈希（10 万迭代 / SHA-256）
- HMAC 签名 token，OAuth state 双通道 CSRF 防护
- 接口限流（D1 固定窗口），CORS 白名单
- Session Cookie（HttpOnly / Secure / SameSite=Lax）

### 其他功能

- 明暗主题切换（View Transitions API 圆形扩散动画）
- 视频转图片工具（输出 GIF/WebP/JPEG）
- 404 页面内嵌 Catch The Cat 围猫游戏
- 完全免费，无需购买服务器和域名

## 架构说明

```
上传：浏览器 -> /upload -> Imgur API -> 返回文件 ID -> 持久化到 D1 数据库

访问图片：浏览器 -> /v2/xxx.png -> WordPress CDN 缓存 -> /imgur-proxy/xxx.png -> i.imgur.com
访问视频：浏览器 -> /v2/xxx.mp4 -> i.imgur.com (Range 请求) -> Cloudflare 边缘缓存
```

| 路由                   | 作用                                                       |
| ---------------------- | ---------------------------------------------------------- |
| `/upload`              | 接收文件转发到 Imgur API 上传                              |
| `/v2/:fileId`          | 根据文件类型分流：图片走 WordPress CDN，视频直接代理 Imgur |
| `/imgur-proxy/:fileId` | WordPress CDN 回源目标，代理到 i.imgur.com 并绕过防盗链    |
| `/api/auth/*`          | 用户认证（登录/注册/OAuth/验证码/密码管理等）              |
| `/api/albums/*`        | 相册 CRUD                                                  |
| `/api/images/*`        | 图片记录 CRUD、批量操作                                    |

## 技术栈

| 层级       | 技术                                        |
| ---------- | ------------------------------------------- |
| 前端框架   | Vue 3 + Vue Router + TypeScript             |
| 构建工具   | Vite                                        |
| UI 框架    | Tailwind CSS + radix-vue（shadcn-vue 模式） |
| 后端运行时 | Cloudflare Pages Functions                  |
| 数据库     | Cloudflare D1（SQLite）                     |
| 图床存储   | Imgur API                                   |
| CDN 加速   | WordPress CDN + Cloudflare 边缘缓存         |
| 邮件服务   | Resend API                                  |
| 部署平台   | Cloudflare Pages                            |

## 项目地址

[CloudLens - Github](https://github.com/luyao88/cloud_lens)
