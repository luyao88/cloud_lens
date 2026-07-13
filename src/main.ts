import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// 基础样式
import '@/assets/less/main.less'
// tailwind-base
import '@/assets/tailwind-base.css'

const app = createApp(App)

app.use(router)

app.mount('#app')
