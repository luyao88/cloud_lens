import { createRouter, createWebHistory } from 'vue-router';
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
    {
      path: '/video-to-image',
      name: 'VideoToImage',
      component: () => import('@/views/VideoToImage/VideoToImage.vue'),
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('@/views/Profile/Profile.vue'),
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('@/views/Settings/Settings.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('@/views/NotFound/NotFound.vue'),
    },
  ],
});

export default router;
