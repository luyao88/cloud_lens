<template>
  <section class="Home">
    <!-- Hero 区域 -->
    <div class="hero">
      <div class="hero-bg">
        <span class="hero-blob blob-a"></span>
        <span class="hero-blob blob-b"></span>
        <span class="hero-bubble b1"></span>
        <span class="hero-bubble b2"></span>
        <span class="hero-bubble b3"></span>
        <span class="hero-bubble b4"></span>
      </div>
      <div class="hero-content">
        <h1 class="hero-title">把每一张图，<em>轻盈</em>放上云端</h1>
        <p class="hero-desc">镜云图床 CloudLens — 免费无限存储 · 全球 CDN 加速 · 图片视频皆可托管</p>
        <div class="hero-stats">
          <div class="stat">
            <span class="stat-num">∞</span>
            <span class="stat-label">存储容量</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <span class="stat-num">100<span class="stat-unit">MB</span></span>
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
    <Upload :UploadConfig="UploadConfig" />

    <!-- 工具栏 -->
    <section v-show="items.length" class="toolbar">
      <div class="toolbar-left">
        <span class="file-count"
          >已上传 <strong>{{ items.filter((i: any) => i.upload_status === 'success').length }}</strong> / {{ items.length }} 个文件</span
        >
      </div>
      <div class="toolbar-right">
        <button class="btn-ghost" @click="setItems([])">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
          清空
        </button>
        <button class="btn-ghost" @click="copyAllLinks">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
          复制全部链接 ({{ items.filter((i: any) => i.upload_status === 'success').length }})
        </button>
      </div>
    </section>

    <!-- 文件列表 -->
    <ResList :modelValue="items" @update:modelValue="setItems" :nodeHost="nodeHost" />

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
  </section>
</template>
<script setup lang="ts">
defineOptions({ name: 'Home' });
import vh from 'vh-plugin';
import { formatURL } from '@/utils/index';
import { useToast } from '@/components/ui/toast/use-toast';
import { ref } from 'vue';
import Upload from '@/components/Upload/Upload.vue';
import ResList from '@/components/ResList/ResList.vue';
import { useUploadManager } from '@/composables/useUploadManager';
// 上传队列由全局管理器维护：切页不中断，进度在右下角悬浮托盘展示
const { toast } = useToast();
const { items, setItems, nodeHost } = useUploadManager();

// 复制全部成功上传文件的对外代理链接（/v2/xxx），不要复制本地 blob 预览地址
const copyAllLinks = async () => {
  const urls: string[] = [];
  for (const i of items) {
    const it = i as any;
    if (it.upload_status !== 'success' || !it.upload_result) continue;
    const u = formatURL({ nodeHost }, it.upload_result);
    if (u && !u.includes('上传失败')) urls.push(u);
  }
  if (!urls.length) {
    toast({ title: 'Tips', description: '暂无可复制的链接' });
    return;
  }
  let ok = false;
  try {
    await navigator.clipboard.writeText(urls.join('\n'));
    ok = true;
  } catch {
    const t = document.createElement('textarea');
    t.value = urls.join('\n');
    document.body.appendChild(t);
    t.select();
    ok = document.execCommand('copy');
    document.body.removeChild(t);
  }
  if (ok) toast({ title: 'Tips', description: `已复制 ${urls.length} 条链接` });
  else toast({ title: 'Tips', description: urls.join('\n') });
};
// 上传配置
const UploadConfig = ref<any>({
  AcceptTypes: 'image/jpeg,image/png,image/gif,image/apng,image/tiff,image/bmp,image/webp,video/mp4,video/webm', // Imgur匿名上传实际支持的格式（MOV/AVI/MKV会被Imgur拒绝）
  Max: 100, //单次/累计最多 100 张，超过会被自动过滤
  MaxSize: 100, //单个文件大小限制，单位：MB（Cloudflare 免费版请求体上限 100MB，超过会被 413 拒绝）
});
</script>

<style scoped lang="less">
@import 'Home.less';
</style>
