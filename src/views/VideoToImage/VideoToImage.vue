<template>
  <section class="video-to-image">
    <!-- Hero 区域 -->
    <div class="tool-hero">
      <div class="tool-hero-bg"></div>
      <div class="tool-hero-content">
        <h1>Video to Image<span class="hero-subtitle">视频转图片</span></h1>
        <p>将视频转换为 GIF 动图或静态图片帧 · 支持 WebP / JPEG / GIF</p>
      </div>
    </div>

    <!-- 文件上传区 -->
    <div class="file-input-area">
      <input type="file" accept="video/mp4,video/webm" @change="handleFileChange" />
      <div class="placeholder">
        <div class="upload-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m22 8-6 4 6 4V8Z" />
            <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
          </svg>
        </div>
        <p>
          <span class="upload-title">点击选择视频文件</span>
          <span class="upload-hint">支持 MP4 / WebM · 可转换为 GIF 或静态图片</span>
        </p>
      </div>
    </div>

    <!-- 视频预览 -->
    <div v-if="videoUrl" class="video-preview">
      <video :ref="setVideoRef" :src="videoUrl" controls crossorigin="anonymous" @loadedmetadata="handleLoadedMetadata" @timeupdate="handleTimeUpdate"></video>
    </div>

    <!-- 时间轴 -->
    <div v-if="videoUrl" class="timeline">
      <div class="timeline-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        时间轴
      </div>

      <!-- 当前时间（用于截取静态帧） -->
      <div class="timeline-row">
        <div class="timeline-label">
          <span class="label-text">当前时间</span>
          <span class="label-value">{{ formatTime(currentTime) }} / {{ formatTime(videoDuration) }}</span>
        </div>
        <input type="range" min="0" :max="videoDuration" step="0.01" :value="currentTime" @input="seekTo" />
      </div>

      <!-- GIF 起止时间 -->
      <template v-if="format === 'gif'">
        <div class="timeline-row">
          <div class="timeline-label">
            <span class="label-text">起始时间</span>
            <span class="label-value">{{ formatTime(startTime) }}</span>
          </div>
          <input type="range" min="0" :max="videoDuration" step="0.1" v-model.number="startTime" />
        </div>
        <div class="timeline-row">
          <div class="timeline-label">
            <span class="label-text">结束时间</span>
            <span class="label-value">{{ formatTime(endTime) }} ({{ (endTime - startTime).toFixed(1) }}s)</span>
          </div>
          <input type="range" :min="startTime" :max="videoDuration" step="0.1" v-model.number="endTime" />
        </div>
      </template>
    </div>

    <!-- 设置面板 -->
    <div v-if="videoUrl" class="settings-panel">
      <div class="settings-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path
            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
          />
          <circle cx="12" cy="12" r="3" />
        </svg>
        输出设置
      </div>

      <div class="settings-grid">
        <!-- 格式选择 -->
        <div class="setting-item full-width">
          <div class="setting-label">
            <span class="label-text">输出格式</span>
          </div>
          <div class="format-group">
            <button class="format-btn" :class="{ active: format === 'gif' }" @click="format = 'gif'">GIF 动图</button>
            <button class="format-btn" :class="{ active: format === 'webp' }" @click="format = 'webp'">WebP</button>
            <button class="format-btn" :class="{ active: format === 'jpeg' }" @click="format = 'jpeg'">JPEG</button>
          </div>
        </div>

        <!-- FPS（仅 GIF） -->
        <div v-if="format === 'gif'" class="setting-item">
          <div class="setting-label">
            <span class="label-text">帧率 FPS</span>
            <span class="label-value">{{ fps }} fps</span>
          </div>
          <input type="range" min="5" max="15" step="1" v-model.number="fps" />
        </div>

        <!-- 最大宽度 -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="label-text">最大宽度</span>
            <span class="label-value">{{ maxWidth }}px</span>
          </div>
          <input type="range" min="120" max="1280" step="20" v-model.number="maxWidth" />
        </div>

        <!-- 质量 -->
        <div class="setting-item">
          <div class="setting-label">
            <span class="label-text">图片质量</span>
            <span class="label-value">{{ Math.round(quality * 100) }}%</span>
          </div>
          <input type="range" min="0.1" max="1" step="0.05" v-model.number="quality" />
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div v-if="videoUrl" class="actions">
      <button v-if="format !== 'gif'" class="btn-primary" @click="captureFrame">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
        截取当前帧
      </button>
      <button v-else class="btn-primary" :disabled="isGenerating" @click="generateGIF">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        生成 GIF
      </button>
      <button class="btn-ghost" @click="clearAll">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        清空结果
      </button>
    </div>

    <!-- 进度条 -->
    <div v-if="isGenerating" class="progress-bar">
      <div class="progress-header">
        <span class="progress-text">正在生成 GIF...</span>
        <span class="progress-percent">{{ progress }}%</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
    </div>

    <!-- 结果画廊 -->
    <div v-if="results.length" class="results">
      <div class="results-header">
        <div class="results-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          生成结果
        </div>
        <span class="results-count">共 {{ results.length }} 个</span>
      </div>
      <div class="results-grid">
        <div v-for="result in results" :key="result.name" class="result-card">
          <div class="result-thumb">
            <img :src="result.url" :alt="result.name" />
            <span class="result-badge">{{ result.type }}</span>
          </div>
          <div class="result-info">
            <div class="result-name">{{ result.name }}</div>
            <div class="result-size">{{ result.size }}</div>
          </div>
          <div class="result-actions">
            <button class="btn-download" @click="download(result)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              下载
            </button>
            <button class="btn-upload" @click="uploadToImgur(result)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
              上传
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { useToast } from '@/components/ui/toast/use-toast';
const { toast } = useToast();

const videoFile = ref<File | null>(null);
const videoUrl = ref<string>('');
const videoDuration = ref(0);
const currentTime = ref(0);
const startTime = ref(0);
const endTime = ref(0);
const format = ref<'gif' | 'webp' | 'jpeg'>('gif');
const fps = ref(10);
const maxWidth = ref(480);
const quality = ref(0.8);
const isGenerating = ref(false);
const progress = ref(0);
const results = ref<Array<{ url: string; type: string; size: string; name: string }>>([]);

let videoElement: HTMLVideoElement | null = null;
let gifInstance: any = null;

// 视频元素 ref 绑定
const setVideoRef = (el: Element | { $el?: Element } | null) => {
  if (el && el instanceof HTMLVideoElement) {
    videoElement = el;
  }
};

// 加载视频
const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('video/')) {
    toast({ title: 'Error', description: 'Please select a video file' });
    return;
  }
  videoFile.value = file;
  videoUrl.value = URL.createObjectURL(file);
  // 重置时间
  startTime.value = 0;
  endTime.value = 0;
  currentTime.value = 0;
  results.value = [];
};

// 视频元数据加载完成
const handleLoadedMetadata = () => {
  if (videoElement) {
    videoDuration.value = videoElement.duration;
    endTime.value = Math.min(videoElement.duration, 10); // 默认截取前10秒
  }
};

// 当前时间更新（用于显示）
const handleTimeUpdate = () => {
  if (videoElement) currentTime.value = videoElement.currentTime;
};

// 跳转视频时间
const seekTo = (e: Event) => {
  const target = e.target as HTMLInputElement;
  currentTime.value = parseFloat(target.value);
  if (videoElement) videoElement.currentTime = currentTime.value;
};

// 截取当前帧（静态图片）
const captureFrame = () => {
  if (!videoElement) return;
  const canvas = document.createElement('canvas');
  const ratio = videoElement.videoHeight / videoElement.videoWidth;
  const width = Math.min(videoElement.videoWidth, maxWidth.value);
  const height = Math.round(width * ratio);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(videoElement, 0, 0, width, height);

  const mimeType = format.value === 'webp' ? 'image/webp' : 'image/jpeg';
  const ext = format.value === 'webp' ? 'webp' : 'jpg';
  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const size = (blob.size / 1024).toFixed(1) + 'KB';
      results.value.unshift({
        url,
        type: ext.toUpperCase(),
        size,
        name: `frame_${Date.now()}.${ext}`,
      });
      toast({ title: 'Success', description: `Captured ${ext.toUpperCase()} frame` });
    },
    mimeType,
    quality.value,
  );
};

// 生成GIF
const generateGIF = () => {
  if (!videoElement) return;
  if (endTime.value <= startTime.value) {
    toast({ title: 'Error', description: 'End time must be greater than start time' });
    return;
  }
  isGenerating.value = true;
  progress.value = 0;

  // 动态导入 gif.js
  import('gif.js').then((module) => {
    const GIF = module.default;
    const canvas = document.createElement('canvas');
    const ratio = videoElement!.videoHeight / videoElement!.videoWidth;
    const width = Math.min(videoElement!.videoWidth, maxWidth.value);
    const height = Math.round(width * ratio);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    gifInstance = new GIF({
      workers: 2,
      quality: 10,
      width,
      height,
      workerScript: '/gif.worker.js',
    });

    const duration = endTime.value - startTime.value;
    const totalFrames = Math.floor(duration * fps.value);
    let frameCount = 0;

    const captureFrame = (time: number) => {
      return new Promise<void>((resolve) => {
        const onSeeked = () => {
          ctx!.drawImage(videoElement!, 0, 0, width, height);
          gifInstance!.addFrame(ctx!, { copy: true, delay: 1000 / fps.value });
          videoElement!.removeEventListener('seeked', onSeeked);
          resolve();
        };
        videoElement!.addEventListener('seeked', onSeeked);
        videoElement!.currentTime = Math.min(time, videoElement!.duration - 0.01);
      });
    };

    const processFrames = async () => {
      for (let i = 0; i < totalFrames; i++) {
        const time = startTime.value + i / fps.value;
        if (time >= videoElement!.duration) break;
        await captureFrame(time);
        frameCount++;
        progress.value = Math.round((frameCount / totalFrames) * 50);
      }

      gifInstance!.on('progress', (p: number) => {
        progress.value = 50 + Math.round(p * 50);
      });

      gifInstance!.on('finished', (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const size = (blob.size / 1024 / 1024).toFixed(2) + 'MB';
        results.value.unshift({
          url,
          type: 'GIF',
          size,
          name: `gif_${Date.now()}.gif`,
        });
        isGenerating.value = false;
        progress.value = 100;
        toast({ title: 'Success', description: 'GIF generated successfully' });
      });

      gifInstance!.render();
    };

    processFrames();
  });
};

// 上传到Imgur
const uploadToImgur = async (result: { url: string; name: string }) => {
  try {
    toast({ title: 'Uploading', description: 'Uploading to Imgur...' });
    const blob = await fetch(result.url).then((r) => r.blob());
    const formData = new FormData();
    formData.append('file', blob, result.name);
    const res = await fetch('/upload', {
      method: 'POST',
      body: formData,
    });
    const json = await res.json();
    if (json.data && json.data.link) {
      const imgurUrl = json.data.link;
      await navigator.clipboard.writeText(imgurUrl);
      toast({ title: 'Success', description: 'Uploaded & URL copied' });
    }
  } catch (err) {
    toast({ title: 'Error', description: 'Upload failed' });
  }
};

// 下载
const download = (result: { url: string; name: string }) => {
  const a = document.createElement('a');
  a.href = result.url;
  a.download = result.name;
  a.click();
};

// 清空
const clearAll = () => {
  results.value = [];
};

// 格式化时间
const formatTime = (s: number) => {
  const min = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

onUnmounted(() => {
  if (videoUrl.value) URL.revokeObjectURL(videoUrl.value);
  if (gifInstance) gifInstance.abort();
});
</script>
<style scoped lang="less">
@import 'VideoToImage.less';
</style>
