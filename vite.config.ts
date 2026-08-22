import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

import autoprefixer from 'autoprefixer';
import tailwind from 'tailwindcss';

// 开发环境禁止浏览器缓存，避免旧代码导致白屏
const devNoCache = {
  name: 'dev-no-cache',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      next();
    });
  },
};

// https://vite.dev/config/
export default defineConfig({
  css: {
    postcss: {
      plugins: [tailwind(), autoprefixer()],
    },
  },
  plugins: [vue(), devNoCache],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // 本地开发：以 5173 为入口（前端 HMR，边改边测），
  // 把后端 API 请求代理到 wrangler pages dev（8788，跑 Pages Functions + D1）。
  // 用法：pnpm dev:all，浏览器打开 http://localhost:5173
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': { target: 'http://127.0.0.1:8788', changeOrigin: true },
      '/upload': { target: 'http://127.0.0.1:8788', changeOrigin: true },
      '/imgur-proxy': { target: 'http://127.0.0.1:8788', changeOrigin: true },
      '/v2': { target: 'http://127.0.0.1:8788', changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vue 核心：仅在首屏加载时必要
          'vue-vendor': ['vue', 'vue-router'],
          // UI 框架：radix-vue + tailwind 工具集，体积较大，独立分包
          'ui-vendor': ['radix-vue', '@radix-icons/vue', 'tailwindcss-animate', 'class-variance-authority', 'clsx', 'tailwind-merge'],
          // 业务工具：非首屏必需
          'utils-vendor': ['gif.js', 'qrcode.vue', 'vh-plugin'],
        },
      },
    },
  },
});
