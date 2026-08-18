import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

import autoprefixer from 'autoprefixer'
import tailwind from 'tailwindcss'

// https://vite.dev/config/
export default defineConfig({
  css: {
    postcss: {
      plugins: [tailwind(), autoprefixer()],
    },
  },
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: { host: '0.0.0.0' },
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
})
