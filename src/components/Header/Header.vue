<template>
  <header class="header">
    <div class="header-inner">
      <div class="header-left">
        <img class="logo" src="@/assets/images/logo.png" />
        <a class="title" href="/">{{ props.title }}</a>
        <router-link to="/video-to-image" class="nav-link">Video to Image</router-link>
      </div>
      <div class="header-right">
        <span class="desc">{{ props.desc }}</span>
        <ThemeToggle />
        <!-- 未登录：显示登录按钮（点击弹出登录弹窗） -->
        <button v-if="!user" class="login-btn" @click="authOpen = true">
          <svg class="login-icon" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
            />
          </svg>
          <span>Login</span>
        </button>
        <!-- 已登录：显示头像 + 下拉菜单 -->
        <div v-else class="user-menu" @click="showMenu = !showMenu" ref="menuRef">
          <img
            v-if="user.avatar_url"
            :src="user.avatar_url"
            :alt="user.username"
            class="user-avatar"
          />
          <div v-else class="user-avatar user-avatar-default">
            {{ (user.username || '?')[0].toUpperCase() }}
          </div>
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
            <a href="/api/auth/logout" class="dropdown-item">Logout</a>
          </div>
        </div>
        <a href="https://190223.xyz" target="_blank" title="Superma'Blog" class="social-link">
          <svg class="social-icon" viewBox="0 0 1024 1024" fill="currentColor">
            <path
              d="M1017.771 511.331c0 280.666-227.523 508.191-508.191 508.191s-508.19-227.525-508.19-508.191c0-280.665 227.523-508.19 508.191-508.19s508.19 227.523 508.19 508.19zM191.726 479.984h26.423v188.788h40.113v-188.788h23.558v-37.567h-23.558v-84.048h-40.113v84.048h-26.423v37.567zM274.182 598.096h46.958l-17.669 18.465c15.493 11.884 29.502 23.241 42.023 34.065l25.787-28.334c-10.932-8.701-21.703-16.766-32.314-24.195h92.165v16.555c0 4.882-1.221 9.022-3.662 12.417-2.443 3.395-8.332 5.093-17.669 5.093-8.703 0-21.437-0.532-38.205-1.591 4.88 16.766 8.063 29.393 9.551 37.885 31.622 0 51.998-1.036 61.126-3.104 9.126-2.068 16.023-6.475 20.692-13.212 4.669-6.74 7.004-15.734 7.004-26.981v-27.061h36.929v-31.2h-36.929v-12.417h20.375v-126.389h-81.5v-15.281h94.871v-31.2h-25.15c-7.217-9.973-14.326-19.314-21.33-28.017l-28.334 14.007 10.029 14.007h-30.085v-25.151h-37.567v25.151h-91.687v31.2h91.687v15.281h-78.636v128.3h38.205v-16.236h40.432v14.964h37.567v-14.964h43.298v9.551h-21.012v17.191h-156.951v31.2zM330.85 456.107h40.432v16.555h-40.432v-16.555zM330.85 498.13h40.432v16.555h-40.432v-16.555zM452.146 472.662h-43.298v-16.555h43.298v16.555zM408.85 498.13h43.298v16.555h-43.298v-16.555zM605.279 670.683v-15.281h139.442v15.281h43.298v-109.039c9.443 1.591 19.205 3.131 29.289 4.615l15.919-39.158c-42.449-2.547-79.008-7.323-109.675-14.326 23.241-12.838 42.819-27.697 58.738-44.571v-10.188h38.205v-75.771h-113.179c-3.715-11.247-7.059-20.692-10.029-28.334l-54.441 5.411 9.87 22.923h-123.526v75.771h43.616v-39.796h204.069v19.739h-119.068c3.82-4.14 7.427-8.382 10.825-12.735h-49.346c-22.711 23.558-52.107 43.086-88.186 58.579 8.063 8.703 16.023 18.465 23.877 29.289 15.068-7.642 29.076-15.703 42.023-24.195 9.973 9.129 20.587 17.139 31.836 24.036-30.563 7.537-68.026 14.062-112.382 19.579 5.731 11.461 11.037 23.666 15.919 36.611 10.188-1.696 20.057-3.447 29.609-5.253v106.81h43.296zM774.487 559.257h-190.062c35.339-7.534 65.687-15.81 91.052-24.832 27.061 9.445 60.063 17.725 99.010 24.832zM744.721 619.108h-139.442v-23.558h139.442v23.558zM628.359 470.433h96.305c-14.54 11.249-30.777 20.534-48.709 27.857-17.723-7.323-33.586-16.607-47.596-27.857z"
            />
          </svg>
        </a>
      </div>
    </div>
    <!-- 登录弹窗 -->
    <AuthDialog v-model:open="authOpen" @success="fetchUser" />
  </header>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle.vue';
import AuthDialog from '@/components/AuthDialog/AuthDialog.vue';

const props = defineProps(['title', 'desc']);

const user = ref<{ username: string; avatar_url: string; email: string } | null>(null);
const showMenu = ref(false);
const menuRef = ref<HTMLElement | null>(null);
const authOpen = ref(false);

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
  font-size: 1.125rem;
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
  transition: background 0.2s;
}

.login-btn:hover {
  background: #2f363d;
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
  min-width: 12rem;
  background: var(--bg-card);
  border: 1px solid var(--border-base);
  border-radius: 0.5rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 0.5rem 0;
  z-index: 100;
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
}

.dropdown-email {
  font-size: 0.75rem;
  color: var(--text-muted);
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

.social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: rgba(143, 143, 143, 0.15);
  color: var(--text-primary);
  transition:
    background-color 0.3s ease,
    transform 0.3s ease,
    color 0.3s ease;
}

.social-link:hover {
  background: #03b6aa;
  color: white;
  transform: rotate(15deg);
}

.social-icon {
  width: 2.4rem;
  height: 2.4rem;
}

:global(html.dark) .social-link {
  background: rgba(255, 255, 255, 0.15);
  color: #f0f0f0;
}

:global(html.dark) .social-link:hover {
  background: #03b6aa;
  color: white;
}
</style>
