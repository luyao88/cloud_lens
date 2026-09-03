<template>
  <section class="ResList">
    <!-- 暂存模式：待上传批量操作条 -->
    <div v-if="pendingCount > 0" class="staged-bar">
      <span class="staged-bar-text">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 13v8" />
          <path d="m8 17 4-4 4 4" />
          <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
        </svg>
        {{ pendingCount }} 个文件待上传
      </span>
      <button class="staged-upload-all" @click="startPending()">上传全部（{{ pendingCount }}）</button>
    </div>
    <div class="item" v-for="(i, idx) in props.modelValue" :key="idx">
      <!-- 缩略图：图片 / 视频；待上传态直接展示本地预览 -->
      <div class="thumb-wrapper" @click="i.upload_blob && openPreview(i)">
        <img v-if="i.upload_type === 'image' || (!i.upload_type && i.upload_blob)" class="thumb" :src="(i.upload_result || i.upload_status === 'pending') ? i.upload_blob : LoadingImg" />
        <video v-else-if="i.upload_type === 'video'" class="thumb" :src="i.upload_blob" muted></video>
        <img v-else class="thumb" :src="LoadingImg" />
      </div>
      <div class="value" :class="{ active: !i.upload_result && i.upload_status !== 'pending' }">
        <!-- 暂存态：待上传，提供单条上传触发 -->
        <div v-if="i.upload_status === 'pending'" class="pending-box">
          <span class="pending-badge">待上传</span>
          <span class="pending-name" :title="i.name">{{ i.name }}</span>
          <button class="pending-upload" @click="startItem(i.id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 13v8" />
              <path d="m8 17 4-4 4 4" />
              <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
            </svg>
            上传
          </button>
        </div>
        <template v-else>
          <p><input :value="i.upload_result ? formatURL(props, i.upload_result) : ''" type="text" readonly @click="i.upload_result && copyCodeValue(formatURL(props, i.upload_result))" /> <span>URL</span></p>
          <p><input :value="i.upload_result ? formatURL(props, i.upload_result, 'md') : ''" type="text" readonly @click="i.upload_result && copyCodeValue(formatURL(props, i.upload_result, 'md'))" /> <span>Markdown</span></p>
          <p><input :value="i.upload_result ? formatURL(props, i.upload_result, 'html') : ''" type="text" readonly @click="i.upload_result && copyCodeValue(formatURL(props, i.upload_result, 'html'))" /> <span>HTML</span></p>
          <!-- 单图相册选择器：上传成功且已保存到数据库时显示 -->
          <div v-if="i.upload_result && i.db_image_id" class="album-picker">
            <svg class="picker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            <select class="picker-select" :value="i.saved_album_id === null ? 'none' : String(i.saved_album_id)" @change="onItemAlbumChange(i, $event)" title="选择相册">
              <option value="none">未分组</option>
              <option v-for="opt in albumTreeOptions" :key="opt.id" :value="String(opt.id)">{{ opt.label }}</option>
            </select>
          </div>
        </template>
      </div>
      <HoverCard v-if="i.upload_result" :open-delay="0" :close-delay="0">
        <HoverCardTrigger as-child>
          <QrcodeVue class="qrcode" :value="formatURL(props, i.upload_result)" :size="56" level="H" />
        </HoverCardTrigger>
        <HoverCardContent class="w-max h-max"><QrcodeVue class="qrcode scale" :value="formatURL(props, i.upload_result)" :size="666" level="H" /></HoverCardContent>
      </HoverCard>
      <!-- 删除按钮 -->
      <button class="btn-delete" @click="deleteItem(idx)" title="删除">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      </button>
    </div>
  </section>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import QrcodeVue from 'qrcode.vue';
import { formatURL } from '@/utils/index';
import { useToast } from '@/components/ui/toast/use-toast';
const { toast } = useToast();
import LoadingImg from '@/assets/images/loading.gif';
import { useUploadManager } from '@/composables/useUploadManager';
const { albumTreeOptions, changeItemAlbum, startItem, startPending, pendingCount } = useUploadManager();
const props = defineProps(['modelValue', 'nodeHost']);
const emits = defineEmits(['update:modelValue']);
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

// 单图相册变更
const onItemAlbumChange = (item: any, e: Event) => {
  const v = (e.target as HTMLSelectElement).value;
  const albumId = v === 'none' ? null : Number(v);
  changeItemAlbum(item, albumId);
};

// ViewImage 图片+视频预览
declare const ViewImage: any;
const loadViewImage = () => {
  return new Promise<void>((resolve) => {
    if ((window as any).ViewImage) return resolve();
    const s = document.createElement('script');
    s.src = '/view-image.min.js';
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
};

// 直接调用 ViewImage 预览，跳过其 click 监听器的 DOM 查找
const openPreview = async (clickedItem: any) => {
  await loadViewImage();
  // 收集所有可预览的文件
  const items = (props.modelValue || []).filter((i: any) => i.upload_blob && i.upload_result);
  if (items.length === 0) return;
  const urls = items.map((i: any) => i.upload_blob);
  const clickedUrl = clickedItem.upload_blob;
  // 构造 mock items，让 ViewImage 能通过 tagName 判断视频
  const mockItems = items.map((i: any) => ({
    tagName: i.upload_type === 'video' ? 'VIDEO' : 'IMG',
    src: i.upload_blob,
    href: i.upload_blob,
  }));
  const isCurrentVideo = clickedItem.upload_type === 'video';
  ViewImage.displayWithVideo(urls, clickedUrl, mockItems, isCurrentVideo);
};

// 删除单个文件
const deleteItem = (idx: number) => {
  const newList = [...props.modelValue];
  newList.splice(idx, 1);
  emits('update:modelValue', newList);
  toast({ title: 'Tips', description: '已删除该文件记录' });
};

// 复制CODE
const copyCodeValue = async (v: string) => {
  let vhCopyStatus: any = false;
  try {
    await navigator.clipboard.writeText(v);
    vhCopyStatus = true;
  } catch {
    const i = document.createElement('textarea');
    i.value = v;
    document.body.appendChild(i);
    i.select();
    vhCopyStatus = document.execCommand('copy');
    document.body.removeChild(i);
  } finally {
    if (vhCopyStatus) toast({ title: 'Tips', description: '复制成功' });
  }
};
</script>

<style scoped lang="less">
@import 'ResList.less';
</style>
