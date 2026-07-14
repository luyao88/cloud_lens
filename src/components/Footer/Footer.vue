<template>
  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-left">
        <span class="footer-title">镜云图床 CloudLens</span>
        <span class="footer-desc">支持图片和视频托管，全球CDN加速</span>
        <div class="footer-links">
          <router-link to="/legal?type=privacy" class="footer-link">隐私协议</router-link>
          <router-link to="/legal?type=terms" class="footer-link">服务条款</router-link>
        </div>
      </div>
      <div class="footer-right">
        <a href="https://github.com/luyao88/cloud_lens" target="_blank" title="GitHub" class="social-link">
          <svg class="social-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" /></svg>
        </a>
        <a href="https://190223.xyz" target="_blank" title="Blog" class="social-link">
          <svg class="social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
        </a>
        <a href="/reward.jpg" target="_blank" title="打赏" class="social-link">
          <svg class="social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
        </a>
      </div>
    </div>
  </footer>
</template>
<script setup lang="ts">
</script>
<style scoped>
.footer {
  width: 100%;
  max-width: 1229px;
  margin-top: 2rem;
  padding-bottom: 1rem;
}

.footer-inner {
  border-top: 1px solid var(--header-border);
  padding-top: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

@media (min-width: 768px) {
  .footer-inner {
    flex-direction: row;
  }
}

.footer-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

@media (min-width: 768px) {
  .footer-left {
    align-items: flex-start;
  }
}

.footer-title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
}

.footer-desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.25rem;
}

.footer-link {
  font-size: 0.875rem;
  color: #0d9488;
  transition: color 0.2s;
}

.footer-link:hover {
  color: #03b6aa;
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 1.25rem;
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
