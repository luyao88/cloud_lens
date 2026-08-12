<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast/use-toast'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
}>()

const { toast } = useToast()

/** step 状态：methods 方式选择 | email-login 登录 | email-register 注册 | email-verify 验证码 */
const step = ref<'methods' | 'email-login' | 'email-register' | 'email-verify'>('methods')

// 表单数据
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const code = ref('')
// 注册流程：验证通过后拿到的临时 token
const verifyToken = ref('')
// 重发验证码倒计时
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

// loading 态
const submitting = ref(false)

/** 弹窗标题 */
const title = computed(() => {
  switch (step.value) {
    case 'methods':
      return '登录镜云图床'
    case 'email-login':
      return '邮箱登录'
    case 'email-register':
      return '注册新账号'
    case 'email-verify':
      return '验证邮箱'
    default:
      return '登录'
  }
})

const desc = computed(() => {
  switch (step.value) {
    case 'methods':
      return '选择一种方式继续'
    case 'email-login':
      return '输入邮箱和密码登录'
    case 'email-register':
      return '输入邮箱和密码注册账号'
    case 'email-verify':
      return `验证码已发送至 ${email.value}`
    default:
      return ''
  }
})

/** 弹窗开关变化时重置状态 */
watch(
  () => props.open,
  (val) => {
    if (val) {
      step.value = 'methods'
      email.value = ''
      password.value = ''
      confirmPassword.value = ''
      code.value = ''
      verifyToken.value = ''
      countdown.value = 0
    }
  },
)

/** ============ OAuth 登录（GitHub / Google）============ */
function loginWithOAuth(provider: 'github' | 'google') {
  const popup = window.open(
    `/api/auth/${provider}?popup=1`,
    `${provider}-login`,
    'width=600,height=700,menubar=no,toolbar=no',
  )
  if (!popup) {
    toast({ title: '弹窗被拦截', description: '请允许弹窗后重试', variant: 'destructive' })
    return
  }

  const onMessage = (e: MessageEvent) => {
    if (e.data?.type === 'auth-success') {
      window.removeEventListener('message', onMessage)
      emit('update:open', false)
      emit('success')
    } else if (e.data?.type === 'auth-error') {
      window.removeEventListener('message', onMessage)
      toast({ title: '登录失败', description: e.data?.message || '未知错误', variant: 'destructive' })
    }
  }
  window.addEventListener('message', onMessage)
}

/** ============ 邮箱注册流程 ============ */
async function startRegister() {
  if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    toast({ title: '邮箱格式不正确', variant: 'destructive' })
    return
  }
  if (password.value.length < 6) {
    toast({ title: '密码至少 6 位', variant: 'destructive' })
    return
  }
  if (password.value !== confirmPassword.value) {
    toast({ title: '两次密码不一致', variant: 'destructive' })
    return
  }

  submitting.value = true
  try {
    const res = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, purpose: 'register' }),
    })
    const data = await res.json()
    if (!data.success) {
      toast({ title: '发送失败', description: data.error || '', variant: 'destructive' })
      return
    }
    step.value = 'email-verify'
    startCountdown()
  } catch (err) {
    toast({ title: '网络错误', description: (err as Error).message, variant: 'destructive' })
  } finally {
    submitting.value = false
  }
}

/** 校验验证码 */
async function verifyCode() {
  if (code.value.length !== 6) {
    toast({ title: '请输入 6 位验证码', variant: 'destructive' })
    return
  }

  submitting.value = true
  try {
    const res = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, code: code.value, purpose: 'register' }),
    })
    const data = await res.json()
    if (!data.success) {
      toast({ title: '验证失败', description: data.error || '', variant: 'destructive' })
      return
    }
    verifyToken.value = data.token
    // 验证通过，执行注册
    await doRegister()
  } catch (err) {
    toast({ title: '网络错误', description: (err as Error).message, variant: 'destructive' })
  } finally {
    submitting.value = false
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
  })
  const data = await res.json()
  if (!data.success) {
    toast({ title: '注册失败', description: data.error || '', variant: 'destructive' })
    return
  }
  toast({ title: '注册成功', description: '已自动登录' })
  emit('update:open', false)
  emit('success')
}

/** ============ 邮箱登录流程 ============ */
async function doLogin() {
  if (!email.value || !password.value) {
    toast({ title: '请填写邮箱和密码', variant: 'destructive' })
    return
  }

  submitting.value = true
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value }),
    })
    const data = await res.json()
    if (!data.success) {
      toast({ title: '登录失败', description: data.error || '', variant: 'destructive' })
      return
    }
    toast({ title: '登录成功' })
    emit('update:open', false)
    emit('success')
  } catch (err) {
    toast({ title: '网络错误', description: (err as Error).message, variant: 'destructive' })
  } finally {
    submitting.value = false
  }
}

/** ============ 验证码倒计时 ============ */
function startCountdown() {
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0 && countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

async function resendCode() {
  if (countdown.value > 0) return
  const res = await fetch('/api/auth/send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.value, purpose: 'register' }),
  })
  const data = await res.json()
  if (data.success) {
    startCountdown()
    toast({ title: '验证码已重新发送' })
  }
}

/** 提交按钮（根据 step 分发） */
async function handleSubmit() {
  if (step.value === 'email-register') {
    await startRegister()
  } else if (step.value === 'email-verify') {
    await verifyCode()
  } else if (step.value === 'email-login') {
    await doLogin()
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-md">
      <div class="flex flex-col gap-1.5 mb-2 text-center">
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ desc }}</DialogDescription>
      </div>

      <!-- step 1: 登录方式选择 -->
      <div v-if="step === 'methods'" class="flex flex-col gap-3">
        <button
          class="auth-method-btn"
          @click="loginWithOAuth('github')"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path
              d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
            />
          </svg>
          <span>使用 GitHub 登录</span>
        </button>

        <button
          class="auth-method-btn"
          @click="loginWithOAuth('google')"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>使用 Google 登录</span>
        </button>

        <button class="auth-method-btn" @click="step = 'email-login'">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
          <span>使用邮箱密码登录</span>
        </button>
      </div>

      <!-- step 2/3: 邮箱登录 / 注册 -->
      <form
        v-else-if="step === 'email-login' || step === 'email-register'"
        class="flex flex-col gap-3"
        @submit.prevent="handleSubmit"
      >
        <label class="auth-field">
          <span class="auth-label">邮箱</span>
          <input v-model="email" type="email" class="auth-input" placeholder="you@example.com" required />
        </label>
        <label class="auth-field">
          <span class="auth-label">密码</span>
          <input v-model="password" type="password" class="auth-input" placeholder="至少 6 位" required />
        </label>
        <label v-if="step === 'email-register'" class="auth-field">
          <span class="auth-label">确认密码</span>
          <input v-model="confirmPassword" type="password" class="auth-input" placeholder="再次输入密码" required />
        </label>

        <button type="submit" class="auth-submit-btn" :disabled="submitting">
          {{ submitting ? '处理中...' : step === 'email-register' ? '注册' : '登录' }}
        </button>

        <div class="auth-switch">
          <template v-if="step === 'email-login'">
            没有账号？
            <a class="auth-link" @click="step = 'email-register'">去注册</a>
          </template>
          <template v-else>
            已有账号？
            <a class="auth-link" @click="step = 'email-login'">去登录</a>
          </template>
        </div>
      </form>

      <!-- step 4: 验证码 -->
      <form
        v-else-if="step === 'email-verify'"
        class="flex flex-col gap-3"
        @submit.prevent="verifyCode"
      >
        <p class="text-sm text-muted-foreground">
          已向 {{ email }} 发送 6 位验证码，请输入。
        </p>
        <div class="auth-field">
          <span class="auth-label">验证码</span>
          <input
            v-model="code"
            type="text"
            maxlength="6"
            autocomplete="one-time-code"
            class="auth-input tracking-[0.5em] text-center"
            placeholder="------"
            @paste="$nextTick(() => {})"
            required
          />
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
  transition: background-color 0.2s, border-color 0.2s;
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
  transition: border-color 0.2s, box-shadow 0.2s;
}

.auth-input:focus {
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 2px hsl(var(--ring));
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
</style>
