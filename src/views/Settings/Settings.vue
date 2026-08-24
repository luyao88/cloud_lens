<template>
  <section class="Settings">
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
        <h2>登录后管理个人设置</h2>
        <p>头像、密码、邮箱与第三方授权均在此管理</p>
        <button class="gate-btn" @click="authOpen = true">去登录</button>
      </div>
      <AuthDialog v-model:open="authOpen" @success="onLoginSuccess" />
    </div>

    <template v-else>
      <!-- 页头 -->
      <div class="settings-head">
        <h1 class="settings-title">个人设置</h1>
        <router-link to="/profile" class="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          返回我的相册
        </router-link>
      </div>

      <div class="settings-layout">
        <!-- 左侧导航 -->
        <aside class="settings-side">
          <div class="side-user">
            <img v-if="user.avatar_url" :src="user.avatar_url" :alt="user.username" class="side-avatar" />
            <div v-else class="side-avatar side-avatar-default">{{ avatarLetter }}</div>
            <div class="side-user-meta">
              <div class="side-username">{{ user.username }}</div>
              <div class="side-email">{{ user.email || '未绑定邮箱' }}</div>
            </div>
          </div>
          <nav class="side-nav">
            <button class="side-nav-item" :class="{ active: activeSection === 'profile' }" @click="activeSection = 'profile'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>个人信息</span>
            </button>
            <button class="side-nav-item" :class="{ active: activeSection === 'security' }" @click="activeSection = 'security'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>账号安全</span>
            </button>
            <button class="side-nav-item" :class="{ active: activeSection === 'email' }" @click="activeSection = 'email'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span>登录邮箱</span>
            </button>
            <button class="side-nav-item" :class="{ active: activeSection === 'auth' }" @click="activeSection = 'auth'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span>授权管理</span>
            </button>
          </nav>
        </aside>

        <!-- 右侧内容 -->
        <div class="settings-main">
          <!-- 个人信息 -->
          <section v-if="activeSection === 'profile'" class="settings-panel">
            <header class="panel-head">
              <h2 class="panel-title">个人信息</h2>
              <p class="panel-desc">设置头像与用户名，保存后全站生效</p>
            </header>
            <form class="panel-body" @submit.prevent="submitProfile">
              <div class="avatar-row">
                <div class="avatar-upload-area" @click="avatarInputRef?.click()">
                  <img v-if="profileEdit.avatar_url" :src="profileEdit.avatar_url" class="avatar-upload-preview" alt="头像预览" />
                  <div v-else class="avatar-upload-preview avatar-upload-default">{{ (profileEdit.username || '?')[0].toUpperCase() }}</div>
                  <div class="avatar-upload-overlay">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                    <span>{{ avatarUploading ? '上传中' : '更换' }}</span>
                  </div>
                  <span v-if="avatarUploading" class="avatar-upload-spinner"></span>
                </div>
                <div class="avatar-hint">
                  <p>点击头像上传新图片</p>
                  <p>支持 JPG / PNG / GIF / WebP，不超过 10MB</p>
                </div>
              </div>
              <input ref="avatarInputRef" type="file" accept="image/jpeg,image/png,image/gif,image/webp" class="avatar-hidden-input" @change="onAvatarFileChange" />
              <label class="field">
                <span class="field-label">用户名</span>
                <span class="field-input">
                  <input v-model="profileEdit.username" type="text" placeholder="请输入用户名" maxlength="32" required />
                </span>
              </label>
              <div class="panel-actions">
                <button type="submit" class="btn primary" :disabled="profileEdit.submitting">{{ profileEdit.submitting ? '保存中...' : '保存修改' }}</button>
              </div>
            </form>

            <!-- 账号信息（只读） -->
            <div class="account-info">
              <div class="account-info-title">账号信息</div>
              <div class="account-info-row">
                <span class="account-info-label">用户 ID</span>
                <span class="account-info-value">#{{ user.id }}</span>
              </div>
              <div class="account-info-row">
                <span class="account-info-label">注册时间</span>
                <span class="account-info-value">{{ formatDate(user.created_at) }}</span>
              </div>
              <div class="account-info-row">
                <span class="account-info-label">已绑登录方式</span>
                <span class="account-info-tags">
                  <span v-for="m in user.auth_methods" :key="m.provider" class="account-info-tag">{{ providerLabel(m.provider) }}</span>
                  <span v-if="!user.auth_methods?.length" class="account-info-empty">暂无</span>
                </span>
              </div>
            </div>
          </section>

          <!-- 账号安全 -->
          <section v-else-if="activeSection === 'security'" class="settings-panel">
            <header class="panel-head">
              <h2 class="panel-title">账号安全</h2>
              <p class="panel-desc">修改登录密码，修改成功后将自动退出，需重新登录</p>
            </header>
            <form v-if="hasEmailBound" class="panel-body" @submit.prevent="submitPassword">
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
              <div class="panel-actions">
                <button type="submit" class="btn primary" :disabled="pwdForm.submitting">{{ pwdForm.submitting ? '提交中...' : '确认修改' }}</button>
              </div>
            </form>
            <div v-else class="panel-body">
              <div class="empty-tip">
                当前账号未绑定邮箱，暂不支持密码登录。<br />
                请先在「邮箱管理」中绑定邮箱并设置密码。
              </div>
            </div>
          </section>

          <!-- 邮箱管理 -->
          <section v-else-if="activeSection === 'email'" class="settings-panel">
            <header class="panel-head">
              <h2 class="panel-title">登录邮箱</h2>
              <p class="panel-desc">{{ hasEmailBound ? '更改当前登录邮箱，需通过新邮箱验证码与当前密码确认' : '绑定邮箱后即可使用邮箱密码登录本账号' }}</p>
            </header>
            <div class="panel-body">
              <!-- 当前邮箱 -->
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
                <!-- 第一步：输入邮箱 -->
                <form v-if="bindStep === 'email'" key="email" class="email-form" @submit.prevent="startBindEmail">
                  <label class="field">
                    <span class="field-label">{{ hasEmailBound ? '更改后的邮箱地址' : '邮箱地址' }}</span>
                    <span class="field-input">
                      <input ref="emailInputRef" v-model="bindEmail" type="email" :placeholder="hasEmailBound ? '请输入新邮箱地址' : '请输入邮箱地址'" required />
                    </span>
                  </label>
                  <div class="panel-actions">
                    <button type="submit" class="btn primary" :disabled="bindSubmitting">{{ bindSubmitting ? '发送中...' : '发送验证码' }}</button>
                  </div>
                </form>

                <!-- 第二步：验证码 + 密码 -->
                <form v-else key="code" class="email-form" @submit.prevent="confirmBindEmail">
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
                  <!-- 更换邮箱：当前密码验证身份；首次绑定：设置密码 -->
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
                  <div class="panel-actions">
                    <button type="button" class="btn ghost" @click="resetBind">上一步</button>
                    <button type="submit" class="btn primary" :disabled="bindSubmitting">{{ bindSubmitting ? '提交中...' : hasEmailBound ? '确认更换' : '确认绑定' }}</button>
                  </div>
                </form>
              </Transition>
            </div>
          </section>

          <!-- 授权管理 -->
          <section v-else class="settings-panel">
            <header class="panel-head">
              <h2 class="panel-title">授权管理</h2>
              <p class="panel-desc">查看账号已绑定的登录方式，同一账号可绑定多种方式</p>
            </header>
            <div class="panel-body">
              <div v-for="row in providerRows" :key="row.key" class="provider-row">
                <div class="provider-icon" :class="`provider-${row.key}`">
                  <!-- 邮箱 -->
                  <svg v-if="row.key === 'email'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <!-- GitHub -->
                  <svg v-else-if="row.key === 'github'" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  <!-- Google -->
                  <svg v-else-if="row.key === 'google'" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <!-- Gitee -->
                  <svg v-else viewBox="0 0 90 90">
                    <circle cx="44.85" cy="44.85" r="44.85" fill="#C71D23" />
                    <path d="M67.56,39.87 L42.09,39.87 C40.86,39.87 39.87,40.86 39.87,42.09 L39.87,47.62 C39.87,48.85 40.86,49.84 42.08,49.84 L57.59,49.84 C58.81,49.84 59.81,50.83 59.81,52.05 L59.81,53.16 C59.81,56.83 56.83,59.81 53.16,59.81 L32.12,59.81 C30.89,59.81 29.9,58.81 29.9,57.59 L29.9,36.55 C29.9,32.88 32.88,29.9 36.55,29.9 L67.55,29.9 C68.78,29.9 69.77,28.91 69.77,27.69 L69.77,22.15 C69.77,20.93 68.78,19.94 67.56,19.94 L36.55,19.94 C27.37,19.94 19.94,27.37 19.94,36.55 L19.94,67.56 C19.94,68.78 20.93,69.77 22.15,69.77 L54.82,69.77 C63.08,69.77 69.77,63.08 69.77,54.82 L69.77,42.09 C69.77,40.86 68.78,39.87 67.56,39.87 Z" fill="#FFFFFF" />
                  </svg>
                </div>
                <div class="provider-meta">
                  <div class="provider-name">{{ row.label }}</div>
                  <div class="provider-desc">{{ row.bound ? row.email || '已绑定' : '未绑定' }}</div>
                </div>
                <span class="provider-badge" :class="row.bound ? 'on' : 'off'">{{ row.bound ? '已绑定' : '未绑定' }}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <!-- 头像裁剪弹窗 -->
      <Dialog :open="cropOpen" @update:open="(v: boolean) => (cropOpen = v)">
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
    </template>
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

// ===== 侧边导航 =====
const activeSection = ref<'profile' | 'security' | 'email' | 'auth'>('profile');

// ===== 个人信息编辑 =====
const profileEdit = ref({ username: '', avatar_url: '', submitting: false });
const avatarInputRef = ref<HTMLInputElement | null>(null);
const avatarUploading = ref(false);

watch(user, (u) => {
  if (u) {
    profileEdit.value.username = u.username || '';
    profileEdit.value.avatar_url = u.avatar_url || '';
  }
}, { immediate: true });

// 头像选择：校验后打开裁剪弹窗
async function onAvatarFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  input.value = '';
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
    profileEdit.value.avatar_url = data.data.link;
    cropOpen.value = false;
    toast({ title: '头像已设置，记得保存' });
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

watch(activeSection, (s) => {
  if (s === 'email') focusInput();
});
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
  { key: 'email', label: '邮箱' },
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
</script>

<style scoped lang="less">
@import 'Settings.less';
</style>
