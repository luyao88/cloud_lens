<template>
  <button class="theme-toggle-btn" @click="handleToggle" :title="isDark ? '切换亮色模式' : '切换暗色模式'">
    <!-- 太阳图标（亮色模式显示） -->
    <svg v-show="!isDark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="theme-icon">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
    <!-- 月亮图标（暗色模式显示） -->
    <svg v-show="isDark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="theme-icon">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  </button>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { toggleTheme, getPreferredTheme } from '@/utils/theme';

const isDark = ref(false);

const handleToggle = (event: MouseEvent) => {
  const x = event.clientX;
  const y = event.clientY;
  const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  document.documentElement.style.setProperty('--x', x + 'px');
  document.documentElement.style.setProperty('--y', y + 'px');
  document.documentElement.style.setProperty('--r', endRadius + 'px');
  if ((document as any).startViewTransition) {
    (document as any).startViewTransition(() => {
      isDark.value = toggleTheme() === 'dark';
    });
  } else {
    isDark.value = toggleTheme() === 'dark';
  }
};

const handleThemeChange = () => {
  isDark.value = document.documentElement.classList.contains('dark');
};

onMounted(() => {
  isDark.value = getPreferredTheme() === 'dark';
  window.addEventListener('themechange', handleThemeChange);
});
onUnmounted(() => {
  window.removeEventListener('themechange', handleThemeChange);
});
</script>
<style scoped>
.theme-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: rgba(115, 189, 183, 0.384);
  border: none;
  cursor: pointer;
  color: #111111;
  transition:
    background-color 0.3s ease,
    transform 0.3s ease,
    color 0.3s ease;
}

.theme-toggle-btn:hover {
  background: #03b6aa;
  color: white;
  transform: rotate(15deg);
}

.theme-icon {
  width: 1.25rem;
  height: 1.25rem;
}

:global(html.dark) .theme-toggle-btn {
  background: rgba(255, 255, 255, 0.15);
  color: #ff0000;
}

:global(html.dark) .theme-toggle-btn:hover {
  background: #03b6aa;
  color: white;
}
</style>
