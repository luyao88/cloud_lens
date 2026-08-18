<template>
  <Transition name="tray-fade">
    <div v-if="visible" class="upload-tray">
      <!-- 展开面板 -->
      <Transition name="tray-panel">
        <div v-if="expanded" class="tray-panel">
          <div class="tray-header">
            <div class="tray-title">
              <span class="tray-title-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                  <path d="M12 12v9" />
                  <path d="m8 17 4-4 4 4" />
                </svg>
              </span>
              <span class="tray-title-text">上传列表</span>
              <span class="tray-summary">{{ summaryText }}</span>
            </div>
            <div class="tray-actions">
              <button v-if="successCount || errorCount" class="tray-icon-btn" title="清除已完成" @click="clearFinished">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
              <button class="tray-icon-btn" title="收起" @click="expanded = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>

          <!-- 总进度 -->
          <div v-if="hasActive" class="tray-progress">
            <div class="tray-progress-fill" :style="{ width: overallProgress + '%' }"></div>
          </div>

          <div class="tray-list">
            <div v-for="item in items" :key="item.id" class="tray-item" :class="'is-' + item.upload_status">
              <div class="tray-thumb">
                <img v-if="item.upload_type === 'image' && item.upload_blob" :src="item.upload_blob" :alt="item.name" />
                <video v-else-if="item.upload_type === 'video' && item.upload_blob" :src="item.upload_blob" muted></video>
                <span v-else class="thumb-fallback">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                </span>
                <span v-if="item.upload_status === 'uploading'" class="thumb-spin">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                </span>
              </div>
              <div class="tray-info">
                <div class="tray-name" :title="item.name">{{ item.name }}</div>
                <div class="tray-meta">
                  <template v-if="item.upload_status === 'uploading'">
                    <div class="mini-progress">
                      <div class="mini-progress-fill" :style="{ width: item.upload_progress + '%' }"></div>
                    </div>
                    <span class="meta-pct">{{ item.upload_progress }}%</span>
                  </template>
                  <span v-else-if="item.upload_status === 'success'" class="meta-ok">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    {{ formatSize(item.size) }}
                  </span>
                  <span v-else class="meta-err" :title="item.error">{{ item.error }}</span>
                </div>
              </div>
              <div class="tray-item-actions">
                <button v-if="item.upload_status === 'success'" class="tray-icon-btn" title="复制链接" @click="copyLink(item)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                </button>
                <button v-if="item.upload_status === 'error' && item.file" class="tray-icon-btn accent" title="重试" @click="retry(item.id)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                    <path d="M21 3v6h-6" />
                  </svg>
                </button>
                <button v-if="item.upload_status === 'error'" class="tray-icon-btn" title="移除" @click="removeItem(item.id)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 悬浮球 -->
      <button class="tray-fab" :class="{ 'is-error': !hasActive && errorCount > 0 }" :title="fabTitle" @click="toggleExpanded">
        <span class="fab-ring" :style="{ background: ringBackground }"></span>
        <span class="fab-core">
          <svg v-if="hasActive" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            <path d="M12 12v9" />
            <path d="m8 17 4-4 4 4" />
          </svg>
          <svg v-else-if="errorCount > 0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <span v-if="fabBadge" class="fab-badge" :class="{ 'is-error': !hasActive && errorCount > 0 }">{{ fabBadge }}</span>
      </button>
    </div>
  </Transition>
</template>
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { formatURL } from '@/utils/index';
import { useToast } from '@/components/ui/toast/use-toast';
import { useUploadManager, type UploadItem } from '@/composables/useUploadManager';

const { toast } = useToast();
const { items, nodeHost, retry, removeItem, clearFinished, uploadingCount, errorCount, successCount, hasActive, overallProgress } =
  useUploadManager();

const expanded = ref(false);
const dismissed = ref(false);

const toggleExpanded = () => {
  expanded.value = !expanded.value;
  if (expanded.value) dismissed.value = false;
};

// 有上传任务时不自动隐藏；全部成功且未展开时 3 秒后自动收起，存在失败则保留提醒
const scheduleAutoHide = () => {
  setTimeout(() => {
    if (!hasActive.value && !expanded.value && errorCount.value === 0) dismissed.value = true;
  }, 3000);
};
watch(
  () => hasActive.value,
  (active, prev) => {
    if (active) {
      dismissed.value = false;
    } else if (prev) {
      scheduleAutoHide();
    }
  },
);
watch(expanded, (open) => {
  if (!open && !hasActive.value) scheduleAutoHide();
});

const visible = computed(() => items.length > 0 && (hasActive.value || expanded.value || !dismissed.value));

const summaryText = computed(() => {
  if (hasActive.value) return `${uploadingCount.value} 个上传中`;
  if (errorCount.value > 0) return `${successCount.value} 成功 · ${errorCount.value} 失败`;
  return `全部完成 · ${successCount.value} 个`;
});

const fabTitle = computed(() => (hasActive.value ? `正在上传 ${uploadingCount.value} 个文件（${overallProgress.value}%）` : summaryText.value));

const fabBadge = computed(() => {
  if (hasActive.value) return uploadingCount.value;
  if (errorCount.value > 0) return errorCount.value;
  return 0;
});

// conic-gradient 环形进度：上传中显示真实进度，全失败显示红色，全成功显示完整
const ringBackground = computed(() => {
  if (!hasActive.value) {
    return errorCount.value > 0
      ? 'conic-gradient(#f87171 100%, rgba(148, 163, 184, 0.25) 0)'
      : 'conic-gradient(#5eead4 100%, rgba(148, 163, 184, 0.25) 0)';
  }
  return `conic-gradient(#5eead4 ${overallProgress.value}%, rgba(255, 255, 255, 0.25) 0)`;
});

const formatSize = (size: number) => {
  if (!size) return '';
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
  return `${(size / 1024 / 1024).toFixed(2)}MB`;
};

const copyLink = async (item: UploadItem) => {
  const url = formatURL({ nodeHost }, item.upload_result);
  try {
    await navigator.clipboard.writeText(url);
    toast({ title: 'Tips', description: '链接已复制' });
  } catch {
    toast({ title: 'Tips', description: url });
  }
};
</script>
<style scoped lang="less">
@import 'UploadTray.less';
</style>
