import { createRouter, createWebHistory } from 'vue-router'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('@/views/Home/Home.vue'),
    },
    {
      path: '/legal',
      name: 'Legal',
      component: () => import('@/views/Legal/Legal.vue'),
    },
  ],
})

export default router
