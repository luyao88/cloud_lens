<template>
  <section class="Upload">
    <input type="file" multiple @change="fileListChange" :accept="UploadConfig.AcceptTypes" />
    <div class="placeholder">
      <svg class="icon" viewBox="0 0 1335 1024" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M1097.060174 392.125217C1073.730783 172.966957 893.261913 0.378435 666.089739 0.378435c-227.127652 0-415.610435 171.920696-430.948174 391.746782C101.910261 415.454609 0 525.356522 0 666.601739c0 149.147826 125.239652 274.476522 274.476522 274.476522h195.828869v-78.669913H274.476522a193.691826 193.691826 0 0 1-195.940174-195.806609c0-102.021565 70.678261-180.580174 172.588522-195.917913l54.561391-8.013913 8.013913-62.553043c16.005565-180.580174 172.588522-321.157565 352.389565-321.157566 180.580174 0 337.029565 141.356522 352.389565 321.157566v62.553043l62.664348 8.013913c101.910261 16.005565 172.477217 93.896348 172.477218 195.917913 0 109.901913-85.904696 195.806609-195.806609 195.806609h-195.917913v78.580869h196.029217c149.147826 0 274.476522-125.261913 274.476522-274.476521 0-141.133913-101.999304-259.072-235.25287-274.387479"
          fill="#909399"
        ></path>
        <path d="M612.218435 364.766609l1.335652 2.003478L389.698783 590.58087l55.229217 55.362782 181.938087-181.938087V1018.88h78.558609v-78.58087h156.471652-156.471652V458.039652l183.808 183.919305 55.340521-55.340522-277.147826-277.058783-55.229217 55.229218z m-141.913044 575.666087h156.471652-156.716521 0.222608z" fill="#909399"></path>
      </svg>
      <p>
        <span>点击上传 / 拖拽上传</span>
        <span>上传违反中国大陆、香港及美国法律的图片将会直接删除，并封禁设备IP</span>
      </p>
    </div>
  </section>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToast } from '@/components/ui/toast/use-toast';
const { toast } = useToast();
// 参数
const props = defineProps(['modelValue', 'UploadConfig', 'uploadAPI']);
const emits = defineEmits(['update:modelValue']);
const UploadConfig = ref<any>(props.UploadConfig);
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
  const FileListArr: Array<any> = [...props.modelValue, ...Array.from(targetFileListArr || [])];
  // 过滤不符合Size的文件
  let fileListFilter = FileListArr.filter((i: any) => UploadConfig.value.MaxSize && (i.size <= UploadConfig.value.MaxSize * 1024 * 1024 || i.upload_status == 'success'));
  if (fileListFilter.length != FileListArr.length) toast({ title: 'Tips', description: `已过滤Size超过 ${UploadConfig.value.MaxSize}MB 的文件` });
  // 过滤超过数量的文件
  if (UploadConfig.value.Max && fileListFilter.length > UploadConfig.value.Max) {
    toast({ title: 'Tips', description: `已过滤超过最大上传 ${UploadConfig.value.Max}个 的文件` });
    fileListFilter = Array.from(targetFileListArr || []).slice(0, UploadConfig.value.Max);
  }
  emits('update:modelValue', fileListFilter);
  fileUpload(fileListFilter);
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
    // 做图片预览blob======
    if (i.type.startsWith('image/')) {
      const blob = URL.createObjectURL(i);
      i.upload_blob = blob;
    }
    // 做图片预览blob======
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
