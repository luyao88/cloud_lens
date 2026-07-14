import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initTheme } from '@/utils/theme'

// 基础样式
import '@/assets/less/main.less'
// tailwind-base
import '@/assets/tailwind-base.css'
// 主题切换动画
import '@/components/ThemeToggle/ThemeToggle.less'

// 初始化主题
initTheme()

const app = createApp(App)

app.use(router)

app.mount('#app')
