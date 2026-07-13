# 镜云图床

> 在现代互联网环境中，快速稳定的图片和视频访问是提升用户体验的重要因素之一。本文将介绍如何利用Cloudflare Pages部署稳定的无限图床Imgur，实现图片和视频上传与访问，并进一步通过WordPress的WP.COM全球图片缓存进行加速，提高图片加载速度。可用于免费图片托管解决方案，Flickr 等替代品。

[English](https://github.com/luyao88/cloud_lens) | 简体中文

## 简介

- [Cloudflare Pages](https://pages.cloudflare.com/) 是一个强大的静态网站托管服务，结合了 Cloudflare 的全球 CDN（内容分发网络）优势。

- [Imgur](https://imgur.com/) 是一个免费优质的图床，支持图片和视频上传。

- [WordPress 的全球图片缓存](https://01.wp.com/) 是一个高效的 CDN 服务，专门用于加速图片内容。它利用全球分布的节点，将图片缓存并提供快速访问（仅支持图片，视频由 Cloudflare 边缘缓存加速）。

- [Cloudflare CDN（内容分发网络）](https://www.cloudflare.com/zh-cn/application-services/products/cdn/)是由Cloudflare提供的服务，旨在加速和保护和加速全球网络应用程序。

### 页面

![镜云图床](https://uxiaohan.github.io/v2/2024/07/1721639712.png)

[点击体验Demo](https://cloudlens.190223.xyz/)

## 如何部署

**一键部署**

Vercel 自动部署

[![镜云图床](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/luyao88/cloud_lens)

Cloudflare Pages 自动部署

[![镜云图床](https://deploy.workers.cloudflare.com/button)](https://dash.cloudflare.com/?to=/:account/workers-and-pages/create/deploy-to-workers&repository=https://github.com/luyao88/cloud_lens)

**手动部署**

- 1、准备一个 Cloudflare 账户
- 2、Fork 本仓库，自由修改`App.vue`和`index.html`文件中的文案
- 3、登录`Cloudflare Dashboard`打开`Workers 和 Pages`创建`Pages`
- 4、`连接到Git`选择`Github`或`Gitlab`中你刚刚Fork的项目，点击开始设置
- 5、只需要修改`框架预设`为`Vue`即可，点击保存并部署，即可部署成功并投入使用

**图片步骤**

![镜云图床](https://uxiaohan.github.io/v2/2024/07/1721640641.png)
![镜云图床](https://uxiaohan.github.io/v2/2024/07/1721640649.png)
![镜云图床](https://uxiaohan.github.io/v2/2024/07/1721640656.png)

### 特点

- 无限图片和视频储存数量，你可以上传不限数量的图片和视频到`Imgur`

- 支持图片格式：JPEG、PNG、GIF、APNG、TIFF、BMP、WebP（上限 20MB）

- 支持视频格式：MP4、WebM、AVI、MOV、MKV、FLV、WMV、MPEG（上限 200MB）

- 图片通过 WordPress CDN 全球缓存加速，视频通过 Cloudflare 边缘缓存加速

- 无需购买服务器，托管于`Cloudflare Pages`上，每天10万次的请求

- 无需购买域名，可以使用`Cloudflare Pages` 提供的`*.pages.dev`的免费二级域名，同时也支持绑定自定义域名

### 架构说明

```
上传：浏览器 -> /upload (upload.js) -> Imgur API -> 返回文件ID

访问图片：浏览器 -> /v2/xxx.png -> WordPress CDN 缓存 -> /imgur-proxy/xxx.png -> i.imgur.com
访问视频：浏览器 -> /v2/xxx.mp4 -> i.imgur.com (Range请求) -> Cloudflare 边缘缓存
```

| Functions 路由         | 作用                                                         |
| ---------------------- | ------------------------------------------------------------ |
| `/upload`              | 接收文件转发到 Imgur API 上传                                |
| `/v2/:fileId`          | 根据 fileType 分流：图片走 WordPress CDN，视频直接代理 Imgur |
| `/imgur-proxy/:fileId` | WordPress CDN 回源目标，代理到 i.imgur.com 并绕过防盗链      |

### 项目地址

[CloudLens - Github](https://github.com/luyao88/cloud_lens)
