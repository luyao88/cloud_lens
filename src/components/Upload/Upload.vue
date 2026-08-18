<template>
  <section class="Upload" :class="{ sticky: hasSuccessUpload }">
    <input type="file" multiple @change="fileListChange" :accept="UploadConfig.AcceptTypes" />
    <div class="placeholder">
      <div class="upload-icon-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 13v8" />
          <path d="m8 17 4-4 4 4" />
          <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
        </svg>
      </div>
      <p>
        <span class="upload-title">点击或拖拽上传文件</span>
        <span class="upload-hint">支持图片和视频 · 最大 {{ UploadConfig.MaxSize }}MB · 可粘贴上传</span>
      </p>
    </div>
  </section>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useToast } from '@/components/ui/toast/use-toast';
import { useUploadManager } from '@/composables/useUploadManager';
const { toast } = useToast();
// 上传队列由全局管理器维护，切换页面不会中断
const { items, addFiles, hasSuccessUpload } = useUploadManager();
// 参数
const props = defineProps(['UploadConfig']);
const UploadConfig = ref<any>(props.UploadConfig);
// 文件列表变化事件（选择 / 拖拽 / 粘贴）
const fileListChange = async (v: Event | File[], type: boolean = false) => {
  let targetFileListArr: any[] = [];
  if (!type) {
    if (!(v as Event).target) return;
    targetFileListArr = Array.from(((v as Event).target as HTMLInputElement).files || []);
  } else {
    targetFileListArr = Array.from(v as File[]);
  }
  if (!targetFileListArr.length) return;
  // 处理图片格式
  targetFileListArr = await imgTypeFormat(targetFileListArr);
  // 校验文件格式和大小
  const acceptTypes = UploadConfig.value.AcceptTypes.split(',').map((t: string) => t.trim());
  const maxSize = UploadConfig.value.MaxSize * 1024 * 1024;
  const validFiles: File[] = [];
  const rejectedFiles: string[] = [];
  targetFileListArr.forEach((file: any) => {
    const isAccepted = acceptTypes.some((type: string) => {
      if (type.endsWith('/*')) return file.type.startsWith(type.slice(0, -1));
      return file.type === type;
    });
    if (!isAccepted) {
      rejectedFiles.push(`${file.name}（不支持的格式）`);
      return;
    }
    if (file.size > maxSize) {
      rejectedFiles.push(`${file.name}（超过 ${UploadConfig.value.MaxSize}MB）`);
      return;
    }
    validFiles.push(file);
  });
  if (rejectedFiles.length) {
    toast({ title: '文件被拒绝', description: rejectedFiles.join('、') });
  }
  if (!validFiles.length) return;
  // 过滤超过数量的文件
  let finalFiles = validFiles;
  if (UploadConfig.value.Max && items.length + validFiles.length > UploadConfig.value.Max) {
    finalFiles = validFiles.slice(0, Math.max(0, UploadConfig.value.Max - items.length));
    toast({ title: 'Tips', description: `已过滤超过最大上传 ${UploadConfig.value.Max}个 的文件` });
  }
  if (finalFiles.length) addFiles(finalFiles);
};

// 图片格式webp 转换为png
const imgTypeFormat = async (files: File[]) => {
  const _fileList = Array.from(files || []);
  const convertWebPToPNG = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/webp')) return file;
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          const newFile = new File([blob!], file.name.replace(/\.webp$/i, '.png'), { type: 'image/png' });
          URL.revokeObjectURL(img.src);
          resolve(newFile);
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        resolve(file);
      };
    });
  };
  return await Promise.all(_fileList.map(convertWebPToPNG));
};

// 粘贴上传
const pasteUpload = (v: any) => {
  v.preventDefault();
  const pasteData = v.clipboardData || (window as any).clipboardData;
  const files = pasteData.files;
  fileListChange(files, true);
};

onMounted(() => {
  document.addEventListener('paste', pasteUpload);
});
onUnmounted(() => {
  document.removeEventListener('paste', pasteUpload);
});
</script>

<style scoped lang="less">
@import 'Upload.less';
</style>
