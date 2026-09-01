/**
 * 全局上传管理器（模块级单例）
 *
 * 上传队列与状态脱离路由组件存在，切换页面不影响进行中的上传；
 * 任意页面通过悬浮托盘（UploadTray）查看进度、重试、复制链接。
 *
 * 注意：上传状态仅在当前会话保持，刷新页面后上传中的项目会丢失，
 * 不会从 localStorage 恢复历史记录，避免误判。
 */
import { ref, reactive, computed, watch } from 'vue';
import { useToast } from '@/components/ui/toast/use-toast';

const nodeHost = import.meta.env.VITE_IMG_API_URL || location.origin;
const uploadAPI = `${nodeHost}/upload`;

// ==================== 全局共享的粘贴锁 & 剪贴板解析 ====================
// 经验 718132：页面可能有多个 Upload 组件实例（Home 面板 + Header 抽屉），
// 每个实例各注册 document paste 监听器 → 同一次 Ctrl+V 触发两次独立消费。
// 把锁、解析、addFiles/addUrls 的去重都提升到模块级（单例），所有实例共享。
//
// 关键：用 globalThis 兜底，即使 Vite 把模块拆到多个 chunk（导致模块被加载两次、
// 产生两份模块级变量副本），globalThis 上的状态仍然是全局唯一的。

interface UploadGlobalState {
  pasteLockTs: number;
  recentFileFps: { ts: number; key: string }[];
  recentUrls: { ts: number; url: string }[];
}

const _G_KEY = '__cloudLensUploadState';
const _g: UploadGlobalState = (globalThis as any)[_G_KEY] || ((globalThis as any)[_G_KEY] = {
  pasteLockTs: 0,
  recentFileFps: [],
  recentUrls: [],
});

// 全局粘贴幂等锁：同一 100ms 窗口内的粘贴动作只放行一次（跨 Upload 实例）
/** 全局粘贴幂等锁：返回 true 表示获得锁，可消费本次粘贴；false 表示重复，丢弃。 */
export const acquirePasteLock = (timestamp: number, tag = '?'): boolean => {
  const now = timestamp || Date.now();
  const locked = now - _g.pasteLockTs < 100;
  console.log('[PASTE-LOCK]', { tag, ts: now, prevLock: _g.pasteLockTs, delta: now - _g.pasteLockTs, result: locked ? 'BLOCKED' : 'PASS' });
  if (locked) return false;
  _g.pasteLockTs = now;
  return true;
};

// 扩展名 → MIME（兜底：截图工具/复制图片时 File.type 常为空）
const _MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  apng: 'image/apng', tif: 'image/tiff', tiff: 'image/tiff', bmp: 'image/bmp',
  webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm',
};

/** 补齐 File.type：优先 hintedMime → 扩展名 → 兜底 image/png */
const _normalizeFile = (f: File, hintedMime = ''): File => {
  if (f.type) return f;
  let mime = hintedMime && /\//.test(hintedMime) ? hintedMime : '';
  if (!mime) {
    const m = (f.name || '').toLowerCase().match(/\.(jpe?g|png|gif|apng|tiff?|bmp|webp|mp4|webm)$/);
    if (m) {
      const key = m[1].replace('jpg', 'jpeg').replace('tif', 'tiff');
      mime = _MIME_BY_EXT[key] || '';
    }
  }
  if (!mime) mime = 'image/png';
  const name = f.name || `pasted-${Date.now()}.${mime.split('/')[1] || 'png'}`;
  return new File([f], name, { type: mime });
};

/** File fingerprint：name/size/type —— 用于同一次粘贴内 items + files 去重，以及 3s 跨粘贴窗口去重
 *  注意：去掉 lastModified！因为 DataTransferItem.getAsFile() 每次调用可能返回新的 File 对象，
 *  其 lastModified 可能是 Date.now()，两次调用间微差导致 fingerprint 不同 → 去重失效 */
const _fileFp = (f: File): string => `${f.name}|${f.size}|${f.type}`;

const _WINDOW_MS = 3000;

// 跨粘贴动作的文件窗口去重（3s 内相同 fingerprint 不重复入队）
const _pruneWindow = () => {
  const now = Date.now();
  for (let i = _g.recentFileFps.length - 1; i >= 0; i--) if (now - _g.recentFileFps[i].ts > _WINDOW_MS) _g.recentFileFps.splice(i, 1);
  for (let i = _g.recentUrls.length - 1; i >= 0; i--) if (now - _g.recentUrls[i].ts > _WINDOW_MS) _g.recentUrls.splice(i, 1);
};

/**
 * 统一解析剪贴板/DataTransfer 数据 → 去重后的 File[]。
 * 顺序：items 优先（getAsFile，覆盖截图/复制图片对象）→ files 兜底 → fingerprint 去重 → MIME 补齐。
 */
export const extractFilesFromClipboard = (cb: DataTransfer | ClipboardEvent['clipboardData'] | null): File[] => {
  const out: File[] = [];
  const seen = new Set<string>();
  if (!cb) return out;

  const items = (cb as DataTransfer).items as DataTransferItemList | undefined;
  if (items && items.length) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind !== 'file') continue;
      const f = it.getAsFile();
      if (!f) continue;
      const nf = _normalizeFile(f, it.type);
      const k = _fileFp(nf);
      if (!seen.has(k)) { seen.add(k); out.push(nf); }
    }
  }

  const fs = (cb as DataTransfer).files as FileList | undefined;
  if (fs && fs.length) {
    for (let i = 0; i < fs.length; i++) {
      const nf = _normalizeFile(fs[i]);
      const k = _fileFp(nf);
      if (!seen.has(k)) { seen.add(k); out.push(nf); }
    }
  }
  return out;
};

/** 从剪贴板取文本并解析图片直链（兜底用） */
export const extractUrlsFromClipboard = (cb: DataTransfer | ClipboardEvent['clipboardData'] | null): string[] => {
  let t = '';
  try { t = (cb as DataTransfer).getData?.('text/plain') || ''; } catch { /* ignore */ }
  return extractImageUrls(t);
};

export type UploadStatus = 'uploading' | 'success' | 'error';

export interface UploadItem {
  id: string;
  file: File | null;
  source_url?: string; // 网址上传模式：远端图片 URL（与 file 互斥）
  name: string;
  size: number;
  upload_status: UploadStatus;
  upload_progress: number; // 0-100，XHR 真实进度
  upload_blob: string; // 本地预览 URL（objectURL 或远端图片直链）
  upload_type: 'image' | 'video';
  upload_result: any; // Imgur 响应
  error?: string;
  xhr?: XMLHttpRequest | null;
  db_image_id?: number | null; // 保存到数据库后的图片记录ID
  saved_album_id?: number | null; // 实际保存到的相册ID（null=未分组）
}

// ===== 相册列表（供 ResList 单图选择相册用） =====
export interface AlbumRow {
  id: number;
  name: string;
  parent_id: number | null;
  image_count: number;
  created_at: string;
}
const albums = ref<AlbumRow[]>([]);
const defaultAlbumId = ref<number | null>(null);

// ===== 上传区共享状态（Home 面板与 Header 抽屉两个实例共用） =====
const uploadLoggedIn = ref(false);
// true 表示已完成过一次相册表加载（用于避免每次打开都闪空白）
const albumsLoaded = ref(false);
// 同步进行中：相册条在同步完成前不渲染，保证"先同步再显示"
const stateSyncing = ref(false);

let syncToken = 0;
export const ALBUMS_CHANGED_EVENT = 'cl:albums-changed';

/**
 * 统一刷新登录态 + 相册列表。
 * 多处并发调用安全：使用序号丢弃过期结果。
 */
const refreshUploadState = async (): Promise<void> => {
  const token = ++syncToken;
  stateSyncing.value = true;
  try {
    let loggedInNow = false;
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      loggedInNow = !!data?.user;
    } catch {
      loggedInNow = false;
    }
    if (token !== syncToken) return;
    uploadLoggedIn.value = loggedInNow;

    // 登出/会话失效：清空相册相关状态，恢复「无相册」默认视图
    if (!loggedInNow) {
      albums.value = [];
      defaultAlbumId.value = null;
      if (targetAlbum.value !== undefined) setTargetAlbum(undefined);
      return;
    }

    try {
      const res = await fetch('/api/albums');
      const data = await res.json();
      if (token !== syncToken) return;
      if (data.success) {
        const list = data.albums || [];
        albums.value = list;
        defaultAlbumId.value = data.default_album_id ?? null;
        // 删除相册后校验：targetAlbum / defaultAlbumId 可能指向已不存在的相册 → 重置默认
        if (targetAlbum.value !== undefined && targetAlbum.value !== null) {
          if (!list.some((a: AlbumRow) => a.id === targetAlbum.value)) {
            setTargetAlbum(undefined);
          }
        }
        if (defaultAlbumId.value !== null && !list.some((a: AlbumRow) => a.id === defaultAlbumId.value)) {
          defaultAlbumId.value = null;
        }
        albumsLoaded.value = true;
      }
    } catch {
      // 网络异常时保留旧列表
      if (token === syncToken) albumsLoaded.value = albums.value.length > 0 || albumsLoaded.value;
    }
  } finally {
    if (token === syncToken) stateSyncing.value = false;
  }
};

const fetchAlbums = async () => {
  await refreshUploadState();
};

// 相册树平铺为下拉选项（子相册缩进显示）
const albumTreeOptions = computed(() => {
  const byParent = new Map<number | null, AlbumRow[]>();
  for (const a of albums.value) {
    const p = a.parent_id ?? null;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p)!.push(a);
  }
  const out: { id: number; label: string }[] = [];
  const walk = (parent: number | null, depth: number) => {
    for (const a of byParent.get(parent) || []) {
      out.push({ id: a.id, label: `${'　'.repeat(depth)}${depth ? '└ ' : ''}${a.name}` });
      walk(a.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
});

const items = reactive<UploadItem[]>([]);
let idCounter = 0;
const genId = () => `up_${Date.now()}_${idCounter++}_${Math.random().toString(36).slice(2, 6)}`;

// ===== 并发限流队列 =====
// 浏览器对同一域名最多 6 个并发连接，Imgur 也有每用户每小时 1250 次请求限制。
// 控制同时上传的请求数，避免大量文件时接口被打满导致排队超时或限流。
const MAX_CONCURRENT = 3;
const queue: UploadItem[] = [];
const activeCount = ref(0);

const toast = useToast().toast;

// ===== 登录态缓存 =====
// 项目无全局 auth store，Header/Profile 各自 fetch /api/auth/me 并通过
// window 'auth:changed' 事件同步。这里缓存登录态，未登录时跳过 /api/images 调用，
// 避免 401 错误污染控制台。auth:changed 时重置缓存以重新探测。
let authKnown = false;
let isLoggedIn = false;
const checkAuth = async (): Promise<boolean> => {
  if (authKnown) return isLoggedIn;
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    isLoggedIn = !!data?.user;
  } catch {
    isLoggedIn = false;
  }
  authKnown = true;
  return isLoggedIn;
};
if (typeof window !== 'undefined') {
  window.addEventListener('auth:changed', () => {
    authKnown = false;
    refreshUploadState();
  });
  // 相册的创建/重命名/删除发生在 Profile 等页面时，广播此事件保持两个上传实例同步
  window.addEventListener(ALBUMS_CHANGED_EVENT, () => {
    refreshUploadState();
  });
}

// ===== 上传目标相册 =====
// undefined = 跟随默认相册（后端决定）；null = 未分组；number = 指定相册
// 选择持久化到 localStorage，刷新后保持上次选择
export type TargetAlbum = number | null | undefined;
const TARGET_ALBUM_KEY = 'cl_upload_target_album';
const targetAlbum = ref<TargetAlbum>(undefined);

const loadTargetAlbum = (): TargetAlbum => {
  try {
    const raw = localStorage.getItem(TARGET_ALBUM_KEY);
    if (raw === null) return undefined; // 从未设置 → 跟随默认
    if (raw === 'none') return null; // 未分组
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : undefined;
  } catch {
    return undefined;
  }
};

const setTargetAlbum = (v: TargetAlbum) => {
  targetAlbum.value = v;
  try {
    if (v === undefined) localStorage.removeItem(TARGET_ALBUM_KEY);
    else if (v === null) localStorage.setItem(TARGET_ALBUM_KEY, 'none');
    else localStorage.setItem(TARGET_ALBUM_KEY, String(v));
  } catch {
    // localStorage 不可用时仅保留内存状态
  }
};

if (typeof window !== 'undefined') {
  targetAlbum.value = loadTargetAlbum();
}

// 上传成功后保存到服务器（需要登录，未登录静默跳过，不影响上传结果）
const saveImage = async (item: UploadItem) => {
  if (!(await checkAuth())) return;
  try {
    const res = await fetch('/api/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imgur_id: item.upload_result?.data?.id,
        imgur_url: item.upload_result?.data?.link,
        delete_hash: item.upload_result?.data?.deletehash,
        filename: item.name,
        size: item.size,
        tags: '',
        ...(targetAlbum.value !== undefined ? { album_id: targetAlbum.value } : {}),
      }),
    });
    const data = await res.json();
    if (data.success) {
      item.db_image_id = data.image?.id ?? null;
      item.saved_album_id = data.image?.album_id ?? null;
      window.dispatchEvent(new CustomEvent('upload:saved', { detail: { image: data.image } }));
    } else if (data.error) {
      toast({ title: '记录保存失败', description: data.error, variant: 'destructive' });
    }
  } catch {
    toast({ title: '记录保存失败', description: '网络错误，图片已上传但记录未保存', variant: 'destructive' });
  }
};

// 单张图片更改相册（在 ResList 中操作）
const changeItemAlbum = async (item: UploadItem, albumId: number | null) => {
  if (!item.db_image_id) {
    toast({ title: 'Tips', description: '图片记录尚未保存，无法更改相册' });
    return;
  }
  try {
    const res = await fetch(`/api/images/${item.db_image_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ album_id: albumId }),
    });
    const data = await res.json();
    if (data.success) {
      item.saved_album_id = albumId;
      window.dispatchEvent(new CustomEvent('upload:saved', { detail: { image: data.image } }));
      toast({ title: 'Tips', description: '相册已更新' });
    } else {
      toast({ title: '操作失败', description: data.error, variant: 'destructive' });
    }
  } catch {
    toast({ title: '操作失败', description: '网络错误，请稍后重试', variant: 'destructive' });
  }
};

// ===== 单个文件上传（XHR 获得真实上传进度） =====
const uploadItem = (item: UploadItem) => {
  if (!item.file) return;
  item.upload_status = 'uploading';
  item.upload_progress = 0;
  item.error = '';

  const formData = new FormData();
  formData.append('file', item.file);
  const xhr = new XMLHttpRequest();
  item.xhr = xhr;
  xhr.open('POST', uploadAPI);
  // 节流：onprogress 高频触发，至少间隔 150ms 才更新 UI，避免 50 项列表渲染卡顿
  let lastProgressTs = 0;
  xhr.upload.onprogress = (e) => {
    if (!e.lengthComputable) return;
    const pct = Math.min(99, Math.round((e.loaded / e.total) * 100));
    const now = Date.now();
    if (pct !== item.upload_progress && (now - lastProgressTs > 150 || pct >= 99)) {
      item.upload_progress = pct;
      lastProgressTs = now;
      refreshOverallProgress();
    }
  };
  xhr.onload = () => {
    item.xhr = null;
    finishCurrent();
    let result: any = null;
    try {
      result = JSON.parse(xhr.responseText);
    } catch {
      result = null; // 网关错误（如 Cloudflare 413/502）返回 HTML 页面
    }
    if (xhr.status >= 200 && xhr.status < 300 && result?.data?.link) {
      item.upload_progress = 100;
      item.upload_result = { ...result, _vh_filename: item.name };
      item.upload_status = 'success';
      saveImage(item);
    } else {
      item.upload_status = 'error';
      item.error = result?.error || (xhr.status === 413 ? '文件过大，超过 100MB 上传上限' : result ? `HTTP ${xhr.status}` : `服务异常（HTTP ${xhr.status}）`);
      toast({ title: '上传失败', description: `${item.name}：${item.error}`, variant: 'destructive' });
    }
  };
  xhr.onerror = () => {
    item.xhr = null;
    finishCurrent();
    item.upload_status = 'error';
    item.error = '网络异常，连接中断';
    toast({ title: '上传失败', description: `${item.name}：网络异常，连接中断`, variant: 'destructive' });
  };
  // abort 不触发 onload/onerror：移除"上传中"条目会走这里释放并发槽位，
  // 否则 activeCount 永不回落，MAX_CONCURRENT 个槽位泄漏后新上传全部卡在等待中
  xhr.onabort = () => {
    if (item.xhr === xhr) {
      item.xhr = null;
      finishCurrent();
    }
  };
  xhr.send(formData);
};

/**
 * 网址上传分支：FormData 携带 url 字段，由服务端转发至 Imgur /3/image（type=URL）。
 * 远端图片无需本地上传字节，xhr.upload.onprogress 不会触发；
 * 故用"等待 + 节流心跳"模拟进度，避免列表里进度条长期卡 0% 显得停滞。
 */
const uploadItemByUrl = (item: UploadItem) => {
  const url = item.source_url;
  if (!url) return;
  item.upload_status = 'uploading';
  item.upload_progress = 5; // 起始 5%，避免视觉卡死在 0
  item.error = '';
  refreshOverallProgress();

  const formData = new FormData();
  formData.append('url', url);
  const xhr = new XMLHttpRequest();
  item.xhr = xhr;
  xhr.open('POST', uploadAPI);

  // 网址上传无 upload progress 事件，模拟缓慢爬升到 90% 上限
  let heartbeat: ReturnType<typeof setInterval> | null = setInterval(() => {
    if (item.upload_progress < 90) {
      item.upload_progress = Math.min(90, item.upload_progress + Math.random() * 4 + 1);
      refreshOverallProgress();
    }
  }, 600);

  const clearHeart = () => {
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
  };

  xhr.onload = () => {
    clearHeart();
    item.xhr = null;
    finishCurrent();
    let result: any = null;
    try {
      result = JSON.parse(xhr.responseText);
    } catch {
      result = null;
    }
    if (xhr.status >= 200 && xhr.status < 300 && result?.data?.link) {
      item.upload_progress = 100;
      item.upload_result = { ...result, _vh_filename: item.name };
      item.upload_status = 'success';
      saveImage(item);
    } else {
      item.upload_status = 'error';
      item.error = result?.error || (result ? `HTTP ${xhr.status}` : `服务异常（HTTP ${xhr.status}）`);
      toast({ title: '网址上传失败', description: `${item.name}：${item.error}`, variant: 'destructive' });
    }
  };
  xhr.onerror = () => {
    clearHeart();
    item.xhr = null;
    finishCurrent();
    item.upload_status = 'error';
    item.error = '网络异常，连接中断';
    toast({ title: '网址上传失败', description: `${item.name}：网络异常，连接中断`, variant: 'destructive' });
  };
  xhr.onabort = () => {
    clearHeart();
    if (item.xhr === xhr) {
      item.xhr = null;
      finishCurrent();
    }
  };
  xhr.send(formData);
};

// 当前请求结束后，从队列取出下一个继续上传
const finishCurrent = () => {
  activeCount.value--;
  const next = queue.shift();
  if (next) {
    activeCount.value++;
    startQueued(next);
  }
};

// 入口：先入队列，有空闲 slot 才真正发起请求
const enqueueUpload = (item: UploadItem) => {
  const start = () => {
    if (item.source_url) uploadItemByUrl(item);
    else uploadItem(item);
  };
  if (activeCount.value < MAX_CONCURRENT) {
    activeCount.value++;
    start();
  } else {
    // 排队中：状态保持 uploading 但进度为 0，UI 上会显示"等待中"遮罩
    queue.push(item);
  }
};

// 排队项出队时调用：与 enqueueUpload 用同一分发逻辑
const startQueued = (item: UploadItem) => {
  if (item.source_url) uploadItemByUrl(item);
  else uploadItem(item);
};

const releaseItem = (item: UploadItem) => {
  if (item.xhr) {
    try {
      item.xhr.abort();
    } catch {
      // ignore
    }
    item.xhr = null;
  }
  // 释放 blob URL（仅当前会话创建的 objectURL 需要 revoke）
  if (item.file && item.upload_blob.startsWith('blob:')) URL.revokeObjectURL(item.upload_blob);
};

// ===== 对外接口 =====
const addFiles = (files: File[]) => {
  if (!files.length) return;
  // 检查单次选择文件数量限制（100张）
  if (files.length > 100) {
    toast({
      title: '上传数量限制',
      description: '单次选择文件上限100张',
      variant: 'destructive',
    });
    return; // 停止上传，不处理任何文件
  }

  // 跨粘贴窗口去重：3s 内相同 fingerprint 的 File 直接丢弃（第二道防线，防多实例各自突破锁后仍重复入队）
  _pruneWindow();
  const filtered: File[] = [];
  for (const f of files) {
    const k = _fileFp(f);
    const dup = _g.recentFileFps.some((r) => r.key === k);
    console.log('[ADDFILES]', { fp: k, dedup: dup ? 'SKIP-DUP' : 'PASS', batch_size: files.length, filtered_so_far: filtered.length });
    if (dup) continue;
    _g.recentFileFps.push({ ts: Date.now(), key: k });
    filtered.push(f);
  }
  if (!filtered.length) return;

  // 先创建所有条目并 unshift 到列表（最新项在前），再倒序入队上传
  // 这样列表顶部的项先上传，视觉上从上往下
  const newItems: UploadItem[] = [];
  filtered.forEach((file) => {
    // 用 reactive 包裹，确保 XHR 回调中修改属性能触发视图更新
    // 否则 item 是原始对象引用，不经过代理的 set 拦截器，Vue 无法感知变化
    const item: UploadItem = reactive({
      id: genId(),
      file,
      name: file.name || 'clipboard.png',
      size: file.size,
      upload_status: 'uploading',
      upload_progress: 0,
      upload_blob: URL.createObjectURL(file),
      upload_type: file.type.startsWith('video/') ? 'video' : 'image',
      upload_result: null,
      xhr: null,
      db_image_id: undefined,
      saved_album_id: undefined,
    });
    items.unshift(item);
    newItems.push(item);
  });
  // 倒序入队：列表顶部的项（最后 unshift 的）先上传
  newItems.reverse().forEach((item) => enqueueUpload(item));
};

const retry = (id: string) => {
  const item = items.find((i) => i.id === id);
  if (item && item.upload_status === 'error' && (item.file || item.source_url)) enqueueUpload(item);
};

// ===== 网址上传入口 =====
// 与 addFiles 对称：校验 URL → 创建条目 → 入队上传。
// 复用同一份 items/queue/concurrency，与文件上传共享托盘与并发槽位。
// 远端文件大小未知：size 暂置 0，进度由心跳模拟（详见 uploadItemByUrl）。
const URL_IMAGE_EXT_RE = /\.(jpe?g|png|gif|apng|tiff?|bmp|webp|avif)$/i;

/**
 * 从一段文本中提取出所有看起来是图片直链的 URL。
 * 用于：网址上传 textarea 多行粘贴 + 剪贴板文本自动入队。
 * 规则：http(s):// 开头，pathname 以图片扩展名结尾（忽略 query/hash）。
 */
export const extractImageUrls = (text: string): string[] => {
  if (!text) return [];
  const lines = text.split(/\s+/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of lines) {
    const s = raw.trim();
    if (!s) continue;
    // 兼容用户粘贴 markdown 图片语法 ![alt](url) 与裸链接
    const m = s.match(/^!?\[.*?\]\((https?:\/\/[^\s)]+)\)$/i) || s.match(/^(https?:\/\/[^\s)]+)$/i);
    if (!m) continue;
    const u = m[1];
    try {
      const p = new URL(u);
      if (p.protocol !== 'http:' && p.protocol !== 'https:') continue;
      if (!URL_IMAGE_EXT_RE.test(p.pathname)) continue;
    } catch {
      continue;
    }
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
};

const urlToFilename = (url: string): string => {
  try {
    const p = new URL(url);
    const base = p.pathname.split('/').filter(Boolean).pop() || 'remote-image';
    return decodeURIComponent(base);
  } catch {
    return 'remote-image';
  }
};

const addUrls = (urls: string[]) => {
  if (!urls.length) return;
  if (urls.length > 100) {
    toast({
      title: '上传数量限制',
      description: '单次网址上传上限100条',
      variant: 'destructive',
    });
    return;
  }
  // 跨粘贴窗口去重：3s 内相同 URL 不重复入队
  _pruneWindow();
  const filtered: string[] = [];
  for (const u of urls) {
    if (_g.recentUrls.some((r) => r.url === u)) continue;
    _g.recentUrls.push({ ts: Date.now(), url: u });
    filtered.push(u);
  }
  if (!filtered.length) return;
  const newItems: UploadItem[] = [];
  filtered.forEach((url) => {
    const item: UploadItem = reactive({
      id: genId(),
      file: null,
      source_url: url,
      name: urlToFilename(url),
      size: 0,
      upload_status: 'uploading',
      upload_progress: 0,
      // 远端图片直接作为预览 URL（<img> 不受 CORS 限制）
      upload_blob: url,
      upload_type: 'image',
      upload_result: null,
      xhr: null,
      db_image_id: undefined,
      saved_album_id: undefined,
    });
    items.unshift(item);
    newItems.push(item);
  });
  newItems.reverse().forEach((item) => enqueueUpload(item));
};

const removeItem = (id: string) => {
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return;
  // 排队中的项目可能还在 queue 数组里，需要一并移除
  const qIdx = queue.indexOf(items[idx]);
  if (qIdx !== -1) queue.splice(qIdx, 1);
  releaseItem(items[idx]);
  items.splice(idx, 1);
};

// 供 ResList 这类以数组整体回写删除/清空的组件使用
const setItems = (list: UploadItem[]) => {
  const kept = new Set(list);
  items.filter((i) => !kept.has(i)).forEach(releaseItem);
  // 同步移除队列中被删除的项
  for (let i = queue.length - 1; i >= 0; i--) {
    if (!kept.has(queue[i])) queue.splice(i, 1);
  }
  items.splice(0, items.length, ...list);
};

const clearFinished = () => {
  items.filter((i) => i.upload_status !== 'uploading').forEach(releaseItem);
  setItems(items.filter((i) => i.upload_status === 'uploading'));
};

// ===== 汇总状态（托盘展示用） =====
const uploadingCount = computed(() => items.filter((i) => i.upload_status === 'uploading').length);
const queuedCount = computed(() => queue.length);
const errorCount = computed(() => items.filter((i) => i.upload_status === 'error').length);
const successCount = computed(() => items.filter((i) => i.upload_status === 'success').length);
const hasActive = computed(() => uploadingCount.value > 0);
const hasSuccessUpload = computed(() => successCount.value > 0);
// 总体进度：用 ref + 手动节流更新替代 computed，避免每次 progress 变化都遍历全量 items
const overallProgress = ref(0);
let overallProgressTs = 0;
const refreshOverallProgress = () => {
  const now = Date.now();
  if (now - overallProgressTs < 200) return; // 节流 200ms
  overallProgressTs = now;
  const active = items.filter((i) => i.upload_status !== 'success');
  if (!active.length) {
    overallProgress.value = 100;
    return;
  }
  const total = active.reduce((s, i) => s + (i.size || 1), 0);
  const done = active.reduce((s, i) => s + ((i.size || 1) * i.upload_progress) / 100, 0);
  overallProgress.value = Math.round((done / total) * 100);
};

export const useUploadManager = () => ({
  items,
  nodeHost,
  addFiles,
  addUrls,
  retry,
  removeItem,
  setItems,
  clearFinished,
  uploadingCount,
  queuedCount,
  errorCount,
  successCount,
  hasActive,
  hasSuccessUpload,
  overallProgress,
  targetAlbum,
  setTargetAlbum,
  albums,
  albumTreeOptions,
  defaultAlbumId,
  fetchAlbums,
  uploadLoggedIn,
  albumsLoaded,
  stateSyncing,
  refreshUploadState,
  changeItemAlbum,
});

// ===== 刷新前警告：上传中拦截 beforeunload，避免上传被打断 =====
const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
  e.preventDefault();
  e.returnValue = '';
};
watch(
  () => hasActive.value,
  (active) => {
    if (active) {
      window.addEventListener('beforeunload', beforeUnloadHandler);
    } else {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    }
  },
);

export type UploadManager = ReturnType<typeof useUploadManager>;
