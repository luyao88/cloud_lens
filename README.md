# CloudLens Image Hosting

English | [简体中文](https://github.com/luyao88/cloud_lens/blob/main/README_CN.md)

> A full-stack image/video hosting application built on Cloudflare Pages + Imgur, supporting upload and management, user authentication, album management, and CDN acceleration. Completely free to deploy.

## Page

![CloudLens Image Hosting](https://cloudlens.190223.xyz/v2/AJ1Rixh.png)

[Click to experience Demo](https://cloudlens.190223.xyz/)

## How to deploy

### One-click deployment

**Vercel Automated Deployment**

[→ Deploy with Vercel](https://vercel.com/new/clone?repository-url=https://github.com/luyao88/cloud_lens)

**Cloudflare Pages automatic deployment**

[→ Deploy with Cloudflare](https://dash.cloudflare.com/?to=/:account/workers-and-pages/create/deploy-to-workers&repository=https://github.com/luyao88/cloud_lens)

### Manual Deployment

1. Prepare a Cloudflare account
2. Fork this repository and freely modify the text in the `App.vue` and `index.html` files
3. Log in to `Cloudflare Dashboard`, open `Workers and Pages`, and create `Pages`
4. `Connect to Git`, select the project you just forked in `Github` or `Gitlab`, and click Start Setup
5. Just change `framework preset` to `Vue`, click Save and Deploy, and the deployment will be successful and put into use

### Environment Variables

Configure the following variables in Cloudflare Pages `Settings → Environment Variables`:

| Variable                 | Required | Description                                            |
| ------------------------ | -------- | ------------------------------------------------------ |
| `GITHUB_CLIENT_ID`       | No       | GitHub OAuth login                                     |
| `GITHUB_CLIENT_SECRET`   | No       | GitHub OAuth secret                                    |
| `GOOGLE_CLIENT_ID`       | No       | Google OAuth login                                     |
| `GOOGLE_CLIENT_SECRET`   | No       | Google OAuth secret                                    |
| `GITEE_CLIENT_ID`        | No       | Gitee OAuth login                                      |
| `GITEE_CLIENT_SECRET`    | No       | Gitee OAuth secret                                     |
| `OAUTH_REDIRECT_ORIGIN`  | Yes      | OAuth callback domain (e.g. `https://your-domain.com`) |
| `TOKEN_SIGN_KEY`         | Yes      | HMAC signing key (random string)                       |
| `RESEND_API_KEY`         | No       | Resend email service API Key                           |
| `MAIL_FROM`              | No       | Sender address (default `onboarding@resend.dev`)       |
| `UPLOAD_ALLOWED_ORIGINS` | No       | Upload CORS whitelist additional domains               |

> Without OAuth and email variables configured, users can still upload anonymously, but login and album management features will be unavailable.

### Database Initialization

Create a D1 database in Cloudflare Dashboard, execute the `cloud_lens_data.sql` schema script, and bind the database ID in `wrangler.jsonc`.

## Features

### Upload & Storage

- Unlimited image and video storage, uploaded to `Imgur`
- Single upload limit of 100 files, with prompt and stop when exceeded
- Supported image formats: JPEG, PNG, GIF, APNG, TIFF, BMP, WebP (auto-convert to PNG)
- Supported video formats: MP4, WebM, AVI, MOV, MKV, FLV, WMV, MPEG
- Concurrent upload throttling (3 concurrent), queue management, drag-and-drop, click, and paste upload
- Floating upload tray with real-time progress, auto-collapse on completion

### User System

- Multiple login methods: GitHub / Google / Gitee OAuth + email password registration/login
- Email verification code for registration/login, password recovery, password change
- OAuth account binding/unbinding, multiple login methods linked to one account
- Personal settings: avatar upload (crop), nickname edit, password management, email binding

### Album Management

- Entity albums (2-level nesting), time grouping, tag grouping — three browsing modes
- Custom album covers, default upload album setting
- Batch image management: select all, batch move, batch delete tags, batch delete
- Single image operations: copy link (URL/Markdown/HTML), QR code, change album, lightbox preview

### CDN Acceleration

- Images accelerated by WordPress global CDN cache
- Videos accelerated by Cloudflare edge cache

### Performance Optimizations

- Upload progress throttled updates (150ms) to avoid high-frequency rendering lag
- Overall progress independently throttled (200ms) to reduce reactive overhead
- Long list `content-visibility` skips off-screen item rendering
- Thumbnail lazy loading, video lazy loading (IntersectionObserver)
- Vite build chunk splitting optimization (vue/ui/utils independent chunks)

### Security

- PBKDF2 password hashing (100,000 iterations / SHA-256)
- HMAC signed tokens, OAuth state dual-channel CSRF protection
- API rate limiting (D1 fixed window), CORS whitelist
- Session cookies (HttpOnly / Secure / SameSite=Lax)

### Other Features

- Dark/light theme toggle (View Transitions API circular spread animation)
- Video to image tool (output GIF/WebP/JPEG)
- 404 page with embedded Catch The Cat game
- Completely free, no need to purchase servers or domain names

## Architecture

```
Upload: Browser -> /upload -> Imgur API -> returns file ID -> persisted to D1 database

Access image: Browser -> /v2/xxx.png -> WordPress CDN cache -> /imgur-proxy/xxx.png -> i.imgur.com
Access video: Browser -> /v2/xxx.mp4 -> i.imgur.com (Range request) -> Cloudflare edge cache
```

| Route                  | Purpose                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| `/upload`              | Receives file and forwards to Imgur API                                          |
| `/v2/:fileId`          | Routes by file type: images via WordPress CDN, videos direct to Imgur            |
| `/imgur-proxy/:fileId` | WordPress CDN origin target, proxies to i.imgur.com bypassing hotlink protection |
| `/api/auth/*`          | User authentication (login/register/OAuth/verification/password management)      |
| `/api/albums/*`        | Album CRUD                                                                       |
| `/api/images/*`        | Image record CRUD, batch operations                                              |

## Tech Stack

| Layer           | Technology                                    |
| --------------- | --------------------------------------------- |
| Frontend        | Vue 3 + Vue Router + TypeScript               |
| Build Tool      | Vite                                          |
| UI Framework    | Tailwind CSS + radix-vue (shadcn-vue pattern) |
| Backend Runtime | Cloudflare Pages Functions                    |
| Database        | Cloudflare D1 (SQLite)                        |
| Image Storage   | Imgur API                                     |
| CDN             | WordPress CDN + Cloudflare edge cache         |
| Email Service   | Resend API                                    |
| Deployment      | Cloudflare Pages                              |

## Project Repository

[CloudLens - Github](https://github.com/luyao88/cloud_lens)
