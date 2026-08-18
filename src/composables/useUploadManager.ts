/**
 * 全局上传管理器（模块级单例）
 *
 * 上传队列与状态脱离路由组件存在，切换页面不影响进行中的上传；
 * 任意页面通过悬浮托盘（UploadTray）查看进度、重试、复制链接。
 *
 * 数据结构兼容旧版 localStorage（zychUpImageList）中已保存的成功记录。
 */
import { reactive, computed } from 'vue';
import { formatURL } from '@/utils/index';
import { useToast } from '@/components/ui/toast/use-toast';

const STORAGE_KEY = 'zychUpImageList';
const nodeHost = import.meta.env.VITE_IMG_API_URL || location.origin;
const uploadAPI = `${nodeHost}/upload`;

export type UploadStatus = 'uploading' | 'success' | 'error';

export interface UploadItem {
  id: string;
  file: File | null; // 从 localStorage 恢复的历史记录没有 file，无法重试
  name: string;
  size: number;
  upload_status: UploadStatus;
  upload_progress: number; // 0-100，XHR 真实进度
  upload_blob: string; // 本地预览 URL（objectURL 或站点链接）
  upload_type: 'image' | 'video';
  upload_result: any; // Imgur 响应
  error?: string;
  xhr?: XMLHttpRequest | null;
}

const items = reactive<UploadItem[]>([]);
let idCounter = 0;
const genId = () => `up_${Date.now()}_${idCounter++}_${Math.random().toString(36).slice(2, 6)}`;

// ===== 初始化：恢复历史成功记录 =====
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  saved.forEach((i: any) => {
    if (!i?.upload_result?.data?.link) return;
    items.push({
      id: genId(),
      file: null,
      name: i.upload_result._vh_filename || i.name || '已上传文件',
      size: i.upload_result.data.size || i.size || 0,
      upload_status: 'success',
      upload_progress: 100,
      upload_blob: i.upload_blob || formatURL({ nodeHost }, i.upload_result),
      upload_type: i.upload_type || (String(i.upload_result.data.type || '').startsWith('video') ? 'video' : 'image'),
      upload_result: i.upload_result,
    });
  });
} catch {
  // 历史数据损坏时静默忽略
}

// ===== 持久化：仅保存成功记录，结构与旧版一致 =====
const persist = () => {
  const success = items
    .filter((i) => i.upload_status === 'success' && i.upload_result?.data?.link)
    .map((i) => ({
      upload_status: i.upload_status,
      upload_blob: formatURL({ nodeHost }, i.upload_result),
      upload_type: i.upload_type,
      upload_result: { ...i.upload_result, _vh_filename: i.name },
      name: i.name,
      size: i.size,
    }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(success));
};

// 上传成功后保存到服务器（需要登录，未登录静默跳过，不影响上传结果）
const saveImage = (item: UploadItem) => {
  fetch('/api/images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imgur_id: item.upload_result?.data?.id,
      imgur_url: item.upload_result?.data?.link,
      delete_hash: item.upload_result?.data?.deletehash,
      filename: item.name,
      size: item.size,
      tags: '',
    }),
  }).catch(() => {});
};

const toast = useToast().toast;

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
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) item.upload_progress = Math.min(99, Math.round((e.loaded / e.total) * 100));
  };
  xhr.onload = () => {
    item.xhr = null;
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
      persist();
      saveImage(item);
    } else {
      item.upload_status = 'error';
      item.error =
        result?.error ||
        (xhr.status === 413 ? '文件过大，超过 100MB 上传上限' : result ? `HTTP ${xhr.status}` : `服务异常（HTTP ${xhr.status}）`);
      toast({ title: '上传失败', description: `${item.name}：${item.error}`, variant: 'destructive' });
    }
  };
  xhr.onerror = () => {
    item.xhr = null;
    item.upload_status = 'error';
    item.error = '网络异常，连接中断';
    toast({ title: '上传失败', description: `${item.name}：网络异常，连接中断`, variant: 'destructive' });
  };
  xhr.send(formData);
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
  // objectURL 只在本次会话创建时释放（历史记录的 blob 是站点链接，不能 revoke）
  if (item.file && item.upload_blob.startsWith('blob:')) URL.revokeObjectURL(item.upload_blob);
};

// ===== 对外接口 =====
const addFiles = (files: File[]) => {
  files.forEach((file) => {
    const item: UploadItem = {
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
    };
    items.unshift(item);
    uploadItem(item);
  });
};

const retry = (id: string) => {
  const item = items.find((i) => i.id === id);
  if (item?.file && item.upload_status === 'error') uploadItem(item);
};

const removeItem = (id: string) => {
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return;
  releaseItem(items[idx]);
  items.splice(idx, 1);
  persist();
};

// 供 ResList 这类以数组整体回写删除/清空的组件使用
const setItems = (list: UploadItem[]) => {
  const kept = new Set(list);
  items.filter((i) => !kept.has(i)).forEach(releaseItem);
  items.splice(0, items.length, ...list);
  persist();
};

const clearFinished = () => {
  items.filter((i) => i.upload_status !== 'uploading').forEach(releaseItem);
  setItems(items.filter((i) => i.upload_status === 'uploading'));
};

// ===== 汇总状态（托盘展示用） =====
const uploadingCount = computed(() => items.filter((i) => i.upload_status === 'uploading').length);
const errorCount = computed(() => items.filter((i) => i.upload_status === 'error').length);
const successCount = computed(() => items.filter((i) => i.upload_status === 'success').length);
const hasActive = computed(() => uploadingCount.value > 0);
const hasSuccessUpload = computed(() => successCount.value > 0);
// 总体进度按字节加权，比平均百分比更真实
const overallProgress = computed(() => {
  const active = items.filter((i) => i.upload_status !== 'success');
  if (!active.length) return 100;
  const total = active.reduce((s, i) => s + (i.size || 1), 0);
  const done = active.reduce((s, i) => s + ((i.size || 1) * i.upload_progress) / 100, 0);
  return Math.round((done / total) * 100);
});

export const useUploadManager = () => ({
  items,
  nodeHost,
  addFiles,
  retry,
  removeItem,
  setItems,
  clearFinished,
  uploadingCount,
  errorCount,
  successCount,
  hasActive,
  hasSuccessUpload,
  overallProgress,
});

export type UploadManager = ReturnType<typeof useUploadManager>;
