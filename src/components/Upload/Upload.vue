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
import { ref, computed, onMounted } from 'vue';
import { useToast } from '@/components/ui/toast/use-toast';
const { toast } = useToast();
// 参数
const props = defineProps(['modelValue', 'UploadConfig', 'uploadAPI']);
const emits = defineEmits(['update:modelValue']);
const UploadConfig = ref<any>(props.UploadConfig);
// 是否有文件上传成功（用于悬浮置顶）
const hasSuccessUpload = computed(() => props.modelValue?.some((f: any) => f.upload_status === 'success'));
// 文件上传列表变化事件
const fileListChange = async (v: Event, type: boolean = false) => {
  let targetFileListArr: any = [];
  if (!type) {
    if (!v.target) return;
    targetFileListArr = (v.target as HTMLInputElement).files || [];
  } else {
    targetFileListArr = v;
  }
  // 处理图片格式
  targetFileListArr = await imgTypeFormat(targetFileListArr);
  // 校验文件格式和大小
  const acceptTypes = UploadConfig.value.AcceptTypes.split(',').map((t: string) => t.trim());
  const maxSize = UploadConfig.value.MaxSize * 1024 * 1024;
  const validFiles: any[] = [];
  const rejectedFiles: string[] = [];
  Array.from(targetFileListArr || []).forEach((file: any) => {
    // 已上传的文件跳过校验
    if (file.upload_status === 'success') {
      validFiles.push(file);
      return;
    }
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
  const FileListArr: Array<any> = [...props.modelValue, ...validFiles];
  // 过滤超过数量的文件
  if (UploadConfig.value.Max && FileListArr.length > UploadConfig.value.Max) {
    toast({ title: 'Tips', description: `已过滤超过最大上传 ${UploadConfig.value.Max}个 的文件` });
    FileListArr.splice(UploadConfig.value.Max);
  }
  emits('update:modelValue', FileListArr);
  fileUpload(FileListArr);
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

// 上传
const fileUpload = async (FileListArr: Array<any>) => {
  FileListArr.forEach(async (i: any) => {
    if (i.upload_status) return;
    const formData = new FormData();
    formData.append('file', i);
    // 做预览blob======
    if (i.type.startsWith('image/')) {
      i.upload_blob = URL.createObjectURL(i);
      i.upload_type = 'image';
    } else if (i.type.startsWith('video/')) {
      i.upload_blob = URL.createObjectURL(i);
      i.upload_type = 'video';
    }
    // 做预览blob======
    // 同步上传状态======
    i.upload_status = 'uploading';
    i.upload_progress = 96;
    emits('update:modelValue', [...FileListArr]);
    // 同步上传状态======
    try {
      // 发送请求
      const res = await fetch(props.uploadAPI, {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      i.upload_result = result;
      i.upload_result._vh_filename = i.name;
      i.upload_status = 'success';
    } catch (error) {
      i.upload_status = 'error';
      i.upload_result = error;
    } finally {
      // 同步上传状态======
      i.upload_progress = 100;
      emits('update:modelValue', [...FileListArr]);
      // 同步上传状态======
    }
  });
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
</script>

<style scoped lang="less">
@import 'Upload.less';
</style>
