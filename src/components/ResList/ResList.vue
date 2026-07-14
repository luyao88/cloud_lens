<template>
  <section class="ResList">
    <div class="item" v-for="(i, idx) in props.modelValue" :key="idx">
      <!-- 缩略图：图片或视频 -->
      <div class="thumb-wrapper" @click="i.upload_blob && openPreview(i)">
        <img v-if="i.upload_type === 'image' || (!i.upload_type && i.upload_blob)" class="thumb" :src="i.upload_result ? i.upload_blob : LoadingImg" />
        <video v-else-if="i.upload_type === 'video'" class="thumb" :src="i.upload_blob" muted></video>
        <img v-else class="thumb" :src="LoadingImg" />
      </div>
      <div class="value" :class="{ active: !i.upload_result }">
        <p><input :value="i.upload_result ? formatURL(props, i.upload_result) : ''" type="text" readonly @click="i.upload_result && copyCodeValue(formatURL(props, i.upload_result))" /> <span>URL</span></p>
        <p><input :value="i.upload_result ? formatURL(props, i.upload_result, 'md') : ''" type="text" readonly @click="i.upload_result && copyCodeValue(formatURL(props, i.upload_result, 'md'))" /> <span>Markdown</span></p>
        <p><input :value="i.upload_result ? formatURL(props, i.upload_result, 'html') : ''" type="text" readonly @click="i.upload_result && copyCodeValue(formatURL(props, i.upload_result, 'html'))" /> <span>HTML</span></p>
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
const props = defineProps(['modelValue', 'nodeHost']);
const emits = defineEmits(['update:modelValue']);
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

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
