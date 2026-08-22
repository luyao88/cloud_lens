<template>
  <Transition name="splash-fade">
    <div v-if="visible" class="splash-mask">
      <div class="splash-content">
        <div class="splash-brand">
          <img class="splash-logo" src="@/assets/images/logo.png" alt="CloudLens Logo" />
          <span class="splash-name">CloudLens</span>
        </div>
        <div class="splash-bar-wrap">
          <div class="splash-bar"></div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const visible = ref(true);
const progress = ref(0);

let progressTimer: number | null = null;
let hideTimer: number | null = null;
const MIN_DISPLAY = 2000; // 最小显示时间 ms

const finishLoad = () => {
  // 进度补满
  progress.value = 100;
  const elapsed = performance.now() - startTime;
  const remaining = Math.max(0, MIN_DISPLAY - elapsed);
  hideTimer = window.setTimeout(() => {
    visible.value = false;
  }, remaining + 200);
};

let startTime = 0;

onMounted(() => {
  startTime = performance.now();
  // 模拟进度增长（慢速，配合 2s 最低显示）
  progressTimer = window.setInterval(() => {
    if (progress.value < 85) {
      progress.value += Math.random() * 5 + 1.5;
    }
  }, 180);

  // 所有资源加载完成
  if (document.readyState === 'complete') {
    finishLoad();
  } else {
    window.addEventListener('load', finishLoad);
  }
});

onUnmounted(() => {
  if (progressTimer) clearInterval(progressTimer);
  if (hideTimer) clearTimeout(hideTimer);
  window.removeEventListener('load', finishLoad);
});
</script>

<style scoped>
:global(body:has(.splash-mask)) {
  overflow: hidden;
}

.splash-mask {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: linear-gradient(180deg, #faf9f5 0%, #f6f5f0 30%, #f3f2ec 100%);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
}

html.dark .splash-mask {
  background: linear-gradient(180deg, #161513 0%, #121110 30%, #0e0d0c 100%);
}

.splash-content {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.875rem;
}

.splash-brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.splash-logo {
  width: 2.75rem;
  height: 2.75rem;
  object-fit: contain;
  user-select: none;
  mix-blend-mode: multiply;
}

.splash-name {
  font-family: var(--font-serif, serif);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary, #2b2723);
  letter-spacing: 0.06em;
  white-space: nowrap;
}

html.dark .splash-logo {
  mix-blend-mode: screen;
}

.splash-bar-wrap {
  width: 100%;
  height: 2px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 999px;
  overflow: hidden;
  position: relative;
}

html.dark .splash-bar-wrap {
  background: rgba(255, 255, 255, 0.12);
}

.splash-bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 35%;
  border-radius: 999px;
  background: linear-gradient(90deg, #03b6aa, #2dd4bf);
  animation: bar-loop 1s ease-in-out infinite;
}

@keyframes bar-loop {
  0% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(280%);
  }
  100% {
    transform: translateX(0);
  }
}

/* 淡出动画 */
.splash-fade-leave-active {
  transition:
    opacity 0.45s ease,
    transform 0.45s ease;
}
.splash-fade-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
