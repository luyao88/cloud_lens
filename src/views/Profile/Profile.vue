<template>
  <section class="Profile">
    <!-- 加载中 -->
    <div v-if="loading" class="state-tip">加载中...</div>

    <!-- 未登录门禁 -->
    <div v-else-if="!user" class="auth-gate">
      <div class="gate-card">
        <div class="gate-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2>登录后查看您的主页</h2>
        <p>个人主页展示您的头像、名称与上传相册，仅自己可见</p>
        <button class="gate-btn" @click="authOpen = true">去登录</button>
      </div>
    </div>

    <template v-else>
      <!-- 个人信息卡 -->
      <div class="profile-card">
        <div class="profile-info">
          <img v-if="user.avatar_url" :src="user.avatar_url" :alt="user.username" class="profile-avatar" />
          <div v-else class="profile-avatar profile-avatar-default">{{ avatarLetter }}</div>
          <div class="profile-meta">
            <h1 class="profile-name">{{ user.username }}</h1>
            <p class="profile-email">{{ user.email || '未绑定邮箱' }}</p>
          </div>
        </div>
        <div class="profile-stats">
          <div class="stat">
            <span class="stat-num">{{ stats.total }}</span>
            <span class="stat-label">图片</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <span class="stat-num">{{ albums.length }}</span>
            <span class="stat-label">相册</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <span class="stat-num">{{ formatSize(stats.totalSize) }}</span>
            <span class="stat-label">占用空间</span>
          </div>
        </div>
      </div>

      <!-- 相册详情视图 -->
      <div v-if="activeAlbum" class="album-detail">
        <div class="detail-head">
          <button
            class="back-btn"
            @click="
              exitBatchMode();
              activeKey = '';
            "
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            返回相册
          </button>
          <div class="detail-title">
            <h2>{{ activeAlbum.name }}</h2>
            <span>{{ activeAlbum.images.length }} 个文件 · {{ formatSize(albumSize(activeAlbum)) }}</span>
          </div>
          <div class="detail-actions">
            <template v-if="batchMode">
              <button class="btn ghost" @click="toggleSelectAll">
                {{ isAllSelected ? '取消全选' : '全选' }}
              </button>
              <button class="btn primary" :disabled="!selectedIds.size || batchSaving" @click="openBatchDialog">
                {{ batchSaving ? '保存中...' : `批量编辑标签 (${selectedIds.size})` }}
              </button>
              <button class="btn ghost" @click="exitBatchMode">退出</button>
            </template>
            <template v-else>
              <button class="btn ghost" :disabled="!activeAlbum.images.length" @click="enterBatchMode">批量编辑标签</button>
            </template>
          </div>
        </div>

        <div v-if="activeAlbum.images.length" class="image-grid" :class="{ 'batch-mode': batchMode }">
          <div class="image-card" :class="{ selected: selectedIds.has(img.id) }" v-for="img in activeAlbum.images" :key="img.id">
            <div class="thumb-wrap" @click="batchMode ? toggleSelect(img) : openPreview(img)">
              <video v-if="isVideo(img)" class="thumb" :src="fileUrl(img)" muted preload="metadata" playsinline></video>
              <img v-else class="thumb" :src="fileUrl(img)" loading="lazy" :alt="img.filename || ''" />
              <span v-if="isVideo(img)" class="video-badge">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                视频
              </span>
              <div v-if="batchMode" class="select-checkbox" :class="{ checked: selectedIds.has(img.id) }" @click.stop>
                <svg v-if="selectedIds.has(img.id)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div v-else class="thumb-actions" @click.stop>
                <button class="action-btn" title="复制链接" @click="copyLink(img)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </button>
                <button class="action-btn" title="编辑标签" @click="openTagDialog(img)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
                    <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
                  </svg>
                </button>
                <button class="action-btn danger" title="删除" @click="openDeleteDialog(img)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="image-caption">
              <p class="caption-name" :title="img.filename || ''">{{ img.filename || '未命名' }}</p>
              <p class="caption-meta">
                <span v-if="tagList(img).length" class="caption-tags">
                  <span class="tag" v-for="t in tagList(img)" :key="t">{{ t }}</span>
                </span>
                <span>{{ formatDate(img) }} · {{ formatSize(img.size) }}</span>
              </p>
            </div>
          </div>
        </div>
        <div v-else class="state-tip">该相册已无内容</div>
      </div>

      <!-- 相册列表视图 -->
      <template v-else>
        <div class="tabs">
          <button class="tab" :class="{ active: groupMode === 'time' }" @click="groupMode = 'time'">按时间</button>
          <button class="tab" :class="{ active: groupMode === 'tag' }" @click="groupMode = 'tag'">按标签</button>
        </div>

        <div v-if="albums.length" class="album-grid">
          <div class="album-card" v-for="album in albums" :key="album.key" @click="activeKey = album.key">
            <div class="cover-stack" :class="`cover-count-${Math.min(album.images.length, 3)}`">
              <div class="cover-item" v-for="img in album.images.slice(0, 3)" :key="img.id">
                <video v-if="isVideo(img)" class="cover-media" :src="fileUrl(img)" muted preload="metadata" playsinline></video>
                <img v-else class="cover-media" :src="fileUrl(img)" loading="lazy" :alt="album.name" />
              </div>
              <span class="cover-badge">{{ album.images.length }}</span>
            </div>
            <div class="album-info">
              <p class="album-name" :title="album.name">{{ album.name }}</p>
              <p class="album-meta">{{ album.images.length }} 个文件 · {{ formatSize(albumSize(album)) }}</p>
            </div>
          </div>
        </div>
        <div v-else class="state-tip">暂无上传记录，<router-link to="/" class="link">去上传</router-link> 第一张图片吧</div>

        <div v-if="hasMore" class="load-more">
          <button class="load-more-btn" :disabled="loadingMore" @click="loadMore">
            {{ loadingMore ? '加载中...' : '加载更多' }}
          </button>
        </div>
      </template>
    </template>

    <!-- 登录弹窗 -->
    <AuthDialog v-model:open="authOpen" @success="init" />

    <!-- 编辑标签弹窗 -->
    <Dialog :open="tagOpen" @update:open="(v: boolean) => (tagOpen = v)">
      <DialogContent class="max-w-md">
        <div class="flex flex-col gap-1.5 text-center">
          <DialogTitle>编辑标签</DialogTitle>
          <DialogDescription> 为「{{ tagTarget?.filename || '未命名' }}」设置标签，多个标签用英文逗号分隔；标签模式下将按标签自动归入相册。 </DialogDescription>
        </div>
        <input v-model="tagInput" class="dialog-input" type="text" placeholder="例如：风景, 旅行" @keyup.enter="saveTags" />
        <div class="dialog-footer">
          <button class="btn ghost" @click="tagOpen = false">取消</button>
          <button class="btn primary" :disabled="savingTag" @click="saveTags">{{ savingTag ? '保存中...' : '保存' }}</button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 批量编辑标签弹窗 -->
    <Dialog :open="batchDialogOpen" @update:open="(v: boolean) => (batchDialogOpen = v)">
      <DialogContent class="max-w-md">
        <div class="flex flex-col gap-1.5 text-center">
          <DialogTitle>批量编辑标签</DialogTitle>
          <DialogDescription> 将替换 {{ selectedIds.size }} 张图片的标签，多个标签用英文逗号分隔；留空表示清空所有标签。 </DialogDescription>
        </div>
        <input v-model="batchTagInput" class="dialog-input" type="text" placeholder="例如：风景, 旅行" @keyup.enter="saveBatchTags" />
        <div class="dialog-footer">
          <button class="btn ghost" @click="batchDialogOpen = false">取消</button>
          <button class="btn primary" :disabled="batchSaving" @click="saveBatchTags">{{ batchSaving ? '保存中...' : '保存' }}</button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 删除确认弹窗 -->
    <Dialog :open="deleteOpen" @update:open="(v: boolean) => (deleteOpen = v)">
      <DialogContent class="max-w-md">
        <div class="flex flex-col gap-1.5 text-center">
          <DialogTitle>删除图片</DialogTitle>
          <DialogDescription> 确定删除「{{ deleteTarget?.filename || '未命名' }}」吗？删除后将同时移除云端源文件与上传记录，不可恢复。 </DialogDescription>
        </div>
        <div class="dialog-footer">
          <button class="btn ghost" @click="deleteOpen = false">取消</button>
          <button class="btn danger" :disabled="deleting" @click="confirmDelete">{{ deleting ? '删除中...' : '确认删除' }}</button>
        </div>
      </DialogContent>
    </Dialog>
  </section>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import AuthDialog from '@/components/AuthDialog/AuthDialog.vue';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast/use-toast';

const { toast } = useToast();

// 图片记录（与 /api/images 返回字段一致）
interface ImageRecord {
  id: number;
  imgur_id: string | null;
  imgur_url: string;
  filename: string | null;
  size: number | null;
  tags: string | null;
  created_at: string;
}

// 相册（时间模式按月份，标签模式按标签）
interface Album {
  key: string;
  name: string;
  images: ImageRecord[];
}

const PAGE_SIZE = 100;
const UNTAGGED_KEY = '__untagged__';
// IPFS节点（与 Home 保持一致）
const nodeHost = import.meta.env.VITE_IMG_API_URL || location.origin;
// 视频扩展名判定（与 functions/v2/[vkey].js 一致）
const VIDEO_RE = /\.(mp4|webm|avi|mov|mkv|flv|wmv|mpeg|mpg)$/i;

// 页面状态
const loading = ref(true);
const user = ref<{ username: string; avatar_url: string | null; email: string | null } | null>(null);
const authOpen = ref(false);
const images = ref<ImageRecord[]>([]);
const stats = ref<{ total: number; totalSize: number }>({ total: 0, totalSize: 0 });
const groupMode = ref<'time' | 'tag'>('time');
const activeKey = ref('');
const loadingMore = ref(false);

const avatarLetter = computed(() => (user.value?.username || '?')[0].toUpperCase());

// ===== 工具函数 =====
const fileKey = (img: ImageRecord) => img.imgur_url.split('/').pop() || '';
const fileUrl = (img: ImageRecord) => `${nodeHost}/v2/${fileKey(img)}`;
const isVideo = (img: ImageRecord) => VIDEO_RE.test(fileKey(img));
const formatDate = (img: ImageRecord) => (img.created_at || '').slice(0, 10);
const tagList = (img: ImageRecord) =>
  (img.tags || '')
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean);
const albumSize = (album: Album) => album.images.reduce((sum, i) => sum + (i.size || 0), 0);

const formatSize = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${i === 0 || v >= 100 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
};

// ===== 分组 =====
// 时间模式：按 created_at 月份（YYYY-MM）分组；标签模式：按标签多对多分组，无标签归「未标记」
const albums = computed<Album[]>(() => {
  const map = new Map<string, Album>();
  if (groupMode.value === 'time') {
    for (const img of images.value) {
      const key = (img.created_at || '').slice(0, 7) || '未知时间';
      if (!map.has(key)) map.set(key, { key, name: key, images: [] });
      map.get(key)!.images.push(img);
    }
    // 列表本身按时间倒序，key 倒序即相册倒序
    return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
  }
  for (const img of images.value) {
    const tags = tagList(img);
    if (!tags.length) {
      if (!map.has(UNTAGGED_KEY)) map.set(UNTAGGED_KEY, { key: UNTAGGED_KEY, name: '未标记', images: [] });
      map.get(UNTAGGED_KEY)!.images.push(img);
      continue;
    }
    for (const t of tags) {
      if (!map.has(t)) map.set(t, { key: t, name: t, images: [] });
      map.get(t)!.images.push(img);
    }
  }
  // 按各相册最新上传时间倒序
  return [...map.values()].sort((a, b) => (b.images[0]?.created_at || '').localeCompare(a.images[0]?.created_at || ''));
});

const activeAlbum = computed(() => (activeKey.value ? albums.value.find((a) => a.key === activeKey.value) || null : null));
const hasMore = computed(() => images.value.length < stats.value.total);

// ===== 数据加载 =====
const fetchUser = async () => {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    user.value = data.user || null;
  } catch {
    user.value = null;
  }
};

const fetchImages = async (offset = 0) => {
  const res = await fetch(`/api/images?limit=${PAGE_SIZE}&offset=${offset}`);
  if (res.status === 401) {
    user.value = null;
    return;
  }
  const data = await res.json();
  if (!data.success) return;
  stats.value = data.stats || { total: 0, totalSize: 0 };
  if (offset === 0) {
    images.value = data.images;
  } else {
    // 追加时按 id 去重，避免两次请求间新上传导致重复
    const existed = new Set(images.value.map((i) => i.id));
    images.value = [...images.value, ...data.images.filter((i: ImageRecord) => !existed.has(i.id))];
  }
};

const init = async () => {
  loading.value = true;
  images.value = [];
  stats.value = { total: 0, totalSize: 0 };
  activeKey.value = '';
  await fetchUser();
  if (user.value) await fetchImages(0);
  loading.value = false;
};

const loadMore = async () => {
  if (loadingMore.value) return;
  loadingMore.value = true;
  try {
    await fetchImages(images.value.length);
  } finally {
    loadingMore.value = false;
  }
};

onMounted(init);

// ===== 预览（复用 ViewImage 灯箱） =====
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

const openPreview = async (clicked: ImageRecord) => {
  const list = activeAlbum.value?.images || images.value;
  if (!list.length) return;
  await loadViewImage();
  // 构造 mock items，让 ViewImage 能通过 tagName 判断视频
  const mockItems = list.map((i) => ({
    tagName: isVideo(i) ? 'VIDEO' : 'IMG',
    src: fileUrl(i),
    href: fileUrl(i),
  }));
  ViewImage.displayWithVideo(
    list.map((i) => fileUrl(i)),
    fileUrl(clicked),
    mockItems,
    isVideo(clicked),
  );
};

// ===== 复制链接 =====
const copyLink = async (img: ImageRecord) => {
  const url = fileUrl(img);
  let ok = false;
  try {
    await navigator.clipboard.writeText(url);
    ok = true;
  } catch {
    const t = document.createElement('textarea');
    t.value = url;
    document.body.appendChild(t);
    t.select();
    ok = document.execCommand('copy');
    document.body.removeChild(t);
  }
  if (ok) toast({ title: 'Tips', description: '链接已复制' });
};

// ===== 编辑标签 =====
const tagOpen = ref(false);
const tagTarget = ref<ImageRecord | null>(null);
const tagInput = ref('');
const savingTag = ref(false);

const openTagDialog = (img: ImageRecord) => {
  tagTarget.value = img;
  tagInput.value = tagList(img).join(', ');
  tagOpen.value = true;
};

const saveTags = async () => {
  if (!tagTarget.value || savingTag.value) return;
  savingTag.value = true;
  try {
    const res = await fetch(`/api/images/${tagTarget.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: tagInput.value }),
    });
    const data = await res.json();
    if (!data.success) {
      toast({ title: '保存失败', description: data.error, variant: 'destructive' });
      return;
    }
    const idx = images.value.findIndex((i) => i.id === tagTarget.value!.id);
    if (idx > -1) images.value[idx] = data.image;
    // 标签模式下，当前相册可能已不包含该图片，回退到相册列表
    if (groupMode.value === 'tag' && activeAlbum.value && !activeAlbum.value.images.some((i) => i.id === data.image.id)) {
      activeKey.value = '';
    }
    tagOpen.value = false;
    toast({ title: 'Tips', description: '标签已更新' });
  } catch {
    toast({ title: '保存失败', description: '网络错误，请稍后重试', variant: 'destructive' });
  } finally {
    savingTag.value = false;
  }
};

// ===== 批量编辑标签 =====
const batchMode = ref(false);
const selectedIds = ref<Set<number>>(new Set());
const batchDialogOpen = ref(false);
const batchTagInput = ref('');
const batchSaving = ref(false);

const currentAlbumIds = computed(() => new Set(activeAlbum.value?.images.map((i) => i.id) || []));
const isAllSelected = computed(() => currentAlbumIds.value.size > 0 && selectedIds.value.size === currentAlbumIds.value.size);

const enterBatchMode = () => {
  batchMode.value = true;
  selectedIds.value = new Set();
};

const exitBatchMode = () => {
  batchMode.value = false;
  selectedIds.value = new Set();
};

const toggleSelect = (img: ImageRecord) => {
  const next = new Set(selectedIds.value);
  if (next.has(img.id)) next.delete(img.id);
  else next.add(img.id);
  selectedIds.value = next;
};

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = new Set();
  } else {
    selectedIds.value = new Set(currentAlbumIds.value);
  }
};

const openBatchDialog = () => {
  if (!selectedIds.value.size) return;
  batchTagInput.value = '';
  batchDialogOpen.value = true;
};

const saveBatchTags = async () => {
  if (!selectedIds.value.size || batchSaving.value) return;
  batchSaving.value = true;
  try {
    const res = await fetch('/api/images/batch-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selectedIds.value], tags: batchTagInput.value }),
    });
    const data = await res.json();
    if (!data.success) {
      toast({ title: '保存失败', description: data.error, variant: 'destructive' });
      return;
    }
    // 本地更新已修改图片的 tags
    const tagStr = batchTagInput.value.trim();
    for (const id of selectedIds.value) {
      const idx = images.value.findIndex((i) => i.id === id);
      if (idx > -1) {
        images.value[idx] = { ...images.value[idx], tags: tagStr || null };
      }
    }
    // 标签模式下，如果当前相册的图片被清空了标签或标签变了，回退到相册列表
    if (groupMode.value === 'tag' && activeAlbum.value) {
      const albumKey = activeAlbum.value.key;
      const remaining = activeAlbum.value.images.filter((img) => {
        if (!selectedIds.value.has(img.id)) return true;
        const newTags = tagStr
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean);
        if (albumKey === UNTAGGED_KEY) return newTags.length === 0;
        return newTags.includes(albumKey);
      });
      const removedCount = activeAlbum.value.images.length - remaining.length;
      if (!remaining.length) {
        activeKey.value = '';
      } else if (removedCount > 0) {
        toast({
          title: 'Tips',
          description: `已更新 ${data.updated} 张图片的标签，${removedCount} 张已移至其他相册`,
        });
        batchDialogOpen.value = false;
        exitBatchMode();
        return;
      }
    }
    batchDialogOpen.value = false;
    toast({ title: 'Tips', description: `已更新 ${data.updated} 张图片的标签` });
    exitBatchMode();
  } catch {
    toast({ title: '保存失败', description: '网络错误，请稍后重试', variant: 'destructive' });
  } finally {
    batchSaving.value = false;
  }
};

// ===== 删除 =====
const deleteOpen = ref(false);
const deleteTarget = ref<ImageRecord | null>(null);
const deleting = ref(false);

const openDeleteDialog = (img: ImageRecord) => {
  deleteTarget.value = img;
  deleteOpen.value = true;
};

const confirmDelete = async () => {
  if (!deleteTarget.value || deleting.value) return;
  deleting.value = true;
  try {
    const res = await fetch(`/api/images/${deleteTarget.value.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) {
      toast({ title: '删除失败', description: data.error, variant: 'destructive' });
      return;
    }
    const { id, size } = deleteTarget.value;
    images.value = images.value.filter((i) => i.id !== id);
    stats.value = {
      total: Math.max(0, stats.value.total - 1),
      totalSize: Math.max(0, stats.value.totalSize - (size || 0)),
    };
    // 相册删空后自动回到相册列表
    if (activeAlbum.value && !activeAlbum.value.images.length) activeKey.value = '';
    deleteOpen.value = false;
    toast({ title: 'Tips', description: '已删除' });
  } catch {
    toast({ title: '删除失败', description: '网络错误，请稍后重试', variant: 'destructive' });
  } finally {
    deleting.value = false;
  }
};
</script>

<style scoped lang="less">
@import 'Profile.less';
</style>
