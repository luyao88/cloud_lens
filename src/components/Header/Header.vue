<template>
  <header class="header">
    <div class="header-inner">
      <div class="header-left">
        <img class="logo" src="@/assets/images/logo.png" />
        <a class="title" href="/">{{ props.title }}</a>
      </div>
      <div class="header-right">
        <span class="desc">{{ props.desc }}</span>
        <ThemeToggle />
        <a href="https://github.com/luyao88/cloud_lens" target="_blank" title="GitHub" class="social-link">
          <svg class="social-icon" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
            />
          </svg>
        </a>
      </div>
    </div>
  </header>
</template>
<script setup lang="ts">
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle.vue';

const props = defineProps(['title', 'desc']);
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

.social-link {
  color: var(--text-primary);
  opacity: 0.6;
  transition: opacity 0.2s;
}

.social-link:hover {
  opacity: 1;
}

.social-icon {
  width: 1.5rem;
  height: 1.5rem;
}
</style>
