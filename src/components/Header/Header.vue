<template>
  <header class="header">
    <div class="header-inner">
      <div class="header-left">
        <img class="logo" src="@/assets/images/logo.png" />
        <router-link class="title" to="/">{{ props.title }}</router-link>
        <router-link to="/video-to-image" class="nav-link">Video to Image</router-link>
      </div>
      <div class="header-right">
        <span class="desc">{{ props.desc }}</span>
        <ThemeToggle />
        <button class="upload-btn" @click="uploadOpen = true" title="上传文件">
          <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            <path d="M12 12v9" />
            <path d="m16 16-4-4-4 4" />
          </svg>
        </button>
        <a href="https://190223.xyz" target="_blank" title="Superma'Blog" class="blog-btn">
          <span class="blog-text">博客</span>
        </a>
        <!-- 未登录：显示登录按钮（点击弹出登录弹窗） -->
        <button v-if="!user" class="login-btn" @click="authOpen = true">
          <svg class="login-icon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1024 1024">
            <defs></defs>
            <path
              d="M521.7 82c-152.5-.4-286.7 78.5-363.4 197.7c-3.4 5.3.4 12.3 6.7 12.3h70.3c4.8 0 9.3-2.1 12.3-5.8c7-8.5 14.5-16.7 22.4-24.5c32.6-32.5 70.5-58.1 112.7-75.9c43.6-18.4 90-27.8 137.9-27.8c47.9 0 94.3 9.3 137.9 27.8c42.2 17.8 80.1 43.4 112.7 75.9c32.6 32.5 58.1 70.4 76 112.5C865.7 417.8 875 464.1 875 512c0 47.9-9.4 94.2-27.8 137.8c-17.8 42.1-43.4 80-76 112.5s-70.5 58.1-112.7 75.9A352.8 352.8 0 0 1 520.6 866c-47.9 0-94.3-9.4-137.9-27.8A353.84 353.84 0 0 1 270 762.3c-7.9-7.9-15.3-16.1-22.4-24.5c-3-3.7-7.6-5.8-12.3-5.8H165c-6.3 0-10.2 7-6.7 12.3C234.9 863.2 368.5 942 520.6 942c236.2 0 428-190.1 430.4-425.6C953.4 277.1 761.3 82.6 521.7 82zM395.02 624v-76h-314c-4.4 0-8-3.6-8-8v-56c0-4.4 3.6-8 8-8h314v-76c0-6.7 7.8-10.5 13-6.3l141.9 112a8 8 0 0 1 0 12.6l-141.9 112c-5.2 4.1-13 .4-13-6.3z"
              fill="currentColor"
            ></path>
          </svg>
          <span>登录</span>
        </button>
        <!-- 已登录：显示头像 + 下拉菜单 -->
        <div v-else class="user-menu" @click="showMenu = !showMenu" ref="menuRef">
          <img v-if="user.avatar_url" :src="user.avatar_url" :alt="user.username" class="user-avatar" />
          <div v-else class="user-avatar user-avatar-default">
            {{ (user.username || '?')[0].toUpperCase() }}
          </div>
          <Teleport to="body">
            <div v-if="showMenu" class="dropdown-backdrop" @click="showMenu = false"></div>
          </Teleport>
          <div v-if="showMenu" class="dropdown-menu" @click.stop>
            <div class="dropdown-header">
              <img v-if="user.avatar_url" :src="user.avatar_url" class="dropdown-avatar" />
              <div v-else class="dropdown-avatar dropdown-avatar-default">
                {{ (user.username || '?')[0].toUpperCase() }}
              </div>
              <div>
                <div class="dropdown-username">{{ user.username }}</div>
                <div class="dropdown-email">{{ user.email || '' }}</div>
              </div>
            </div>
            <hr />
            <router-link to="/profile" class="dropdown-item" @click="showMenu = false">我的主页</router-link>
            <a href="/api/auth/logout" class="dropdown-item">Logout</a>
          </div>
        </div>
      </div>
    </div>
    <!-- 登录弹窗 -->
    <AuthDialog v-model:open="authOpen" @success="fetchUser" @forgot="openForgot" />
    <!-- 找回密码弹窗 -->
    <ForgotPassword v-model:open="forgotOpen" />
    <!-- 上传抽屉弹窗 -->
    <Teleport to="body">
      <Transition name="upload-drawer">
        <aside v-if="uploadOpen" class="upload-drawer" @click.stop>
          <div class="upload-drawer-header">
            <span class="upload-drawer-title">上传文件</span>
            <button class="upload-drawer-close" @click="uploadOpen = false" title="关闭">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="upload-drawer-body">
            <Upload :UploadConfig="UploadConfig" />
          </div>
        </aside>
      </Transition>
      <Transition name="upload-drawer-mask">
        <div v-if="uploadOpen" class="upload-drawer-mask" @click="uploadOpen = false"></div>
      </Transition>
    </Teleport>
  </header>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle.vue';
import AuthDialog from '@/components/AuthDialog/AuthDialog.vue';
import ForgotPassword from '@/components/ForgotPassword/ForgotPassword.vue';
import Upload from '@/components/Upload/Upload.vue';

const props = defineProps(['title', 'desc']);

const user = ref<{ username: string; avatar_url: string; email: string } | null>(null);
const showMenu = ref(false);
const menuRef = ref<HTMLElement | null>(null);
const authOpen = ref(false);
const forgotOpen = ref(false);
const uploadOpen = ref(false);

// 打开找回密码弹窗
const openForgot = () => {
  forgotOpen.value = true;
};
// 上传配置（与首页一致）
const UploadConfig = ref<any>({
  AcceptTypes: 'image/jpeg,image/png,image/gif,image/apng,image/tiff,image/bmp,image/webp,video/mp4,video/webm',
  Max: 0,
  MaxSize: 100,
});

// 获取当前登录用户
const fetchUser = async () => {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.user) {
      user.value = data.user;
    }
  } catch {}
};

onMounted(async () => {
  await fetchUser();

  // 点击外部关闭下拉菜单
  document.addEventListener('click', closeMenu);
});

const closeMenu = (e: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    showMenu.value = false;
  }
};

onUnmounted(() => {
  document.removeEventListener('click', closeMenu);
});
</script>
<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 4.5rem;
  display: flex;
  justify-content: center;
  padding: 0 1rem;
  backdrop-filter: blur(12px);
  background: var(--header-bg);
  border-bottom: 1px solid var(--header-border);
  z-index: 50;
}

.header-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 1229px;
  height: 4.5rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  height: 100%;
}

.logo {
  width: auto;
  height: 40%;
  object-fit: contain;
}

.title {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.nav-link {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.nav-link:hover {
  color: #03b6aa;
  background: var(--bg-accent-light);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.desc {
  font-size: 1rem;
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .desc {
    display: none;
  }
}

/* GitHub 登录按钮 */
.login-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.875rem;
  border: none;
  border-radius: 0.5rem;
  background: #24292e;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 0.3s ease,
    box-shadow 0.3s ease,
    translate 0.3s ease;
  white-space: nowrap;
  overflow: hidden;
  position: relative;
}

.login-btn:hover {
  background: #03b6aa;
  translate: 0 -2px;
  box-shadow: 0 6px 16px rgba(3, 182, 170, 0.45);
}

.login-btn:active {
  translate: 0 0;
  box-shadow: 0 2px 6px rgba(3, 182, 170, 0.3);
}

.login-icon {
  width: 1.1rem;
  height: 1.1rem;
}

/* 用户头像 + 下拉菜单 */
.user-menu {
  position: relative;
  cursor: pointer;
}

.user-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border-base);
  transition: border-color 0.2s;
}

.user-avatar:hover {
  border-color: #03b6aa;
}

/* 邮箱注册用户无头像，显示首字母占位 */
.user-avatar-default {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #03b6aa;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  user-select: none;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 16rem;
  max-width: 20rem;
  background: var(--bg-card-solid, #fff);
  border: 1px solid var(--border-base);
  border-radius: 0.5rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  padding: 0.5rem 0;
  z-index: 100;
}

:global(html.dark) .dropdown-menu {
  background: #1f2937;
}

/* 全屏遮罩：菜单打开时拦截底部点击（z-index 低于 header 的 50，避免遮挡头像点击） */
.dropdown-backdrop {
  position: fixed;
  inset: 0;
  z-index: 49;
  background: transparent;
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
}

.dropdown-avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
}

.dropdown-avatar-default {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #03b6aa;
  color: #fff;
  font-size: 1.125rem;
  font-weight: 600;
  user-select: none;
}

.dropdown-username {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 11rem;
}

.dropdown-email {
  font-size: 0.75rem;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 11rem;
}

.dropdown-menu hr {
  border: none;
  border-top: 1px solid var(--border-base);
  margin: 0.5rem 0;
}

.dropdown-item {
  display: block;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: var(--bg-card-hover);
  color: #03b6aa;
}

/* 博客按钮：颜色逻辑与主题按钮、上传按钮完全一致 */
.blog-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: rgba(115, 189, 183, 0.384);
  color: #111111;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition:
    background-color 0.3s ease,
    transform 0.7s ease,
    color 0.3s ease;
}

.blog-btn:hover {
  background: #028a82;
  color: white;
  transform: rotate(360deg);
}

.blog-text {
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
  user-select: none;
}

:global(html.dark .blog-btn) {
  background: rgba(3, 182, 170, 0.3);
  color: #fff !important;
}

:global(html.dark .blog-btn:hover) {
  background: #028a82;
  color: #111111 !important;
}

/* 上传按钮 */
.upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: rgba(115, 189, 183, 0.384);
  color: #111111;
  border: none;
  cursor: pointer;
  transition:
    background-color 0.3s ease,
    transform 0.3s ease,
    color 0.3s ease;
}

.upload-btn:hover {
  background: #028a82;
  color: white;
  transform: translateY(-2px);
}

.upload-btn:active {
  transform: scale(0.97);
}

.upload-icon {
  width: 1.1rem;
  height: 1.1rem;
}

:global(html.dark .upload-btn) {
  background: rgba(3, 182, 170, 0.3);
  color: #fff !important;
}

:global(html.dark .upload-btn:hover) {
  background: #028a82;
  color: #111111 !important;
}

/* 上传抽屉弹窗 */
.upload-drawer {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 24rem;
  max-width: 90vw;
  background: var(--bg-card-solid, #fff);
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.15);
  z-index: 200;
  display: flex;
  flex-direction: column;
}

:global(html.dark) .upload-drawer {
  background: #1f2937;
}

.upload-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-base);
  white-space: nowrap;
}

.upload-drawer-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.upload-drawer-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

.upload-drawer-close svg {
  width: 1.1rem;
  height: 1.1rem;
}

.upload-drawer-close:hover {
  background: var(--bg-accent-light);
  color: #03b6aa;
}

.upload-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 1.25rem;
}

.upload-drawer-body :deep(.Upload) {
  margin: 1rem 0;
}

.upload-drawer-mask {
  position: fixed;
  inset: 0;
  z-index: 199;
  background: rgba(0, 0, 0, 0.4);
}

/* 抽屉滑入动画 */
.upload-drawer-enter-active,
.upload-drawer-leave-active {
  transition: transform 0.3s ease;
}

.upload-drawer-enter-from,
.upload-drawer-leave-to {
  transform: translateX(100%);
}

.upload-drawer-mask-enter-active,
.upload-drawer-mask-leave-active {
  transition: opacity 0.3s ease;
}

.upload-drawer-mask-enter-from,
.upload-drawer-mask-leave-to {
  opacity: 0;
}
</style>
