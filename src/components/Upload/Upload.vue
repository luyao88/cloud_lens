<template>
  <section
    class="Upload"
    :class="{ 'is-dragover': isDragover }"
    @dragover.prevent="onDragover"
    @dragenter.prevent="onDragenter"
    @dragleave.prevent="onDragleave"
    @drop.prevent="onDrop"
  >
    <input type="file" multiple @change="fileListChange" :accept="UploadConfig.AcceptTypes" />
    <div class="placeholder">
      <div class="upload-icon-wrap">
        <svg v-if="!isDragover" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 13v8" />
          <path d="m8 17 4-4 4 4" />
          <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2v16" />
          <path d="m6 10 6 6 6-6" />
          <path d="M5 22h14" />
        </svg>
      </div>
      <p>
        <span class="upload-title">{{ isDragover ? '释放即可上传' : '点击或拖拽上传文件' }}</span>
        <span class="upload-hint">{{ isDragover ? `检测到 ${dragoverCount} 个文件` : `支持图片和视频 · 最大 ${UploadConfig.MaxSize}MB · 可粘贴上传` }}</span>
      </p>
    </div>
  </section>

  <!-- 上传目标相册（登录后显示；同步完成前不渲染，避免闪空白） -->
  <div v-if="uploadLoggedIn && albumsLoaded && !stateSyncing" class="upload-album-bar">
    <svg class="album-bar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
    <span class="album-bar-label">上传到</span>
    <select class="album-select" :value="selectValue" @change="onSelectChange">
      <option value="default">跟随默认（{{ defaultAlbumLabel }}）</option>
      <option value="none">未分组</option>
      <option v-for="opt in albumOptions" :key="opt.id" :value="String(opt.id)">{{ opt.label }}</option>
    </select>
    <button v-if="targetAlbum !== undefined" class="album-bar-btn" :disabled="settingDefault" @click="setDefaultAlbum">
      {{ settingDefault ? '设置中...' : '设为默认' }}
    </button>
    <button class="album-bar-btn" @click="openCreateDialog">＋ 新建相册</button>
  </div>

  <!-- 新建相册弹窗 -->
  <Dialog :open="createOpen" @update:open="(v: boolean) => (createOpen = v)">
    <DialogContent class="max-w-md">
      <div class="flex flex-col gap-1.5 text-center">
        <DialogTitle>新建相册</DialogTitle>
        <DialogDescription> 创建顶级相册，上传时可在相册列表中选中它。 </DialogDescription>
      </div>
      <input v-model="createName" class="dialog-input" type="text" placeholder="请输入相册名称（最多 50 字）" maxlength="50" @keyup.enter="confirmCreate" />
      <div class="dialog-footer">
        <button class="btn ghost" @click="createOpen = false">取消</button>
        <button class="btn primary" :disabled="creating" @click="confirmCreate">{{ creating ? '创建中...' : '创建' }}</button>
      </div>
    </DialogContent>
  </Dialog>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useToast } from '@/components/ui/toast/use-toast';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useUploadManager } from '@/composables/useUploadManager';
const { toast } = useToast();
// 上传队列由全局管理器维护，切换页面不会中断
const { items, addFiles, targetAlbum, setTargetAlbum, albums, albumTreeOptions, defaultAlbumId, fetchAlbums, refreshUploadState, uploadLoggedIn, albumsLoaded, stateSyncing } = useUploadManager();
// 参数
const props = defineProps(['UploadConfig']);
const UploadConfig = ref<any>(props.UploadConfig);

// ===== 上传目标相册 =====
// 登录态/相册表/同步中标志全部来自全局管理器：
// Home 面板与 Header 抽屉两个实例共享同一份状态，任一处打开都会先同步再显示

// 相册选项直接使用全局管理器的 albumTreeOptions
const albumOptions = albumTreeOptions;

const selectValue = computed(() =>
  targetAlbum.value === undefined ? 'default' : targetAlbum.value === null ? 'none' : String(targetAlbum.value),
);

const defaultAlbumLabel = computed(() => {
  if (defaultAlbumId.value === null) return '未分组';
  const hit = albums.value.find((a) => a.id === defaultAlbumId.value);
  return hit?.name || '未分组';
});

const onSelectChange = (e: Event) => {
  const v = (e.target as HTMLSelectElement).value;
  if (v === 'default') setTargetAlbum(undefined);
  else if (v === 'none') setTargetAlbum(null);
  else setTargetAlbum(Number(v));
};

// 设为默认上传相册
const settingDefault = ref(false);
const setDefaultAlbum = async () => {
  if (targetAlbum.value === undefined || settingDefault.value) return;
  settingDefault.value = true;
  try {
    const res = await fetch('/api/albums/default', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ album_id: targetAlbum.value }),
    });
    const data = await res.json();
    if (!data.success) {
      toast({ title: '设置失败', description: data.error, variant: 'destructive' });
      return;
    }
    defaultAlbumId.value = data.default_album_id;
    toast({ title: 'Tips', description: '默认上传相册已更新' });
  } catch {
    toast({ title: '设置失败', description: '网络错误，请稍后重试', variant: 'destructive' });
  } finally {
    settingDefault.value = false;
  }
};

// 新建相册
const createOpen = ref(false);
const createName = ref('');
const creating = ref(false);

const openCreateDialog = () => {
  createName.value = '';
  createOpen.value = true;
};

const confirmCreate = async () => {
  const name = createName.value.trim();
  if (!name || creating.value) return;
  creating.value = true;
  try {
    const res = await fetch('/api/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!data.success) {
      toast({ title: '创建失败', description: data.error, variant: 'destructive' });
      return;
    }
    createOpen.value = false;
    await fetchAlbums();
    setTargetAlbum(data.album.id);
    toast({ title: 'Tips', description: `已创建「${name}」并设为上传相册` });
  } catch {
    toast({ title: '创建失败', description: '网络错误，请稍后重试', variant: 'destructive' });
  } finally {
    creating.value = false;
  }
};

// ===== 拖拽视觉同步 =====
// 依赖 dragenter/dragleave 计数避免子元素冒泡导致的闪烁
let dragCounter = 0;
const isDragover = ref(false);
const dragoverCount = ref(0);

const onDragover = (e: DragEvent) => {
  if (e.dataTransfer?.types?.includes('Files')) {
    dragoverCount.value = e.dataTransfer.items?.length || 1;
  }
};
const onDragenter = (e: DragEvent) => {
  if (!e.dataTransfer?.types?.includes('Files')) return;
  dragCounter++;
  isDragover.value = true;
  onDragover(e);
};
const onDragleave = () => {
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    isDragover.value = false;
  }
};
const onDrop = (e: DragEvent) => {
  dragCounter = 0;
  isDragover.value = false;
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    fileListChange(Array.from(files), true);
  }
};

// 文件列表变化事件（选择 / 拖拽 / 粘贴）
const fileListChange = async (v: Event | File[], type: boolean = false) => {
  let targetFileListArr: any[] = [];
  if (!type) {
    if (!(v as Event).target) return;
    targetFileListArr = Array.from(((v as Event).target as HTMLInputElement).files || []);
    // 重置 input value 允许重复选择同一文件
    ((v as Event).target as HTMLInputElement).value = '';
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
  const target = v.target as HTMLElement;
  // 输入框/文本域内的粘贴不拦截，让用户正常粘贴文本
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    return;
  }
  const pasteData = v.clipboardData || (window as any).clipboardData;
  const files = pasteData.files;
  if (files && files.length > 0) {
    v.preventDefault();
    fileListChange(files, true);
  }
};

onMounted(() => {
  document.addEventListener('paste', pasteUpload);
  // 挂载时全局同步一次（抽屉每次打开都会重新挂载 → 每次打开都拿到最新数据）
  refreshUploadState();
});
onUnmounted(() => {
  document.removeEventListener('paste', pasteUpload);
});
</script>

<style scoped lang="less">
@import 'Upload.less';
</style>
