<template>
  <section class="Settings">
    <div v-if="loading" class="state-tip">加载中...</div>

    <div v-else-if="!user" class="auth-gate">
      <div class="gate-card">
        <div class="gate-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2>登录后管理个人设置</h2>
        <p>头像、密码、邮箱与第三方授权均在此管理</p>
        <button class="gate-btn" @click="authOpen = true">去登录</button>
      </div>
      <AuthDialog v-model:open="authOpen" @success="onLoginSuccess" />
    </div>

    <template v-else>
      <div class="page-header">
        <h1 class="page-title">账号设置</h1>
        <p class="page-subtitle">查看您的账号信息</p>
        <router-link to="/profile" class="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          返回我的相册
        </router-link>
      </div>

      <!-- 个人信息 -->
      <div class="settings-section">
        <div class="section-title">个人信息</div>
        <div class="card-row avatar-row" :class="{ 'drag-over': avatarDragOver }" @dragover.prevent="avatarDragOver = true" @dragleave.prevent="avatarDragOver = false" @drop.prevent="onAvatarDrop">
          <div class="row-label">
            <div class="row-title">头像</div>
            <div class="row-desc">点击或拖拽图片到此处（JPG/PNG/GIF，最大 10 MB）</div>
          </div>
          <div class="row-value row-value-avatar">
            <input ref="avatarInputRef" type="file" accept="image/jpeg,image/png,image/gif,image/webp" class="avatar-input-hidden" @change="onAvatarFileChange" />
            <img v-if="avatarUrl" :src="avatarUrl" class="row-avatar" @click="avatarInputRef?.click()" />
            <div v-else class="row-avatar row-avatar-default" @click="avatarInputRef?.click()">{{ avatarLetter }}</div>
          </div>
        </div>
        <div class="card-row">
          <div class="row-label">
            <div class="row-title">昵称</div>
            <div class="row-desc">您的个人资料名称</div>
          </div>
          <div class="row-value">
            <div v-if="!editingUsername" class="row-text" @dblclick.prevent="startEditUsername">
              <span class="row-text-label">{{ user.username }}</span>
              <svg class="edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" @click.stop="startEditUsername">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
            </div>
            <div v-else class="row-edit">
              <input v-model="usernameDraft" type="text" maxlength="32" class="row-edit-input" @keyup.enter="saveUsername" @keyup.escape="cancelEditUsername" />
              <button class="row-edit-btn save" @click="saveUsername" :disabled="profileEdit.submitting">{{ profileEdit.submitting ? '保存中' : '保存' }}</button>
              <button class="row-edit-btn cancel" @click="cancelEditUsername">取消</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 账号操作 -->
      <div class="settings-section">
        <div class="section-title">账号操作</div>
        <div class="card-row">
          <div class="row-label">
            <div class="row-title">登录密码</div>
            <div class="row-desc">{{ hasEmailBound ? '已设置密码' : '未设置密码' }}</div>
          </div>
          <div class="row-value">
            <button v-if="hasEmailBound" class="btn-action" @click="openPwdDialog">修改</button>
            <button v-else class="btn-action" @click="openEmailDialog">设置密码</button>
          </div>
        </div>
        <div class="card-row">
          <div class="row-label">
            <div class="row-title">邮箱</div>
            <div class="row-desc">{{ user.email || '未绑定' }}</div>
          </div>
          <div class="row-value">
            <button v-if="hasEmailBound" class="btn-action" @click="openEmailDialog">更换</button>
            <button v-else class="btn-action" @click="openEmailDialog">绑定</button>
          </div>
        </div>
        <div v-for="provider in providerRows" :key="provider.key" class="card-row">
          <div class="row-label">
            <div class="row-title">{{ provider.label }}</div>
            <div class="row-desc">{{ provider.bound ? (provider.email || '已绑定') : '未绑定' }}</div>
          </div>
          <div class="row-value">
            <button v-if="!provider.bound" class="btn-action" @click="bindOAuth(provider.key)">去绑定</button>
            <span v-else class="badge-on">已绑定</span>
          </div>
        </div>
        <div class="card-row">
          <div class="row-label">
            <div class="row-title">退出当前账号</div>
          </div>
          <div class="row-value">
            <button class="btn-action" @click="handleLogout">退出登录</button>
          </div>
        </div>
      </div>

      <!-- 注销账号 -->
      <div class="settings-section">
        <div class="section-title">注销账号</div>
        <div class="card-row">
          <div class="row-label">
            <div class="row-title">注销账号</div>
            <div class="row-desc">注销后将无法恢复，请谨慎操作</div>
          </div>
          <div class="row-value">
            <button class="btn-danger" @click="showDeleteConfirm = true">注销账号</button>
          </div>
        </div>
      </div>
    </template>

    <!-- 密码修改弹窗 -->
    <Dialog :open="showPwdDialog" @update:open="onPwdDialogChange">
      <DialogContent>
        <div class="dialog-head-center">
          <DialogTitle>修改登录密码</DialogTitle>
          <DialogDescription>修改成功后将自动退出，需重新登录</DialogDescription>
        </div>
        <form class="dialog-form" @submit.prevent="submitPassword">
          <label class="field">
            <span class="field-label">当前密码</span>
            <span class="field-input">
              <input v-model="pwdForm.current" :type="showPwd.cur ? 'text' : 'password'" placeholder="请输入当前密码" required />
              <button type="button" class="eye-btn" @click="showPwd.cur = !showPwd.cur">
                <svg v-if="showPwd.cur" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                  <line x1="2" x2="22" y1="2" y2="22" />
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </span>
          </label>
          <label class="field">
            <span class="field-label">新密码</span>
            <span class="field-input">
              <input v-model="pwdForm.next" :type="showPwd.next ? 'text' : 'password'" placeholder="至少 6 位" required />
              <button type="button" class="eye-btn" @click="showPwd.next = !showPwd.next">
                <svg v-if="showPwd.next" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                  <line x1="2" x2="22" y1="2" y2="22" />
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </span>
          </label>
          <label class="field">
            <span class="field-label">确认新密码</span>
            <span class="field-input">
              <input v-model="pwdForm.confirm" :type="showPwd.confirm ? 'text' : 'password'" placeholder="再次输入新密码" required />
              <button type="button" class="eye-btn" @click="showPwd.confirm = !showPwd.confirm">
                <svg v-if="showPwd.confirm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                  <line x1="2" x2="22" y1="2" y2="22" />
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </span>
          </label>
          <div class="dialog-footer">
            <button type="button" class="btn ghost" @click="showPwdDialog = false">取消</button>
            <button type="submit" class="btn primary" :disabled="pwdForm.submitting">{{ pwdForm.submitting ? '提交中...' : '确认修改' }}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <!-- 邮箱绑定/更换弹窗 -->
    <Dialog :open="showEmailDialog" @update:open="onEmailDialogChange">
      <DialogContent>
        <div class="dialog-head-center">
          <DialogTitle>{{ hasEmailBound ? '更换邮箱' : '绑定邮箱' }}</DialogTitle>
          <DialogDescription>{{ hasEmailBound ? '更改当前登录邮箱，需通过新邮箱验证码与当前密码确认' : '绑定邮箱后即可使用邮箱密码登录本账号' }}</DialogDescription>
        </div>
        <div v-if="hasEmailBound" class="current-email-row">
          <div class="current-email-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <div class="current-email-meta">
            <span class="current-email-label">当前邮箱</span>
            <span class="current-email-value">{{ user.email }}</span>
          </div>
          <span class="bound-badge">已验证</span>
        </div>
        <Transition name="fade-slide" mode="out-in">
          <form v-if="bindStep === 'email'" key="email" class="dialog-form" @submit.prevent="startBindEmail">
            <label class="field">
              <span class="field-label">{{ hasEmailBound ? '更改后的邮箱地址' : '邮箱地址' }}</span>
              <span class="field-input">
                <input ref="emailInputRef" v-model="bindEmail" type="email" :placeholder="hasEmailBound ? '请输入新邮箱地址' : '请输入邮箱地址'" required />
              </span>
            </label>
            <div class="dialog-footer">
              <button type="submit" class="btn primary" :disabled="bindSubmitting">{{ bindSubmitting ? '发送中...' : '发送验证码' }}</button>
            </div>
          </form>
          <form v-else key="code" class="dialog-form" @submit.prevent="confirmBindEmail">
            <p class="step-hint">
              验证码已发送至 <strong>{{ bindEmail }}</strong>
              <a class="step-change" @click="resetBind">重新填写</a>
            </p>
            <label class="field">
              <span class="field-label">验证码</span>
              <span class="field-input code-row">
                <input ref="codeInputRef" v-model="bindCode" type="text" inputmode="numeric" maxlength="6" placeholder="输入 6 位验证码" class="code-input" required />
                <button type="button" class="resend-btn" :disabled="bindCountdown > 0 || bindSubmitting" @click="resendCode">
                  {{ bindCountdown > 0 ? `${bindCountdown}s 后可重发` : '重新发送' }}
                </button>
              </span>
            </label>
            <label v-if="hasEmailBound" class="field">
              <span class="field-label">当前密码</span>
              <span class="field-input">
                <input v-model="bindCurrentPassword" :type="showPwd.bindCur ? 'text' : 'password'" placeholder="输入当前密码以验证身份" required />
                <button type="button" class="eye-btn" @click="showPwd.bindCur = !showPwd.bindCur">
                  <svg v-if="showPwd.bindCur" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" x2="22" y1="2" y2="22" />
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </span>
            </label>
            <label v-else class="field">
              <span class="field-label">设置登录密码</span>
              <span class="field-input">
                <input v-model="bindPassword" :type="showPwd.bindNew ? 'text' : 'password'" placeholder="至少 6 位" required />
                <button type="button" class="eye-btn" @click="showPwd.bindNew = !showPwd.bindNew">
                  <svg v-if="showPwd.bindNew" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" x2="22" y1="2" y2="22" />
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </span>
            </label>
            <div class="dialog-footer">
              <button type="button" class="btn ghost" @click="resetBind">上一步</button>
              <button type="submit" class="btn primary" :disabled="bindSubmitting">{{ bindSubmitting ? '提交中...' : hasEmailBound ? '确认更换' : '确认绑定' }}</button>
            </div>
          </form>
        </Transition>
      </DialogContent>
    </Dialog>

    <!-- 注销账号确认弹窗 -->
    <Dialog :open="showDeleteConfirm" @update:open="showDeleteConfirm = $event">
      <DialogContent class="delete-dialog">
        <div class="dialog-head-center">
          <DialogTitle>确认注销账号</DialogTitle>
          <DialogDescription>注销后将无法恢复，所有数据将被永久删除</DialogDescription>
        </div>
        <div class="dialog-footer">
          <button class="btn ghost" @click="showDeleteConfirm = false">取消</button>
          <button class="btn danger" @click="confirmDeleteAccount">确认注销</button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- 头像裁剪弹窗 -->
    <Dialog :open="cropOpen" @update:open="onCropDialogChange">
      <DialogContent class="avatar-crop-dialog">
        <div class="dialog-head-center">
          <DialogTitle>裁剪头像</DialogTitle>
          <DialogDescription>拖拽调整位置，滑动滑块缩放图片</DialogDescription>
        </div>
        <div
          class="crop-frame"
          @mousedown="startCropDrag"
          @touchstart.prevent="startCropDrag"
        >
          <img
            v-if="cropSrc"
            ref="cropImgRef"
            :src="cropSrc"
            class="crop-img"
            :style="{ transform: `translate(-50%, -50%) translate(${cropX}px, ${cropY}px) scale(${displayScale})` }"
            @load="onCropImgLoad"
            alt="头像预览"
          />
          <div class="crop-mask"></div>
        </div>
        <div class="crop-controls">
          <svg class="crop-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /><path d="M11 8v6" /><path d="M8 11h6" /></svg>
          <input type="range" min="1" max="3" step="0.01" :value="cropScale" @input="cropScale = Number(($event.target as HTMLInputElement).value)" class="crop-slider" />
          <svg class="crop-icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /><path d="M8 11h6" /></svg>
        </div>
        <div class="dialog-footer">
          <button class="btn ghost" @click="cropOpen = false">取消</button>
          <button class="btn primary" :disabled="avatarUploading" @click="confirmCrop">{{ avatarUploading ? '上传中...' : '确认裁剪' }}</button>
        </div>
      </DialogContent>
    </Dialog>
  </section>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import AuthDialog from '@/components/AuthDialog/AuthDialog.vue';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast/use-toast';

const { toast } = useToast();
const nodeHost = import.meta.env.VITE_IMG_API_URL || location.origin;

// ===== 用户信息 =====
const loading = ref(true);
const authOpen = ref(false);
const user = ref<{ id?: number; username: string; avatar_url: string | null; email: string | null; created_at?: string; auth_methods?: { provider: string; email: string | null }[] } | null>(null);

const avatarLetter = computed(() => (user.value?.username || '?')[0].toUpperCase());
const hasEmailBound = computed(() => user.value?.auth_methods?.some((m) => m.provider === 'email') ?? false);

// 头像代理：i.imgur.com 直连国内无法访问，统一走 /v2/ 代理
const avatarUrl = computed(() => {
  const url = user.value?.avatar_url || '';
  if (!url) return '';
  if (url.startsWith(`${nodeHost}/v2/`) || url.startsWith('data:')) return url;
  const fileId = url.split('/').pop();
  return fileId ? `${nodeHost}/v2/${fileId}` : url;
});

const fetchUser = async () => {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    user.value = data.user || null;
  } catch {
    user.value = null;
  }
};

const onAuthChanged = () => fetchUser();

onMounted(async () => {
  await fetchUser();
  loading.value = false;
  window.addEventListener('auth:changed', onAuthChanged);
});

onUnmounted(() => {
  window.removeEventListener('auth:changed', onAuthChanged);
  if (countdownTimer) clearInterval(countdownTimer);
});

async function onLoginSuccess() {
  await fetchUser();
  window.dispatchEvent(new Event('auth:changed'));
}

// ===== 内联昵称编辑 =====
const editingUsername = ref(false);
const usernameDraft = ref('');

// ===== 弹窗状态 =====
const showPwdDialog = ref(false);
const showEmailDialog = ref(false);
const showDeleteConfirm = ref(false);

// ===== 个人信息编辑 =====
const profileEdit = ref({ username: '', avatar_url: '', submitting: false });
const avatarInputRef = ref<HTMLInputElement | null>(null);
const avatarUploading = ref(false);
const avatarDragOver = ref(false);

watch(user, (u) => {
  if (u) {
    profileEdit.value.username = u.username || '';
    profileEdit.value.avatar_url = u.avatar_url || '';
  }
}, { immediate: true });

// 校验头像文件并打开裁剪弹窗
function processAvatarFile(file: File) {
  if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) {
    toast({ title: '仅支持 JPG/PNG/GIF/WebP 格式', variant: 'destructive' });
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    toast({ title: '头像图片不能超过 10MB', variant: 'destructive' });
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    cropSrc.value = reader.result as string;
    cropOpen.value = true;
  };
  reader.readAsDataURL(file);
}

// 头像选择：校验后打开裁剪弹窗
async function onAvatarFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  input.value = '';
  processAvatarFile(file);
}

// 拖拽上传头像
function onAvatarDrop(e: DragEvent) {
  avatarDragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) processAvatarFile(file);
}

// ===== 头像裁剪 =====
const CROP_FRAME = 240;
const CROP_OUTPUT = 256;
const cropOpen = ref(false);
const cropSrc = ref('');
const cropScale = ref(1);
const cropX = ref(0);
const cropY = ref(0);
const cropImgRef = ref<HTMLImageElement | null>(null);
const cropNatural = ref({ w: 0, h: 0 });
let dragState = { active: false, sx: 0, sy: 0, cx: 0, cy: 0 };

const baseScale = computed(() => {
  const { w, h } = cropNatural.value;
  if (!w || !h) return 1;
  return Math.max(CROP_FRAME / w, CROP_FRAME / h);
});
const displayScale = computed(() => baseScale.value * cropScale.value);

// 裁剪弹窗状态变化：上传中时禁止关闭，避免状态混乱
function onCropDialogChange(v: boolean) {
  if (!v && avatarUploading.value) return;
  cropOpen.value = v;
}

function onCropImgLoad() {
  if (cropImgRef.value) {
    cropNatural.value = { w: cropImgRef.value.naturalWidth, h: cropImgRef.value.naturalHeight };
  }
  cropScale.value = 1;
  cropX.value = 0;
  cropY.value = 0;
}

function startCropDrag(e: MouseEvent | TouchEvent) {
  const pt = 'touches' in e ? e.touches[0] : e;
  dragState = { active: true, sx: pt.clientX, sy: pt.clientY, cx: cropX.value, cy: cropY.value };
  window.addEventListener('mousemove', onCropDrag);
  window.addEventListener('mouseup', endCropDrag);
  window.addEventListener('touchmove', onCropDrag, { passive: false });
  window.addEventListener('touchend', endCropDrag);
}
function onCropDrag(e: MouseEvent | TouchEvent) {
  if (!dragState.active) return;
  e.preventDefault();
  const pt = 'touches' in e ? e.touches[0] : e;
  cropX.value = dragState.cx + (pt.clientX - dragState.sx);
  cropY.value = dragState.cy + (pt.clientY - dragState.sy);
}
function endCropDrag() {
  dragState.active = false;
  window.removeEventListener('mousemove', onCropDrag);
  window.removeEventListener('mouseup', endCropDrag);
  window.removeEventListener('touchmove', onCropDrag);
  window.removeEventListener('touchend', endCropDrag);
}

async function confirmCrop() {
  if (!cropImgRef.value || avatarUploading.value) return;
  avatarUploading.value = true;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = CROP_OUTPUT;
    canvas.height = CROP_OUTPUT;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      toast({ title: '裁剪失败', variant: 'destructive' });
      return;
    }
    const { w, h } = cropNatural.value;
    const ds = displayScale.value;
    const sw = CROP_FRAME / ds;
    const sh = CROP_FRAME / ds;
    const sx = w / 2 - sw / 2 - cropX.value / ds;
    const sy = h / 2 - sh / 2 - cropY.value / ds;
    ctx.drawImage(cropImgRef.value, sx, sy, sw, sh, 0, 0, CROP_OUTPUT, CROP_OUTPUT);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
    if (!blob) {
      toast({ title: '裁剪失败', variant: 'destructive' });
      return;
    }
    const formData = new FormData();
    formData.append('file', blob, 'avatar.jpg');
    const res = await fetch(`${nodeHost}/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok || !data?.data?.link) {
      toast({ title: '头像上传失败', description: data?.data?.error || data?.error || '', variant: 'destructive' });
      return;
    }
    // data.data.link 形如 https://i.imgur.com/xxx.png，国内直连失败，转走 /v2/ 代理
    const imgurFileId = (data.data.link as string).split('/').pop() || '';
    const avatarUrl = imgurFileId ? `${nodeHost}/v2/${imgurFileId}` : data.data.link;
    profileEdit.value.avatar_url = avatarUrl;
    cropOpen.value = false;
    await nextTick();
    // 立即保存到数据库，并通知全站（Header/Profile）更新头像
    try {
      const saveRes = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: avatarUrl }),
      });
      const saveData = await saveRes.json();
      if (saveData.success) {
        toast({ title: '头像已更新' });
        await fetchUser();
        window.dispatchEvent(new Event('auth:changed'));
      } else {
        toast({ title: '头像已上传，保存失败', description: saveData.error || '', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: '头像已上传，网络错误', description: (err as Error).message, variant: 'destructive' });
    }
  } catch (err) {
    toast({ title: '网络错误', description: (err as Error).message, variant: 'destructive' });
  } finally {
    avatarUploading.value = false;
  }
}

// 保存个人信息（用户名 + 头像）
async function submitProfile() {
  const trimmedName = profileEdit.value.username.trim();
  if (!trimmedName) {
    toast({ title: '用户名不能为空', variant: 'destructive' });
    return;
  }
  if (trimmedName.length > 32) {
    toast({ title: '用户名不能超过 32 个字符', variant: 'destructive' });
    return;
  }
  profileEdit.value.submitting = true;
  try {
    const res = await fetch('/api/auth/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: trimmedName, avatar_url: profileEdit.value.avatar_url.trim() }),
    });
    const data = await res.json();
    if (!data.success) {
      toast({ title: '保存失败', description: data.error || '', variant: 'destructive' });
      return;
    }
    toast({ title: '个人信息已更新' });
    await fetchUser();
    window.dispatchEvent(new Event('auth:changed'));
  } catch (err) {
    toast({ title: '网络错误', description: (err as Error).message, variant: 'destructive' });
  } finally {
    profileEdit.value.submitting = false;
  }
}

// ===== 修改密码（旧密码方式） =====
const showPwd = ref<Record<string, boolean>>({});
const pwdForm = ref({ current: '', next: '', confirm: '', submitting: false });

async function submitPassword() {
  if (pwdForm.value.current.length < 6) {
    toast({ title: '请输入当前密码', variant: 'destructive' });
    return;
  }
  if (pwdForm.value.next.length < 6) {
    toast({ title: '新密码至少 6 位', variant: 'destructive' });
    return;
  }
  if (pwdForm.value.next !== pwdForm.value.confirm) {
    toast({ title: '两次密码不一致', variant: 'destructive' });
    return;
  }
  if (pwdForm.value.next === pwdForm.value.current) {
    toast({ title: '新密码不能与旧密码一致', variant: 'destructive' });
    return;
  }
  pwdForm.value.submitting = true;
  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: pwdForm.value.current, new_password: pwdForm.value.next }),
    });
    const data = await res.json();
    if (!data.success) {
      toast({ title: '修改失败', description: data.error || '', variant: 'destructive' });
      return;
    }
    toast({ title: '密码修改成功，请重新登录' });
    // 退出登录，回到门禁引导重新登录
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    await fetchUser();
    window.dispatchEvent(new Event('auth:changed'));
    pwdForm.value = { current: '', next: '', confirm: '', submitting: false };
  } catch (err) {
    toast({ title: '网络错误', description: (err as Error).message, variant: 'destructive' });
  } finally {
    pwdForm.value.submitting = false;
  }
}

// ===== 邮箱绑定/更换 =====
const bindEmail = ref('');
const bindPassword = ref('');
const bindCurrentPassword = ref('');
const bindCode = ref('');
const bindStep = ref<'email' | 'code'>('email');
const bindSubmitting = ref(false);
const bindCountdown = ref(0);
const emailInputRef = ref<HTMLInputElement | null>(null);
const codeInputRef = ref<HTMLInputElement | null>(null);
let countdownTimer: number | null = null;

const startCountdown = () => {
  bindCountdown.value = 60;
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = window.setInterval(() => {
    bindCountdown.value--;
    if (bindCountdown.value <= 0) {
      if (countdownTimer) clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }, 1000);
};

const focusInput = () => {
  nextTick(() => {
    (bindStep.value === 'email' ? emailInputRef.value : codeInputRef.value)?.focus();
  });
};

watch(bindStep, () => focusInput());

const resetBind = () => {
  bindStep.value = 'email';
  bindEmail.value = '';
  bindCode.value = '';
  bindPassword.value = '';
  bindCurrentPassword.value = '';
};

async function startBindEmail() {
  if (!bindEmail.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bindEmail.value)) {
    toast({ title: '邮箱格式不正确', variant: 'destructive' });
    return;
  }
  bindSubmitting.value = true;
  try {
    const res = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: bindEmail.value, purpose: 'bind-email' }),
    });
    const data = await res.json();
    if (!data.success) {
      toast({ title: '发送失败', description: data.error || '', variant: 'destructive' });
      return;
    }
    bindStep.value = 'code';
    startCountdown();
  } catch (err) {
    toast({ title: '网络错误', description: (err as Error).message, variant: 'destructive' });
  } finally {
    bindSubmitting.value = false;
  }
}

async function resendCode() {
  bindSubmitting.value = true;
  try {
    const res = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: bindEmail.value, purpose: 'bind-email' }),
    });
    const data = await res.json();
    if (!data.success) {
      toast({ title: '发送失败', description: data.error || '', variant: 'destructive' });
      return;
    }
    toast({ title: '验证码已重新发送' });
    startCountdown();
  } catch (err) {
    toast({ title: '网络错误', description: (err as Error).message, variant: 'destructive' });
  } finally {
    bindSubmitting.value = false;
  }
}

async function confirmBindEmail() {
  if (bindCode.value.length !== 6) {
    toast({ title: '请输入 6 位验证码', variant: 'destructive' });
    return;
  }
  if (hasEmailBound.value && bindCurrentPassword.value.length < 6) {
    toast({ title: '请输入当前密码', variant: 'destructive' });
    return;
  }
  if (!hasEmailBound.value && bindPassword.value.length < 6) {
    toast({ title: '密码至少 6 位', variant: 'destructive' });
    return;
  }
  bindSubmitting.value = true;
  try {
    // 验证码换 token
    const verifyRes = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: bindEmail.value, code: bindCode.value, purpose: 'bind-email' }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      toast({ title: '验证失败', description: verifyData.error || '', variant: 'destructive' });
      return;
    }
    // 绑定/更换邮箱
    const bindRes = await fetch('/api/auth/bind-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: bindEmail.value,
        password: hasEmailBound.value ? undefined : bindPassword.value,
        token: verifyData.token,
        current_password: hasEmailBound.value ? bindCurrentPassword.value : undefined,
      }),
    });
    const bindData = await bindRes.json();
    if (!bindData.success) {
      toast({ title: hasEmailBound.value ? '更换失败' : '绑定失败', description: bindData.error || '', variant: 'destructive' });
      return;
    }
    toast({ title: hasEmailBound.value ? '邮箱更换成功' : '邮箱绑定成功' });
    resetBind();
    await fetchUser();
    window.dispatchEvent(new Event('auth:changed'));
  } catch (err) {
    toast({ title: '网络错误', description: (err as Error).message, variant: 'destructive' });
  } finally {
    bindSubmitting.value = false;
  }
}

// ===== 授权管理 =====
const PROVIDER_META = [
  { key: 'github', label: 'GitHub' },
  { key: 'google', label: 'Google' },
  { key: 'gitee', label: 'Gitee' },
];

const providerRows = computed(() =>
  PROVIDER_META.map((p) => {
    const bound = user.value?.auth_methods?.find((m) => m.provider === p.key);
    return { ...p, bound: !!bound, email: bound?.email || '' };
  }),
);

// 账号信息区辅助函数
const providerLabel = (provider: string) => PROVIDER_META.find((p) => p.key === provider)?.label || provider;
const formatDate = (d?: string) => (d || '').slice(0, 16).replace('T', ' ');

// ===== 昵称内联编辑 =====
function startEditUsername() {
  if (!user.value) return;
  usernameDraft.value = user.value.username || '';
  editingUsername.value = true;
}

async function saveUsername() {
  const trimmedName = usernameDraft.value.trim();
  if (!trimmedName) {
    toast({ title: '用户名不能为空', variant: 'destructive' });
    return;
  }
  if (trimmedName.length > 32) {
    toast({ title: '用户名不能超过 32 个字符', variant: 'destructive' });
    return;
  }
  profileEdit.value.submitting = true;
  try {
    const res = await fetch('/api/auth/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: trimmedName }),
    });
    const data = await res.json();
    if (!data.success) {
      toast({ title: '保存失败', description: data.error || '', variant: 'destructive' });
      return;
    }
    toast({ title: '昵称已更新' });
    editingUsername.value = false;
    await fetchUser();
    window.dispatchEvent(new Event('auth:changed'));
  } catch (err) {
    toast({ title: '网络错误', description: (err as Error).message, variant: 'destructive' });
  } finally {
    profileEdit.value.submitting = false;
  }
}

function cancelEditUsername() {
  editingUsername.value = false;
  usernameDraft.value = '';
}

// ===== 弹窗控制 =====
function openPwdDialog() {
  showPwdDialog.value = true;
}

function onPwdDialogChange(v: boolean) {
  showPwdDialog.value = v;
  if (!v) {
    pwdForm.value = { current: '', next: '', confirm: '', submitting: false };
  }
}

function openEmailDialog() {
  showEmailDialog.value = true;
  resetBind();
}

function onEmailDialogChange(v: boolean) {
  showEmailDialog.value = v;
  if (!v) {
    resetBind();
  }
}

// ===== 退出登录 =====
async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {}
  await fetchUser();
  window.dispatchEvent(new Event('auth:changed'));
}

// ===== OAuth 绑定 =====
function bindOAuth(provider: string) {
  toast({ title: `即将跳转到${providerLabel(provider)}授权页面` });
  setTimeout(() => {
    window.location.href = `/api/auth/${provider}?bind=1`;
  }, 500);
}

// ===== 注销账号 =====
async function confirmDeleteAccount() {
  showDeleteConfirm.value = false;
  toast({ title: '注销账号功能开发中', description: '此功能即将上线，敬请期待' });
}
</script>

<style scoped lang="less">
@import 'Settings.less';
</style>
