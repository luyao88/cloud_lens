<template>
  <section class="Home">
    <!-- Hero 区域 -->
    <div class="hero">
      <div class="hero-bg"></div>
      <div class="hero-content">
        <h1 class="hero-title">镜云图床<span class="hero-subtitle">CloudLens</span></h1>
        <p class="hero-desc">免费无限图床 · 全球 CDN 加速 · 支持图片与视频</p>
        <div class="hero-stats">
          <div class="stat">
            <span class="stat-num">∞</span>
            <span class="stat-label">存储容量</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <span class="stat-num">200<span class="stat-unit">MB</span></span>
            <span class="stat-label">单文件上限</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <span class="stat-num">12<span class="stat-unit">+</span></span>
            <span class="stat-label">支持格式</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 上传区域 -->
    <Upload v-model="fileList" :UploadConfig="UploadConfig" :uploadAPI="uploadAPI" />

    <!-- 工具栏 -->
    <section v-show="fileList.length" class="toolbar">
      <div class="toolbar-left">
        <span class="file-count"
          >已上传 <strong>{{ fileList.filter((i: any) => i.upload_status === 'success').length }}</strong> / {{ fileList.length }} 个文件</span
        >
      </div>
      <div class="toolbar-right">
        <button class="btn-ghost" @click="fileList = []">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
          清空
        </button>
        <button class="btn-ghost" @click="vh.CopyText(fileList.map((i: any) => i.upload_blob).join('\n'))">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
          复制全部链接
        </button>
      </div>
    </section>

    <!-- 文件列表 -->
    <ResList v-model="fileList" :nodeHost="nodeHost" />

    <!-- 特性区域 -->
    <div class="features">
      <div class="feature-card">
        <div class="feature-icon" style="background: linear-gradient(135deg, #03b6aa, #0d9488)">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
        </div>
        <h3>无限上传</h3>
        <p>基于 Imgur API，无存储数量限制，图片视频均可上传</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon" style="background: linear-gradient(135deg, #14b8a6, #5eead4)">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </div>
        <h3>全球加速</h3>
        <p>WordPress CDN + Cloudflare 边缘缓存，全球节点极速访问</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon" style="background: linear-gradient(135deg, #0f766e, #14b8a6)">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h3>安全可靠</h3>
        <p>全程 HTTPS 加密传输，匿名上传无需登录，隐私有保障</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon" style="background: linear-gradient(135deg, #2dd4bf, #99f6e4)">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v6m0 14v-6m9-5h-6M9 12H3m15.5-7.5L14 9M10 15l-4.5 4.5M21.5 19.5 17 15M10 9 5.5 4.5" /></svg>
        </div>
        <h3>完全免费</h3>
        <p>Cloudflare Pages 托管，每日 10 万次免费请求，零成本运维</p>
      </div>
    </div>

    <!-- 开源提示 -->
    <div class="opensource-banner">
      <span>本项目完全开源</span>
      <a href="https://github.com/luyao88/cloud_lens" target="_blank">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
          />
        </svg>
        GitHub
      </a>
    </div>

    <!-- 返回顶部按钮 -->
    <Transition name="fade-slide">
      <button v-show="showBackTop" class="back-top" @click="scrollToTop">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m18 15-6-6-6 6" />
        </svg>
      </button>
    </Transition>
  </section>
</template>
<script setup lang="ts">
import vh from 'vh-plugin';
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { formatURL } from '@/utils/index';
import Upload from '@/components/Upload/Upload.vue';
import ResList from '@/components/ResList/ResList.vue';
// IPFS节点
const nodeHost = ref<string>(import.meta.env.VITE_IMG_API_URL || location.origin);
// 上传接口
const uploadAPI = ref<string>(`${import.meta.env.VITE_IMG_API_URL || location.origin}/upload`);
// 上传配置
const UploadConfig = ref<any>({
  AcceptTypes: 'image/jpeg,image/png,image/gif,image/apng,image/tiff,image/bmp,image/webp,video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska', // Imgur支持的图片和视频格式
  Max: 0, //多选个数，0为不限制
  MaxSize: 200, //单个文件大小限制，单位：MB（Imgur视频上限200MB）
});
// 上传列表
const fileList = ref<Array<any>>(JSON.parse(localStorage.getItem('zychUpImageList') || '[]'));
watch(fileList, (newVal) => {
  localStorage.setItem(
    'zychUpImageList',
    JSON.stringify(
      newVal
        .filter((i: any) => i.upload_status == 'success')
        .map((i: any) => {
          i.upload_blob = formatURL({ nodeHost: nodeHost.value }, i.upload_result);
          return i;
        }),
    ),
  );
});

// 返回顶部
const showBackTop = ref(false);
const handleScroll = () => {
  showBackTop.value = window.scrollY > 300;
};
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped lang="less">
@import 'Home.less';
</style>
