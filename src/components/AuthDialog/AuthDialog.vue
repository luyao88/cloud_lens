<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast/use-toast';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'success'): void;
  (e: 'forgot'): void;
}>();

const { toast } = useToast();

/** step 状态：methods 方式选择 | email-login 登录 | email-register 注册 | email-verify 验证码 */
const step = ref<'methods' | 'email-login' | 'email-register' | 'email-verify'>('methods');

// 表单数据
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const code = ref('');
// 注册：默认不勾选，需用户主动勾选后按钮才可点击
const agreedToTerms = ref(false);
// 注册流程：验证通过后拿到的临时 token
const verifyToken = ref('');
// 记住我
const rememberMe = ref(true);
// 上次登录邮箱
const LAST_EMAIL_KEY = 'cloudlens_last_email';
// 密码显示/隐藏
const showPassword = ref(false);
const showConfirmPassword = ref(false);
// 重发验证码倒计时
const countdown = ref(0);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

// loading 态
const submitting = ref(false);

/** 弹窗标题 */
const title = computed(() => {
  switch (step.value) {
    case 'methods':
      return '登录镜云图床';
    case 'email-login':
      return '邮箱登录';
    case 'email-register':
      return '注册新账号';
    case 'email-verify':
      return '验证邮箱';
    default:
      return '登录';
  }
});

const desc = computed(() => {
  switch (step.value) {
    case 'methods':
      return '选择一种方式继续';
    case 'email-login':
      return '输入邮箱和密码登录';
    case 'email-register':
      return '输入邮箱和密码注册账号';
    case 'email-verify':
      return `验证码已发送至 ${email.value}`;
    default:
      return '';
  }
});

/** 弹窗开关变化时重置状态 */
watch(
  () => props.open,
  (val) => {
    if (val) {
      step.value = 'methods';
      email.value = '';
      password.value = '';
      confirmPassword.value = '';
      code.value = '';
      verifyToken.value = '';
      rememberMe.value = true;
      agreedToTerms.value = false;
      showPassword.value = false;
      showConfirmPassword.value = false;
      countdown.value = 0;
    }
  },
);

/** 进入邮箱登录步骤：自动回填上次登录的邮箱 */
function goEmailLogin() {
  step.value = 'email-login';
  if (!email.value) {
    email.value = localStorage.getItem(LAST_EMAIL_KEY) || '';
  }
}

/** ============ OAuth 登录（GitHub / Google）============ */
function loginWithOAuth(provider: 'github' | 'google' | 'gitee') {
  // 整页跳转到 OAuth 授权页，授权后回调 302 跳回首页
  window.location.href = `/api/auth/${provider}`;
}

/** ============ 邮箱注册流程 ============ */
async function startRegister() {
  if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    toast({ title: '邮箱格式不正确', variant: 'destructive' });
    return;
  }
  if (password.value.length < 6) {
    toast({ title: '密码至少 6 位', variant: 'destructive' });
    return;
  }
  if (password.value !== confirmPassword.value) {
    toast({ title: '两次密码不一致', variant: 'destructive' });
    return;
  }

  submitting.value = true;
  try {
    const res = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, purpose: 'register' }),
    });
    const data = await res.json();
    if (!data.success) {
      toast({ title: '发送失败', description: data.error || '', variant: 'destructive' });
      return;
    }
    step.value = 'email-verify';
    startCountdown();
  } catch (err) {
    toast({ title: '网络错误', description: (err as Error).message, variant: 'destructive' });
  } finally {
    submitting.value = false;
  }
}

/** 校验验证码 */
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
      body: JSON.stringify({ email: email.value, code: code.value, purpose: 'register' }),
    });
    const data = await res.json();
    if (!data.success) {
      toast({ title: '验证失败', description: data.error || '', variant: 'destructive' });
      return;
    }
    verifyToken.value = data.token;
    // 验证通过，执行注册
    await doRegister();
  } catch (err) {
    toast({ title: '网络错误', description: (err as Error).message, variant: 'destructive' });
  } finally {
    submitting.value = false;
  }
}

/** 执行注册 */
async function doRegister() {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.value,
      password: password.value,
      token: verifyToken.value,
    }),
  });
  const data = await res.json();
  if (!data.success) {
    toast({ title: '注册失败', description: data.error || '', variant: 'destructive' });
    return;
  }
  toast({ title: '注册成功', description: '已自动登录' });
  emit('update:open', false);
  emit('success');
}

/** ============ 邮箱登录流程 ============ */
async function doLogin() {
  if (!email.value || !password.value) {
    toast({ title: '请填写邮箱和密码', variant: 'destructive' });
    return;
  }

  submitting.value = true;
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value, remember: rememberMe.value }),
    });
    const data = await res.json();
    if (!data.success) {
      toast({ title: '登录失败', description: data.error || '', variant: 'destructive' });
      return;
    }
    // 记住上次登录邮箱，下次打开登录弹窗时自动回填
    localStorage.setItem(LAST_EMAIL_KEY, email.value);
    toast({ title: '登录成功' });
    emit('update:open', false);
    emit('success');
  } catch (err) {
    toast({ title: '网络错误', description: (err as Error).message, variant: 'destructive' });
  } finally {
    submitting.value = false;
  }
}

/** ============ 验证码倒计时 ============ */
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

async function resendCode() {
  if (countdown.value > 0) return;
  const res = await fetch('/api/auth/send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.value, purpose: 'register' }),
  });
  const data = await res.json();
  if (data.success) {
    startCountdown();
    toast({ title: '验证码已重新发送' });
  }
}

/** ============ 忘记密码：交给父组件打开找回密码弹窗 ============ */
function goForgotPassword() {
  emit('update:open', false);
  emit('forgot');
}

/** 禁用点击遮罩和 ESC 关闭弹窗，仅保留 X 按钮 */
const preventDismiss = (e: Event) => {
  e.preventDefault();
};

/** 提交按钮（根据 step 分发） */
async function handleSubmit() {
  if (step.value === 'email-register') {
    await startRegister();
  } else if (step.value === 'email-verify') {
    await verifyCode();
  } else if (step.value === 'email-login') {
    await doLogin();
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-md" @escape-key-down="preventDismiss" @pointer-down-outside="preventDismiss" @interact-outside="preventDismiss">
      <div class="flex flex-col gap-1.5 mb-2 text-center">
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ desc }}</DialogDescription>
      </div>

      <!-- step 1: 登录方式选择 -->
      <div v-if="step === 'methods'" class="flex flex-col gap-3">
        <button class="auth-method-btn" @click="loginWithOAuth('github')">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path
              d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
            />
          </svg>
          <span>使用 GitHub 登录</span>
        </button>

        <button class="auth-method-btn" @click="loginWithOAuth('google')">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span>使用 Google 登录</span>
        </button>

        <button class="auth-method-btn" @click="loginWithOAuth('gitee')">
          <svg viewBox="0 0 90 90" width="20" height="20">
            <circle cx="44.85" cy="44.85" r="44.85" fill="#C71D23" />
            <path
              d="M67.56,39.87 L42.09,39.87 C40.86,39.87 39.87,40.86 39.87,42.09 L39.87,47.62 C39.87,48.85 40.86,49.84 42.08,49.84 L57.59,49.84 C58.81,49.84 59.81,50.83 59.81,52.05 L59.81,53.16 C59.81,56.83 56.83,59.81 53.16,59.81 L32.12,59.81 C30.89,59.81 29.9,58.81 29.9,57.59 L29.9,36.55 C29.9,32.88 32.88,29.9 36.55,29.9 L67.55,29.9 C68.78,29.9 69.77,28.91 69.77,27.69 L69.77,22.15 C69.77,20.93 68.78,19.94 67.56,19.94 L36.55,19.94 C27.37,19.94 19.94,27.37 19.94,36.55 L19.94,67.56 C19.94,68.78 20.93,69.77 22.15,69.77 L54.82,69.77 C63.08,69.77 69.77,63.08 69.77,54.82 L69.77,42.09 C69.77,40.86 68.78,39.87 67.56,39.87 Z"
              fill="#FFFFFF"
            />
          </svg>
          <span>使用 Gitee 登录</span>
        </button>

        <button class="auth-method-btn" @click="goEmailLogin()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          <span>使用邮箱密码登录</span>
        </button>
      </div>

      <!-- step 2/3: 邮箱登录 / 注册 -->
      <form v-else-if="step === 'email-login' || step === 'email-register'" class="flex flex-col gap-3" @submit.prevent="handleSubmit">
        <label class="auth-field">
          <span class="auth-label">邮箱</span>
          <input v-model="email" type="email" class="auth-input" placeholder="请输入邮箱" required />
        </label>
        <label class="auth-field">
          <span class="auth-label">密码</span>
          <div class="password-wrap">
            <input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" class="auth-input" placeholder="请输入密码" required />
            <button type="button" class="password-toggle" @click="showPassword = !showPassword">
              <svg v-if="!showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
        <label v-if="step === 'email-register'" class="auth-field">
          <span class="auth-label">确认密码</span>
          <div class="password-wrap">
            <input v-model="confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" autocomplete="new-password" class="auth-input" placeholder="再次输入密码" required />
            <button type="button" class="password-toggle" @click="showConfirmPassword = !showConfirmPassword">
              <svg v-if="!showConfirmPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

        <!-- 记住我 + 忘记密码（仅登录） -->
        <div v-if="step === 'email-login'" class="auth-remember-row">
          <label class="auth-remember">
            <input type="checkbox" v-model="rememberMe" />
            <span>记住我</span>
          </label>
          <a class="auth-link" @click="goForgotPassword">忘记密码？</a>
        </div>

        <!-- 注册：同意协议（默认勾选） -->
        <label v-if="step === 'email-register'" class="auth-remember auth-terms">
          <input type="checkbox" v-model="agreedToTerms" />
          <span class="auth-terms-text">
            我已阅读并同意
            <router-link to="/legal?type=privacy" target="_blank" class="auth-link">《隐私协议》</router-link>
            和
            <router-link to="/legal?type=terms" target="_blank" class="auth-link">《服务条款》</router-link>
          </span>
        </label>

        <button type="submit" class="auth-submit-btn" :disabled="submitting || (step === 'email-register' && !agreedToTerms)">
          {{ submitting ? '处理中...' : step === 'email-register' ? '注册' : '登录' }}
        </button>

        <div class="auth-switch">
          <template v-if="step === 'email-login'">
            没有账号？
            <a class="auth-link" @click="step = 'email-register'">去注册</a>
          </template>
          <template v-else>
            已有账号？
            <a class="auth-link" @click="goEmailLogin()">去登录</a>
          </template>
        </div>

        <!-- 其他登录方式 -->
        <div class="auth-divider">
          <span>其他登录方式</span>
        </div>
        <div class="auth-oauth-row">
          <button type="button" class="auth-oauth-btn" title="GitHub 登录" @click="loginWithOAuth('github')">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path
                d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
              />
            </svg>
          </button>
          <button type="button" class="auth-oauth-btn" title="Google 登录" @click="loginWithOAuth('google')">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          </button>
          <button type="button" class="auth-oauth-btn" title="Gitee 登录" @click="loginWithOAuth('gitee')">
            <svg viewBox="0 0 90 90" width="18" height="18">
              <circle cx="44.85" cy="44.85" r="44.85" fill="#C71D23" />
              <path
                d="M67.56,39.87 L42.09,39.87 C40.86,39.87 39.87,40.86 39.87,42.09 L39.87,47.62 C39.87,48.85 40.86,49.84 42.08,49.84 L57.59,49.84 C58.81,49.84 59.81,50.83 59.81,52.05 L59.81,53.16 C59.81,56.83 56.83,59.81 53.16,59.81 L32.12,59.81 C30.89,59.81 29.9,58.81 29.9,57.59 L29.9,36.55 C29.9,32.88 32.88,29.9 36.55,29.9 L67.55,29.9 C68.78,29.9 69.77,28.91 69.77,27.69 L69.77,22.15 C69.77,20.93 68.78,19.94 67.56,19.94 L36.55,19.94 C27.37,19.94 19.94,27.37 19.94,36.55 L19.94,67.56 C19.94,68.78 20.93,69.77 22.15,69.77 L54.82,69.77 C63.08,69.77 69.77,63.08 69.77,54.82 L69.77,42.09 C69.77,40.86 68.78,39.87 67.56,39.87 Z"
                fill="#FFFFFF"
              />
            </svg>
          </button>
        </div>
      </form>

      <!-- step 4: 验证码 -->
      <form v-else-if="step === 'email-verify'" class="flex flex-col gap-3" @submit.prevent="verifyCode">
        <p class="text-sm text-muted-foreground">已向 {{ email }} 发送 6 位验证码，请输入。</p>
        <div class="auth-field">
          <span class="auth-label">验证码</span>
          <input v-model="code" type="text" maxlength="6" autocomplete="one-time-code" class="auth-input tracking-[0.5em] text-center" placeholder="------" required />
        </div>

        <button type="submit" class="auth-submit-btn" :disabled="submitting">
          {{ submitting ? '处理中...' : '验证并注册' }}
        </button>

        <div class="auth-switch">
          没收到？
          <a v-if="countdown > 0" class="auth-link-disabled">{{ countdown }}s 后可重发</a>
          <a v-else class="auth-link" @click="resendCode">重新发送</a>
        </div>

        <a class="auth-switch mt-2" @click="step = 'methods'">返回其他登录方式</a>
      </form>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.auth-method-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 0.2s,
    border-color 0.2s;
}

.auth-method-btn svg,
.auth-method-btn img {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.auth-method-btn:hover {
  background: hsl(var(--accent));
  border-color: hsl(var(--primary));
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.auth-remember-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
}

.auth-remember {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  user-select: none;
}

.auth-remember input[type='checkbox'] {
  width: 1rem;
  height: 1rem;
  accent-color: hsl(var(--primary));
  cursor: pointer;
}

/* 注册：同意协议（多行文本与 checkbox 顶部对齐） */
.auth-terms {
  align-items: flex-start;
  line-height: 1.5;
}

.auth-terms input[type='checkbox'] {
  margin-top: 0.15rem;
  flex-shrink: 0;
}

.auth-terms-text {
  flex: 1;
}

.auth-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: hsl(var(--foreground));
}

.auth-input {
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

.auth-input:focus {
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 2px hsl(var(--ring));
}

/* 密码输入框容器 */
.password-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.password-wrap .auth-input {
  width: 100%;
  padding-right: 2.5rem;
}

.password-toggle {
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

.password-toggle svg {
  width: 1.1rem;
  height: 1.1rem;
}

.password-toggle:hover {
  color: hsl(var(--foreground));
}

.auth-submit-btn {
  padding: 0.625rem 1rem;
  border-radius: var(--radius);
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.auth-submit-btn:hover {
  opacity: 0.9;
}

.auth-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-switch {
  text-align: center;
  font-size: 0.8rem;
  color: hsl(var(--muted-foreground));
}

.auth-link {
  color: hsl(var(--primary));
  cursor: pointer;
  font-weight: 500;
}

.auth-link:hover {
  text-decoration: underline;
}

.auth-link-disabled {
  color: hsl(var(--muted-foreground));
  cursor: not-allowed;
}

/* 分割线 */
.auth-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.25rem 0;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: hsl(var(--border));
}

.auth-divider span {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}

/* OAuth 圆形按钮 */
.auth-oauth-row {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}

.auth-oauth-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  cursor: pointer;
  transition:
    background-color 0.2s,
    border-color 0.2s,
    transform 0.15s;
}

.auth-oauth-btn:hover {
  background: hsl(var(--accent));
  border-color: hsl(var(--primary));
}

.auth-oauth-btn:active {
  transform: scale(0.95);
}
</style>
