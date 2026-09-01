<template>
  <!-- ===== Tab 切换器：文件 / 网址 ===== -->
  <div class="upload-tabs" role="tablist">
    <button class="tab" :class="{ active: mode === 'file' }" role="tab" :aria-selected="mode === 'file'" @click="mode = 'file'">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <span>文件上传</span>
    </button>
    <button class="tab" :class="{ active: mode === 'url' }" role="tab" :aria-selected="mode === 'url'" @click="mode = 'url'">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      <span>网址上传</span>
    </button>
    <span class="tab-indicator" :class="`is-${mode}`"></span>
  </div>

  <!-- ===== 文件上传 ===== -->
  <section
    ref="uploadAreaRef"
    tabindex="0"
    v-show="mode === 'file'"
    class="Upload"
    :class="{ 'is-dragover': isDragover }"
    @click="onUploadAreaClick"
    @paste.capture.stop.prevent="onUploadAreaPaste"
    @dragover.prevent="onDragover"
    @dragenter.prevent="onDragenter"
    @dragleave.prevent="onDragleave"
    @drop.prevent="onDrop">
    <input ref="fileInputRef" type="file" multiple @change="fileListChange" :accept="UploadConfig.AcceptTypes" />
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
        <span class="upload-hint">{{ isDragover ? `检测到 ${dragoverCount} 个文件` : `支持图片和视频 · 最大 ${UploadConfig.MaxSize}MB · 最多 ${UploadConfig.Max} 张 · 截图后粘贴直接上传` }}</span>
      </p>
      <div class="quick-actions">
        <button class="qa-btn qa-paste" :disabled="pastingClipboard" type="button" @click.stop="pasteFromClipboard">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="8" height="4" x="8" y="2" rx="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <path d="M9 14h6M9 18h4M9 10h6" />
          </svg>
          <span>{{ pastingClipboard ? '读取中...' : '粘贴图片' }}</span>
        </button>
        <span class="qa-or">或</span>
        <button class="qa-btn qa-select" type="button" @click.stop="triggerFileSelect">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span>选择文件</span>
        </button>
      </div>
    </div>
  </section>

  <!-- ===== 网址上传 ===== -->
  <section v-show="mode === 'url'" class="Upload url-mode">
    <div class="url-inner">
      <div class="url-icon-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </div>
      <textarea
        v-model="urlInput"
        class="url-textarea"
        placeholder="粘贴图片直链，每行一个&#10;支持 https://example.com/photo.jpg&#10;也支持 Markdown 语法 ![alt](https://...)"
        rows="4"
        spellcheck="false"
        @input="onUrlInput"
        @keydown.meta.enter.prevent="submitUrls"
        @keydown.ctrl.enter.prevent="submitUrls"></textarea>
      <div class="url-bar">
        <div class="url-bar-left">
          <button class="url-paste-btn" :disabled="pastingClipboard" type="button" @click="pasteTextFromClipboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="8" height="4" x="8" y="2" rx="1" />
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <path d="M9 14h6M9 10h6" />
            </svg>
            <span>{{ pastingClipboard ? '读取中...' : '粘贴到文本框' }}</span>
          </button>
          <span class="url-hint" :class="{ 'is-empty': urlCount === 0, 'is-ok': urlCount > 0 }">
            <template v-if="urlCount === 0">仅支持 jpg / png / gif / webp 等图片直链</template>
            <template v-else>已识别 {{ urlCount }} 条图片网址</template>
          </span>
        </div>
        <button class="url-submit" :disabled="urlCount === 0" @click="submitUrls">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
          <span>添加{{ urlCount > 0 ? ` ${urlCount} 张` : '' }}</span>
        </button>
      </div>
    </div>
  </section>

  <!-- 上传目标相册：始终渲染（不依赖登录/加载状态，避免闪现）；
       未登录时仅显示无相册的默认选项，操作时提示登录 -->
  <div class="upload-album-bar">
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
    <button v-if="targetAlbum !== undefined" class="album-bar-btn album-bar-btn-sm" :disabled="settingDefault" @click="setDefaultAlbum">
      {{ settingDefault ? '设置中...' : '设为默认' }}
    </button>
    <button class="album-bar-btn album-bar-btn-sm" @click="openCreateDialog">＋ 相册</button>
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

  <!-- 未登录操作相册时弹出的登录弹窗 -->
  <AuthDialog v-model:open="authOpen" @success="onAuthDialogSuccess" />
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useToast } from '@/components/ui/toast/use-toast';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import AuthDialog from '@/components/AuthDialog/AuthDialog.vue';
import { useUploadManager, extractImageUrls, acquirePasteLock, extractFilesFromClipboard, extractUrlsFromClipboard } from '@/composables/useUploadManager';
const { toast } = useToast();
// 上传队列由全局管理器维护，切换页面不会中断
const { items, addFiles, addUrls, targetAlbum, setTargetAlbum, albums, albumTreeOptions, defaultAlbumId, fetchAlbums, refreshUploadState, uploadLoggedIn } = useUploadManager();
// 参数
const props = defineProps(['UploadConfig']);
const UploadConfig = ref<any>(props.UploadConfig);

// ===== Refs =====
const fileInputRef = ref<HTMLInputElement | null>(null);
const uploadAreaRef = ref<HTMLElement | null>(null);
const pastingClipboard = ref(false);

// ===== 上传模式：文件 / 网址 =====
type UploadMode = 'file' | 'url';
const mode = ref<UploadMode>('file');

// ===== 网址上传：textarea 输入与识别 =====
const urlInput = ref('');
const urlCount = computed(() => extractImageUrls(urlInput.value).length);
const onUrlInput = () => { /* urlCount 自动更新 */ };

const submitUrls = () => {
  const urls = extractImageUrls(urlInput.value);
  if (!urls.length) {
    toast({ title: 'Tips', description: '未识别到合法的图片直链' });
    return;
  }
  addUrls(urls);
  toast({ title: 'Tips', description: `已添加 ${urls.length} 张到上传队列` });
  urlInput.value = '';
};

// ===== 上传目标相册 =====
const albumOptions = albumTreeOptions;
const selectValue = computed(() => (targetAlbum.value === undefined ? 'default' : targetAlbum.value === null ? 'none' : String(targetAlbum.value)));
const defaultAlbumLabel = computed(() => {
  if (defaultAlbumId.value === null) return '未分组';
  const hit = albums.value.find((a) => a.id === defaultAlbumId.value);
  return hit?.name || '未分组';
});

const authOpen = ref(false);
const requireLogin = (): boolean => {
  if (uploadLoggedIn.value) return true;
  authOpen.value = true;
  return false;
};

const onAuthDialogSuccess = () => {
  window.dispatchEvent(new Event('auth:changed'));
};

const onSelectChange = (e: Event) => {
  const el = e.target as HTMLSelectElement;
  if (!requireLogin()) {
    el.value = selectValue.value;
    return;
  }
  const v = el.value;
  if (v === 'default') setTargetAlbum(undefined);
  else if (v === 'none') setTargetAlbum(null);
  else setTargetAlbum(Number(v));
};

const settingDefault = ref(false);
const setDefaultAlbum = async () => {
  if (targetAlbum.value === undefined || settingDefault.value) return;
  if (!requireLogin()) return;
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
  if (!requireLogin()) return;
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

// ===== 上传区域点击：触发选择文件（不拦截子按钮的 .stop） =====
const onUploadAreaClick = () => {
  uploadAreaRef.value?.focus({ preventScroll: true });
};
const triggerFileSelect = () => {
  fileInputRef.value?.click();
};

// ===== 拖拽视觉同步 =====
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

// ===== 文件校验 + 入队（被 paste / drag / select 复用） =====
const fileListChange = async (v: Event | File[], type: boolean = false) => {
  let targetFileListArr: any[] = [];
  if (!type) {
    if (!(v as Event).target) return;
    targetFileListArr = Array.from(((v as Event).target as HTMLInputElement).files || []);
    ((v as Event).target as HTMLInputElement).value = '';
  } else {
    targetFileListArr = Array.from(v as File[]);
  }
  if (!targetFileListArr.length) return;
  targetFileListArr = await imgTypeFormat(targetFileListArr);
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
  if (UploadConfig.value.Max && validFiles.length > UploadConfig.value.Max) {
    toast({
      title: '上传数量限制',
      description: `单次选择文件上限${UploadConfig.value.Max}张，请减少选择数量`,
      variant: 'destructive',
    });
    return;
  }
  addFiles(validFiles);
};

// 图片格式 webp → png
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

/* ============================================================
 *  粘贴体系（注意：页面有 2 个 Upload 组件实例，Home 面板 + Header 抽屉）
 *  ------------------------------------------------------------
 *  入口 A：上传区域 @paste（capture.stop.prevent，焦点在上传区域时最先拿到）
 *  入口 B：document paste（兜底，页面任意位置 Ctrl+V）
 *  入口 C：主动按钮「粘贴图片」→  Async Clipboard API (navigator.clipboard.read)
 *  入口 D：网址模式「粘贴到文本框」按钮 →  Async Clipboard API readText
 *
 *  幂等/去重：所有入口都通过 useUploadManager 的 **模块级** 共享逻辑
 *  - acquirePasteLock(ts)：100ms 窗口全局只放行一次（跨实例）
 *  - extractFilesFromClipboard(cb)：items + files 统一解析 + 单次去重 + MIME 补齐
 *  - addFiles/addUrls 内部：3s 跨粘贴窗口再去重（第二道防线）
 * ============================================================ */

// ---------- 入口 A：上传区域级 paste（捕获阶段 + stop，焦点在上传区域时最先消费） ----------
const onUploadAreaPaste = (e: ClipboardEvent) => {
  if (!acquirePasteLock(e.timeStamp)) return;
  const files = extractFilesFromClipboard(e.clipboardData);
  if (files.length > 0) {
    mode.value = 'file';
    fileListChange(files, true);
    return;
  }
  const urls = extractUrlsFromClipboard(e.clipboardData);
  if (urls.length > 0) {
    mode.value = 'url';
    addUrls(urls);
    toast({ title: 'Tips', description: `已识别并添加 ${urls.length} 张图片直链` });
    return;
  }
  toast({ title: 'Tips', description: '剪贴板中未找到图片或图片直链', variant: 'destructive' });
};

// ---------- 入口 B：document 级 paste（兜底，页面任意位置 Ctrl+V） ----------
const onDocumentPaste = (e: ClipboardEvent) => {
  const target = e.target as HTMLElement | null;
  if (target) {
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
    // 焦点在上传区域内 → 入口 A 已处理（或 capture.stop 已经阻止冒泡到 document，但这里再兜一层）
    if (uploadAreaRef.value && uploadAreaRef.value.contains(target)) return;
  }
  if (!acquirePasteLock(e.timeStamp)) return;
  const files = extractFilesFromClipboard(e.clipboardData);
  if (files.length > 0) {
    mode.value = 'file';
    fileListChange(files, true);
    return;
  }
  const urls = extractUrlsFromClipboard(e.clipboardData);
  if (urls.length > 0) {
    mode.value = 'url';
    addUrls(urls);
    toast({ title: 'Tips', description: `已识别并添加 ${urls.length} 张图片直链` });
  }
};

// ---------- 入口 C：主动「粘贴图片」按钮 → Async Clipboard API ----------
const pasteFromClipboard = async () => {
  if (!navigator.clipboard?.read) {
    toast({ title: '提示', description: '当前浏览器不支持读取剪贴板，请改用 Ctrl+V 粘贴' });
    return;
  }
  pastingClipboard.value = true;
  try {
    const cbi = await navigator.clipboard.read();
    const files: File[] = [];
    const seen = new Set<string>();
    for (const it of cbi) {
      for (const t of it.types) {
        if (!t.startsWith('image/')) continue;
        try {
          const blob = await it.getType(t);
          const f = new File([blob], `clipboard-${Date.now()}.${t.split('/')[1] || 'png'}`, { type: t });
          const k = `${f.size}|${f.type}`;
          if (!seen.has(k)) { seen.add(k); files.push(f); }
        } catch { /* 单个 type 取失败不影响其他 */ }
      }
    }
    if (files.length > 0) {
      if (!acquirePasteLock(Date.now())) return;
      mode.value = 'file';
      fileListChange(files, true);
    } else {
      let text = '';
      try { text = (await navigator.clipboard.readText()) || ''; } catch { /* ignore */ }
      const urls = extractImageUrls(text);
      if (urls.length > 0) {
        if (!acquirePasteLock(Date.now())) return;
        mode.value = 'url';
        addUrls(urls);
        toast({ title: 'Tips', description: `已识别并添加 ${urls.length} 张图片直链` });
      } else {
        toast({ title: 'Tips', description: '剪贴板中未找到图片或图片直链，先截图或复制图片再试', variant: 'destructive' });
      }
    }
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (/permission|denied|not allowed|blocked/i.test(msg)) {
      toast({ title: '无法读取剪贴板', description: '请授权剪贴板读取权限，或改用 Ctrl+V 粘贴', variant: 'destructive' });
    } else {
      toast({ title: '读取剪贴板失败', description: msg || '未知错误', variant: 'destructive' });
    }
  } finally {
    pastingClipboard.value = false;
  }
};

// ---------- 入口 D：网址模式「粘贴到文本框」按钮 ----------
const pasteTextFromClipboard = async () => {
  if (!navigator.clipboard?.readText) {
    toast({ title: '提示', description: '当前浏览器不支持读取剪贴板，请用 Ctrl+V 粘贴' });
    return;
  }
  pastingClipboard.value = true;
  try {
    const t = await navigator.clipboard.readText();
    if (t) {
      urlInput.value = urlInput.value ? `${urlInput.value.trimEnd()}\n${t}` : t;
      toast({ title: 'Tips', description: `已粘贴文本（识别到 ${urlCount.value} 条）` });
    } else {
      toast({ title: 'Tips', description: '剪贴板里没有文本内容', variant: 'destructive' });
    }
  } catch (err: any) {
    toast({ title: '无法读取剪贴板', description: err?.message || '请授权剪贴板权限', variant: 'destructive' });
  } finally {
    pastingClipboard.value = false;
  }
};

onMounted(() => {
  document.addEventListener('paste', onDocumentPaste);
  refreshUploadState();
});
onUnmounted(() => {
  document.removeEventListener('paste', onDocumentPaste);
});
</script>

<style scoped lang="less">
@import 'Upload.less';
</style>
