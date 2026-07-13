# 镜云图床

English | [简体中文](https://github.com/luyao88/cloud_lens/blob/main/README_CN.md)

> In the modern Internet environment, fast and stable image and video access is one of the important factors to improve user experience. This article will introduce how to use Cloudflare Pages to deploy a stable unlimited image bed Imgur, realize image and video upload and access, and further accelerate image loading through WordPress's WP.COM global image cache. It can be used for free image hosting solutions, alternatives such as Flickr.

## Introduction

- [Cloudflare Pages](https://pages.cloudflare.com/) is a powerful static website hosting service that combines the advantages of Cloudflare's global CDN (content distribution network).

- [Imgur](https://imgur.com/) is a free high-quality image and video hosting.

- [WordPress's global image cache](https://01.wp.com/) is an efficient CDN service specifically designed to accelerate image content. It uses globally distributed nodes to cache images and provide fast access (images only; videos are cached by Cloudflare edge cache).

- [Cloudflare CDN (Content Delivery Network)](https://www.cloudflare.com/zh-cn/application-services/products/cdn/) is a service provided by Cloudflare that is designed to accelerate and protect global web applications.

### Page

![CloudLens Image Hosting](https://uxiaohan.github.io/v2/2024/12/1733291366.webp)

[Click to experience Demo](https://cloudlens.190223.xyz/)

## How to deploy

**One-click deployment**

Vercel Automated Deployment

[![镜云图床](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/luyao88/cloud_lens)

Cloudflare Pages automatic deployment

[![镜云图床](https://deploy.workers.cloudflare.com/button)](https://dash.cloudflare.com/?to=/:account/workers-and-pages/create/deploy-to-workers&repository=https://github.com/luyao88/cloud_lens)

**Manual Deployment**

- 1. Prepare a Cloudflare account
- 2. Fork this repository and freely modify the text in the `App.vue` and `index.html` files
- 3. Log in to `Cloudflare Dashboard`, open `Workers and Pages`, and create `Pages`
- 4. `Connect to Git`, select the project you just forked in `Github` or `Gitlab`, and click Start Setup
- 5. Just change `framework preset` to `Vue`, click Save and Deploy, and the deployment will be successful and put into use

**Picture steps**

![CloudLens Picture Bed](https://uxiaohan.github.io/v2/2024/07/1721640641.png)
![CloudLens Picture Bed](https://uxiaohan.github.io/v2/2024/07/1721640649.png)
![CloudLens Picture Bed](https://uxiaohan.github.io/v2/2024/07/1721640656.png)

### Features

- Unlimited image and video storage, you can upload an unlimited number of images and videos to `Imgur`

- Supported image formats: JPEG, PNG, GIF, APNG, TIFF, BMP, WebP (max 20MB)

- Supported video formats: MP4, WebM, AVI, MOV, MKV, FLV, WMV, MPEG (max 200MB)

- Images are accelerated by WordPress global CDN cache, videos are accelerated by Cloudflare edge cache

- No need to purchase a server, hosted on `Cloudflare Pages`, 100,000 requests per day

- No need to buy a domain name, you can use the free second-level domain name `*.pages.dev` provided by `Cloudflare Pages`, and it also supports binding custom domain names

### Architecture

```
Upload: Browser -> /upload (upload.js) -> Imgur API -> returns file ID

Access image: Browser -> /v2/xxx.png -> WordPress CDN cache -> /imgur-proxy/xxx.png -> i.imgur.com
Access video: Browser -> /v2/xxx.mp4 -> i.imgur.com (Range request) -> Cloudflare edge cache
```

| Functions route        | Purpose                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| `/upload`              | Receives file and forwards to Imgur API                                          |
| `/v2/:fileId`          | Routes by file type: images via WordPress CDN, videos direct to Imgur            |
| `/imgur-proxy/:fileId` | WordPress CDN origin target, proxies to i.imgur.com bypassing hotlink protection |

### Project address

[CloudLens - Github](https://github.com/luyao88/cloud_lens)
