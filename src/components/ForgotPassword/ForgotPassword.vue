<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast/use-toast';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'success'): void;
}>();

const { toast } = useToast();

/** step：email 输邮箱 | code 验证码 | reset 设置新密码 */
const step = ref<'email' | 'code' | 'reset'>('email');
const email = ref('');
const code = ref('');
const newPassword = ref('');
const confirmNewPassword = ref('');
const showNewPassword = ref(false);
const showConfirmNewPassword = ref(false);
const resetToken = ref('');
const submitting = ref(false);
const countdown = ref(0);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

const title = computed(() => {
  switch (step.value) {
    case 'email':
      return '找回密码';
    case 'code':
      return '输入验证码';
    case 'reset':
      return '设置新密码';
    default:
      return '找回密码';
  }
});

const desc = computed(() => {
  switch (step.value) {
    case 'email':
      return '输入注册邮箱，我们将发送验证码';
    case 'code':
      return `验证码已发送至 ${email.value}`;
    case 'reset':
      return '请设置您的新密码';
    default:
      return '';
  }
});

/** 弹窗开关变化时重置状态 */
watch(
  () => props.open,
  (val) => {
    if (val) {
      step.value = 'email';
      email.value = '';
      code.value = '';
      newPassword.value = '';
      confirmNewPassword.value = '';
      showNewPassword.value = false;
      showConfirmNewPassword.value = false;
      resetToken.value = '';
      countdown.value = 0;
    }
  },
);

function startCountdown() {
  countdown.value = 60;
  countdownTimer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0 && countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }, 1000);
}

/** 步骤 1：发送验证码 */
async function sendCode() {
  if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    toast({ title: '邮箱格式不正确', variant: 'destructive' });
    return;
  }
  submitting.value = true;
  try {
    const res = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, purpose: 'reset' }),
    });
    const data = await res.json();
    if (!data.success) {
      toast({ title: '发送失败', description: data.error || '', variant: 'destructive' });
      return;
    }
    step.value = 'code';
    code.value = '';
    startCountdown();
  } catch (err) {
    toast({ title: '网络错误', description: (err as Error).message, variant: 'destructive' });
  } finally {
    submitting.value = false;
  }
}

/** 步骤 2：校验验证码 */
async function verifyCode() {
  if (code.value.length !== 6) {
    toast({ title: '请输入 6 位验证码', variant: 'destructive' });
    return;
  }
  submitting.value = true;
  try {
    const res = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, code: code.value, purpose: 'reset' }),
    });
    const data = await res.json();
    if (!data.success) {
      toast({ title: '验证失败', description: data.error || '', variant: 'destructive' });
      return;
    }
    resetToken.value = data.token;
    step.value = 'reset';
  } catch (err) {
    toast({ title: '网络错误', description: (err as Error).message, variant: 'destructive' });
  } finally {
    submitting.value = false;
  }
}

/** 步骤 3：重置密码 */
async function resetPassword() {
  if (newPassword.value.length < 6) {
    toast({ title: '密码至少 6 位', variant: 'destructive' });
    return;
  }
  if (newPassword.value !== confirmNewPassword.value) {
    toast({ title: '两次密码不一致', variant: 'destructive' });
    return;
  }
  submitting.value = true;
  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value,
        password: newPassword.value,
        token: resetToken.value,
      }),
    });
    const data = await res.json();
    if (!data.success) {
      toast({ title: '重置失败', description: data.error || '', variant: 'destructive' });
      return;
    }
    toast({ title: '密码重置成功', description: '请使用新密码登录' });
    emit('update:open', false);
    emit('success');
  } catch (err) {
    toast({ title: '网络错误', description: (err as Error).message, variant: 'destructive' });
  } finally {
    submitting.value = false;
  }
}

/** 提交按钮分发 */
async function handleSubmit() {
  if (step.value === 'email') {
    await sendCode();
  } else if (step.value === 'code') {
    await verifyCode();
  } else {
    await resetPassword();
  }
}

/** 禁用点击遮罩和 ESC 关闭弹窗，仅保留 X 按钮 */
const preventDismiss = (e: Event) => {
  e.preventDefault();
};

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer);
});
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-md" @escape-key-down="preventDismiss" @pointer-down-outside="preventDismiss" @interact-outside="preventDismiss">
      <div class="flex flex-col gap-1.5 mb-2 text-center">
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ desc }}</DialogDescription>
      </div>

      <!-- 步骤 1：输入邮箱 -->
      <form v-if="step === 'email'" class="flex flex-col gap-3" @submit.prevent="handleSubmit">
        <label class="fp-field">
          <span class="fp-label">邮箱</span>
          <input v-model="email" type="email" class="fp-input" placeholder="请输入注册邮箱" required />
        </label>
        <button type="submit" class="fp-submit" :disabled="submitting">
          {{ submitting ? '发送中...' : '发送验证码' }}
        </button>
      </form>

      <!-- 步骤 2：输入验证码 -->
      <form v-else-if="step === 'code'" class="flex flex-col gap-3" @submit.prevent="handleSubmit">
        <label class="fp-field">
          <span class="fp-label">验证码</span>
          <input v-model="code" type="text" maxlength="6" autocomplete="one-time-code" class="fp-input fp-code-input" placeholder="------" required />
        </label>
        <button type="submit" class="fp-submit" :disabled="submitting">
          {{ submitting ? '验证中...' : '验证' }}
        </button>
        <div class="fp-switch">
          没收到？
          <a v-if="countdown > 0" class="fp-link-disabled">{{ countdown }}s 后可重发</a>
          <a v-else class="fp-link" @click="sendCode">重新发送</a>
        </div>
      </form>

      <!-- 步骤 3：设置新密码 -->
      <form v-else class="flex flex-col gap-3" @submit.prevent="handleSubmit">
        <label class="fp-field">
          <span class="fp-label">新密码</span>
          <div class="fp-password-wrap">
            <input v-model="newPassword" :type="showNewPassword ? 'text' : 'password'" autocomplete="new-password" class="fp-input" placeholder="请输入新密码（至少 6 位）" required />
            <button type="button" class="fp-password-toggle" @click="showNewPassword = !showNewPassword">
              <svg v-if="!showNewPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                <line x1="2" x2="22" y1="2" y2="22" />
              </svg>
            </button>
          </div>
        </label>
        <label class="fp-field">
          <span class="fp-label">确认新密码</span>
          <div class="fp-password-wrap">
            <input v-model="confirmNewPassword" :type="showConfirmNewPassword ? 'text' : 'password'" autocomplete="new-password" class="fp-input" placeholder="再次输入新密码" required />
            <button type="button" class="fp-password-toggle" @click="showConfirmNewPassword = !showConfirmNewPassword">
              <svg v-if="!showConfirmNewPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                <line x1="2" x2="22" y1="2" y2="22" />
              </svg>
            </button>
          </div>
        </label>
        <button type="submit" class="fp-submit" :disabled="submitting">
          {{ submitting ? '重置中...' : '重置密码' }}
        </button>
      </form>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.fp-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.fp-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: hsl(var(--foreground));
  white-space: nowrap;
}

.fp-input {
  box-sizing: border-box;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius);
  border: 1px solid hsl(var(--input));
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  font-size: 0.875rem;
  outline: none;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.fp-input:focus {
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 2px hsl(var(--ring));
}

.fp-code-input {
  letter-spacing: 0.5em;
  text-align: center;
}

.fp-password-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.fp-password-wrap .fp-input {
  padding-right: 2.5rem;
}

.fp-password-toggle {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  color: hsl(var(--muted-foreground));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
}

.fp-password-toggle svg {
  width: 1.1rem;
  height: 1.1rem;
}

.fp-password-toggle:hover {
  color: hsl(var(--foreground));
}

.fp-submit {
  padding: 0.625rem 1rem;
  border-radius: var(--radius);
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  white-space: nowrap;
}

.fp-submit:hover {
  opacity: 0.9;
}

.fp-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.fp-switch {
  text-align: center;
  font-size: 0.8rem;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

.fp-link {
  color: hsl(var(--primary));
  cursor: pointer;
  font-weight: 500;
}

.fp-link:hover {
  text-decoration: underline;
}

.fp-link-disabled {
  color: hsl(var(--muted-foreground));
  cursor: not-allowed;
}
</style>
