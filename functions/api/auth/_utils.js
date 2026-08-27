/**
 * OAuth 回调通用工具函数
 */

/**
 * popup 模式下返回的 HTML 页面
 * 通过 postMessage 通知父窗口登录结果，然后关闭弹窗
 * @param {boolean} success - 是否成功
 * @param {string} [message] - 错误信息
 * @param {Headers} [headers] - 附加的 response headers（如 Set-Cookie）
 * @param {string} [expectedOrigin] - 期望的父窗口 origin，用于 postMessage 安全校验
 */
export function popupResponse(success, message, headers, expectedOrigin) {
  const data = success ? 'auth-success' : 'auth-error';
  const safeMsg = message ? String(message).replace(/[<>]/g, '') : '';
  const targetOrigin = expectedOrigin || '*';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>登录中...</title></head><body>
<p>${success ? '登录成功，正在关闭...' : '登录失败'}</p>
<script>
  (function() {
    var payload = { type: '${data}'${safeMsg ? `, message: ${JSON.stringify(safeMsg)}` : ''} };
    if (window.opener) {
      window.opener.postMessage(payload, '${targetOrigin}');
    }
    setTimeout(function(){ window.close(); }, 100);
  })();
<\/script>
</body></html>`;
  const respHeaders = headers || new Headers();
  respHeaders.set('Content-Type', 'text/html; charset=utf-8');
  return new Response(html, {
    status: 200,
    headers: respHeaders,
  });
}

/**
 * 生成 session 并设置 cookie
 * @param {boolean} remember - true: 30 天持久 cookie；false: 会话级 cookie（关闭浏览器即失效）
 * 返回 { sessionId, headers }
 */
export async function createSession(env, userId, url, remember = true) {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const isHttps = url.protocol === 'https:';
  const secureFlag = isHttps ? '; Secure' : '';
  const httpOnlyFlag = '; HttpOnly';

  await env.cloud_lens_data.prepare(`INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`).bind(sessionId, userId, expiresAt.toISOString()).run();

  const maxAge = remember ? `; Max-Age=2592000` : '';
  const headers = new Headers();
  headers.append('Set-Cookie', `session=${sessionId}; Path=/; SameSite=Lax${maxAge}${secureFlag}${httpOnlyFlag}`);
  return { sessionId, headers };
}

/**
 * 从请求中解析当前登录用户
 * 解析 session cookie -> 查询 sessions -> 查询 users
 * @returns {Promise<{ user: object|null, session: object|null }>}
 */
export async function getUserFromRequest(request, env) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const sessionCookie = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('session='));

  if (!sessionCookie) {
    return { user: null, session: null };
  }

  const sessionId = sessionCookie.split('=')[1];

  const session = await env.cloud_lens_data.prepare(`SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')`).bind(sessionId).first();

  if (!session) {
    return { user: null, session: null };
  }

  const user = await env.cloud_lens_data.prepare('SELECT id, username, avatar_url, email, created_at, default_album_id FROM users WHERE id = ?').bind(session.user_id).first();

  return { user: user || null, session };
}

/**
 * 查找或创建用户（支持多登录方式关联）
 *
 * 查找逻辑：
 * 1. 先按 (provider, provider_id) 在 user_auth_methods 中精确查找
 * 2. 如果没找到且 email 不为空且 emailTrusted 为 true，尝试按 email 关联到已有用户（实现账号合并）
 * 3. 都没找到则创建新用户 + 写入 user_auth_methods
 *
 * emailTrusted 必须只在邮箱经过提供商验证时为 true（Google 恒真；GitHub 需
 * verified 标记；Gitee 无验证信号恒为 false），否则攻击者可在第三方平台填写
 * 未验证的受害者邮箱从而接管账号。
 */
export async function findOrCreateUser(env, provider, providerId, email, username, avatarUrl, { emailTrusted = false } = {}) {
  // 1. 精确查找该登录方式
  let authMethod = await env.cloud_lens_data
    .prepare(
      `SELECT m.*, u.id AS user_id, u.username, u.avatar_url, u.email
       FROM user_auth_methods m
       JOIN users u ON u.id = m.user_id
       WHERE m.provider = ? AND m.provider_id = ?`,
    )
    .bind(provider, String(providerId))
    .first();

  if (authMethod) {
    return {
      id: authMethod.user_id,
      username: authMethod.username,
      avatar_url: authMethod.avatar_url,
      email: authMethod.email,
    };
  }

  // 2. 如果有已验证的 email，尝试按 email 关联到已有用户
  if (email && emailTrusted) {
    const existingUser = await env.cloud_lens_data.prepare('SELECT id, username, avatar_url, email FROM users WHERE email = ?').bind(email).first();

    if (existingUser) {
      // 关联新登录方式到已有用户（不更新 users 表的 provider）
      await env.cloud_lens_data
        .prepare(
          `INSERT INTO user_auth_methods (user_id, provider, provider_id, email)
           VALUES (?, ?, ?, ?)`,
        )
        .bind(existingUser.id, provider, String(providerId), email)
        .run();

      // 更新 users 表的 avatar/username（如果 OAuth 有新信息）
      if (avatarUrl && !existingUser.avatar_url) {
        await env.cloud_lens_data.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').bind(avatarUrl, existingUser.id).run();
        existingUser.avatar_url = avatarUrl;
      }

      return existingUser;
    }
  }

  // 3. 创建新用户 + 登录方式记录
  const result = await env.cloud_lens_data
    .prepare(
      `INSERT INTO users (provider, provider_id, email, username, avatar_url)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(provider, String(providerId), email, username, avatarUrl)
    .run();

  const userId = result.meta.last_row_id;

  await env.cloud_lens_data
    .prepare(
      `INSERT INTO user_auth_methods (user_id, provider, provider_id, email)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(userId, provider, String(providerId), email)
    .run();

  return {
    id: userId,
    username,
    avatar_url: avatarUrl,
    email,
  };
}

/**
 * 获取用户已绑定的所有登录方式
 * 旧用户可能没有 user_auth_methods 记录，回退到 users 表
 */
export async function getUserAuthMethods(env, userId) {
  const methods = await env.cloud_lens_data.prepare(`SELECT provider, provider_id, email FROM user_auth_methods WHERE user_id = ? ORDER BY created_at`).bind(userId).all();

  if (methods.results && methods.results.length > 0) {
    return methods.results;
  }

  // 回退：旧用户从 users 表构造 auth method
  const user = await env.cloud_lens_data.prepare('SELECT provider, provider_id, email FROM users WHERE id = ?').bind(userId).first();

  if (user) {
    return [{ provider: user.provider, provider_id: user.provider_id, email: user.email }];
  }

  return [];
}

/**
 * 绑定新登录方式到已有用户
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function bindAuthMethod(env, userId, provider, providerId, email = null, passwordHash = null) {
  // 检查该方式是否已被绑定
  const existing = await env.cloud_lens_data.prepare('SELECT user_id FROM user_auth_methods WHERE provider = ? AND provider_id = ?').bind(provider, String(providerId)).first();

  if (existing) {
    return { success: false, error: '该登录方式已被绑定' };
  }

  await env.cloud_lens_data
    .prepare(
      `INSERT INTO user_auth_methods (user_id, provider, provider_id, email, password_hash)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(userId, provider, String(providerId), email, passwordHash)
    .run();

  return { success: true };
}

/**
 * ============ 邮箱密码登录：密码哈希工具 ============
 * 使用 Web Crypto API 的 PBKDF2（Workers 原生支持）
 * 存储格式：base64(salt):base64(hash)
 */

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_HASH = 'SHA-256';
const SALT_LENGTH = 16;
const KEY_LENGTH = 256;

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * 密码基础策略：6 位起、上限 128 位（统一 register / reset / change / bind 的规则）
 * @returns {string|null} 不通过时返回错误文案，通过返回 null
 */
export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 6) return '密码至少 6 位';
  if (password.length > 128) return '密码最长 128 位';
  return null;
}

/** 哈希密码，返回 "salt:hash" 格式的字符串 */
export async function hashPassword(password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    KEY_LENGTH,
  );

  return `${bufferToBase64(salt)}:${bufferToBase64(hashBuffer)}`;
}

/** 验证密码是否匹配 */
export async function verifyPassword(password, storedHash) {
  const [saltBase64, hashBase64] = storedHash.split(':');
  if (!saltBase64 || !hashBase64) return false;

  const enc = new TextEncoder();
  const salt = new Uint8Array(base64ToBuffer(saltBase64));

  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    keyMaterial,
    KEY_LENGTH,
  );

  return timingSafeEqual(bufferToBase64(hashBuffer), hashBase64);
}

/**
 * 常量时间字符串比较：无论内容是否一致都遍历固定轮数，
 * 避免逐字符短路比较在哈希/签名比对上留下时序侧信道
 */
function timingSafeEqual(a, b) {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * ============ 接口限流（D1 固定窗口计数） ============
 * 依赖 cloud_lens_data.sql 中的 api_rate_limits 表：
 *   key TEXT PRIMARY KEY / count INTEGER / expires_at DATETIME NOT NULL
 *
 * @param {object} env - Workers 环境变量
 * @param {string} key - 限流维度（如 `vc:${email}`）
 * @param {number} max - 窗口内允许的最大次数
 * @param {number} windowSeconds - 窗口长度
 * @returns {Promise<{ limited: boolean, remaining: number }>}
 */
export async function rateLimit(env, key, max, windowSeconds) {
  try {
    const expiresAt = new Date(Date.now() + windowSeconds * 1000).toISOString();
    const result = await env.cloud_lens_data
      .prepare(
        `INSERT INTO api_rate_limits (key, count, expires_at) VALUES (?, 1, ?)
         ON CONFLICT(key) DO UPDATE SET
           count = CASE WHEN expires_at > datetime('now') THEN count + 1 ELSE 1 END,
           expires_at = CASE WHEN expires_at > datetime('now') THEN expires_at ELSE excluded.expires_at END
         RETURNING count`,
      )
      .bind(key, expiresAt)
      .first();
    const count = result?.count ?? 1;
    return { limited: count > max, remaining: Math.max(0, max - count) };
  } catch (err) {
    // 限流表不存在等异常时不阻断业务，仅跳过本次限流判断
    console.error('[rateLimit] failed:', err);
    return { limited: false, remaining: max };
  }
}

/**
 * 只读限流检查（不计数）：适合"预检 + 仅失败时计数"的场景，
 * 避免正常请求也被累计。与 rateLimit 共用同一行数据。
 */
export async function checkRateLimit(env, key, max) {
  try {
    const row = await env.cloud_lens_data
      .prepare(`SELECT count FROM api_rate_limits WHERE key = ? AND expires_at > datetime('now')`)
      .bind(key)
      .first();
    return { limited: !!row && row.count > max };
  } catch (err) {
    console.error('[checkRateLimit] failed:', err);
    return { limited: false };
  }
}

/**
 * ============ 临时 Token 签名工具（防伪造） ============
 * 使用 SHA-256 对 token 内容签名，防止攻击者伪造 register/reset token
 * token 格式: base64(JSON(payload)) + '.' + base64(SHA-256(signingKey + payload))
 *
 * 签名密钥必须通过环境变量 TOKEN_SIGN_KEY 提供（如 `npx wrangler pages secret put TOKEN_SIGN_KEY`）。
 * 密钥缺失时直接抛错，禁止退回硬编码常量（否则源码公开即等于可伪造任意账号的 token）。
 */

const MISSING_KEY_MSG = '服务器未配置 TOKEN_SIGN_KEY，请通过 wrangler pages secret put TOKEN_SIGN_KEY 配置后重试';

function getSignKey(env) {
  const key = env?.TOKEN_SIGN_KEY;
  if (!key || String(key).length < 16) {
    throw new Error(MISSING_KEY_MSG);
  }
  return String(key);
}

/**
 * 生成带签名的临时 token
 * @param {object} env - Workers 环境变量
 * @param {object} payload - 如 { email, purpose, exp } 或 OAuth state { purpose, uid, exp }
 * @returns {Promise<string>} 签名后的 token
 *
 * body 使用 base64url 编码：OAuth state 会原样出现在第三方授权回跳 URL 里，
 * 标准 base64 的 +/= 字符在部分提供商的重定向链上会被转义破坏。
 */
export async function signedToken(env, payload) {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const body = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(body + getSignKey(env)));
  const sig = bufferToBase64(hashBuffer);
  return `${body}.${sig}`;
}

/**
 * 验证并解析带签名的临时 token
 * @param {object} env - Workers 环境变量
 * @param {string} token - 签名 token
 * @returns {Promise<object|null>} 解析后的 payload，验证失败返回 null。
 * 注意：email 不是通用必填字段（OAuth state 只有 purpose/uid/exp）；
 * 需要 email 的用途（register/reset/bind-email）由各端点自行校验 email 匹配。
 */
export async function verifySignedToken(env, token) {
  let signKey;
  try {
    signKey = getSignKey(env);
  } catch {
    return null;
  }

  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;

  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(body + signKey));
  const expectedSig = bufferToBase64(hashBuffer);

  if (!timingSafeEqual(sig, expectedSig)) return null;

  try {
    const data = JSON.parse(decodeTokenBody(body));
    if (!data || typeof data !== 'object') return null;
    if (!data.purpose || !data.exp) return null;
    // 过期不在此处拒绝：注册/重置等端点有各自的「token 已过期」文案；
    // OAuth 侧由 resolveOAuthState 统一做时效校验
    return data;
  } catch {
    return null;
  }
}

/** 解码 token body：优先新版 base64url，兼容旧版标准 base64 */
function decodeTokenBody(body) {
  try {
    const b64url = body.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64url.padEnd(Math.ceil(b64url.length / 4) * 4, '=');
    return atob(padded);
  } catch {
    return atob(body);
  }
}

/**
 * ============ OAuth state 防 CSRF（cookie + 服务端存储双通道） ============
 *
 * 仅靠 cookie 校验 state 有一个部署盲区：当站点访问域名与回调域名
 * （OAUTH_REDIRECT_ORIGIN，如绑定自定义域 vs *.pages.dev）不一致时，
 * 入口在 A 域写的 oauth_state cookie 不会随浏览器带到 B 域的回调请求，
 * 强制校验会导致所有第三方登录失败。
 *
 * 因此入口把 state 同时写入 oauth_states 表（TTL 10 分钟），
 * 回调侧「cookie 匹配」或「消费一条服务端记录（DELETE..RETURNING 原子一次性）」
 * 任一命中即放行，其余一律拒绝。
 */

const OAUTH_STATE_TTL_MINUTES = 10;

/** OAuth 入口调用：登记本次授权流程的 state */
export async function rememberOAuthState(env, state) {
  try {
    await env.cloud_lens_data.prepare('INSERT INTO oauth_states (state) VALUES (?)').bind(state).run();
    // 顺手清理过期记录，失败不影响主流程
    await env.cloud_lens_data.prepare(`DELETE FROM oauth_states WHERE created_at < datetime('now', '-${OAUTH_STATE_TTL_MINUTES} minutes')`).run();
  } catch (err) {
    console.error('[oauth] rememberState failed:', err);
  }
}

/**
 * 生成签名 state：
 * - 登录模式（uid=null）：匿名防伪造标记
 * - 绑定模式（uid=当前用户ID）：回调据此还原「这是绑定操作而非登录」，
 *   不依赖 cookie 即可跨域名工作
 * 未配置 TOKEN_SIGN_KEY 时返回 null（调用方降级为旧版 UUID 流程）
 */
export async function makeOAuthState(env, uid = null) {
  const payload = {
    v: 1,
    uid,
    purpose: uid === null ? 'oauth-login' : 'oauth-bind',
    exp: Date.now() + OAUTH_STATE_TTL_MINUTES * 60 * 1000,
  };
  try {
    return await signedToken(env, payload);
  } catch (err) {
    console.error('[oauth] makeOAuthState failed:', err);
    return null;
  }
}

/**
 * OAuth 回调调用：校验并一次性消费 state（旧版 UUID 兼容通道）
 * @returns {Promise<boolean>} true 表示合法
 */
export async function verifyOAuthState({ env, request, state }) {
  if (!state) return false;

  // 1. cookie 匹配（同域名部署的标准路径）
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookieEntry = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('oauth_state='));
  const cookieState = cookieEntry?.split('=')[1];
  if (cookieState && state === cookieState) return true;

  // 2. 服务端记录匹配（跨域名部署），DELETE..RETURNING 保证一条记录只能被消费一次
  try {
    const consumed = await env.cloud_lens_data
      .prepare('DELETE FROM oauth_states WHERE state = ? AND created_at >= datetime(\'now\', \'-' + OAUTH_STATE_TTL_MINUTES + ' minutes\') RETURNING state')
      .bind(state)
      .first();
    return !!consumed;
  } catch (err) {
    console.error('[oauth] verifyState failed:', err);
    return false;
  }
}

const OAUTH_SIGNED_PURPOSES = ['oauth-login', 'oauth-bind'];

/**
 * 解析回调携带的 state，返回 { mode: 'login'|'bind', uid }；
 * 依次尝试：新版签名 state → 旧版 UUID（cookie / 服务端一次性记录）。都不匹配返回 null
 */
export async function resolveOAuthState({ env, request, url }) {
  const state = url.searchParams.get('state');
  if (!state) return null;

  // 1. 新版签名 state
  const payload = await verifySignedToken(env, state);
  if (payload && OAUTH_SIGNED_PURPOSES.includes(payload.purpose) && Date.now() <= payload.exp) {
    const isBind = payload.purpose === 'oauth-bind' && Number.isInteger(payload.uid) && payload.uid > 0;
    return { mode: isBind ? 'bind' : 'login', uid: isBind ? payload.uid : null };
  }

  // 2. 旧版 UUID 兼容（仅登录语义）
  if (await verifyOAuthState({ env, request, state })) {
    return { mode: 'login', uid: null };
  }
  return null;
}

/**
 * 绑定流程执行体：把第三方身份关联到当前会话用户。
 * 与登录流程的关键区别——绝不创建或切换 session。
 * 成功/失败均返回自动跳回设置页的结果 HTML，由页面 toast 展示。
 */
export async function performOAuthBind(env, request, expectedUid, provider, providerId, email, avatarUrl) {
  const { user } = await getUserFromRequest(request, env);
  if (!user || user.id !== expectedUid) {
    return bindResultPage(provider, false, '登录状态已变化，请重新进入设置页操作');
  }

  // 幂等/冲突检查先行：已绑到本账号直接成功返回，避免误报其他校验错误
  const existing = await env.cloud_lens_data
    .prepare('SELECT user_id FROM user_auth_methods WHERE provider = ? AND provider_id = ?')
    .bind(provider, String(providerId))
    .first();
  if (existing) {
    return existing.user_id === user.id
      ? bindResultPage(provider, true, '该第三方账号已绑定到当前账号')
      : bindResultPage(provider, false, '该第三方账号已被其他账号绑定');
  }

  // 规则：账号未绑定邮箱前，不允许再绑定其他第三方（先有可找回的身份锚点）
  if (provider !== 'email') {
    const methods = await getUserAuthMethods(env, user.id);
    const hasEmailAnchor =
      (Array.isArray(methods) && methods.some((m) => m.provider === 'email')) || !!user.email;
    if (!hasEmailAnchor) {
      return bindResultPage(provider, false, '当前账号未绑定邮箱，请先绑定邮箱后再绑定第三方账号');
    }
  }

  try {
    await env.cloud_lens_data
      .prepare('INSERT INTO user_auth_methods (user_id, provider, provider_id, email) VALUES (?, ?, ?, ?)')
      .bind(user.id, provider, String(providerId), email || null)
      .run();
  } catch (err) {
    console.error('[oauth-bind] insert failed:', err);
    return bindResultPage(provider, false, '绑定失败，请稍后重试');
  }

  // 当前用户没有头像时用第三方的补全
  if (avatarUrl && !user.avatar_url) {
    await env.cloud_lens_data.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').bind(avatarUrl, user.id).run();
  }

  return bindResultPage(provider, true, '绑定成功');
}

/** 绑定结果落地页：自动跳回 /settings 并通过 query 带回结果供页面 toast */
export function bindResultPage(provider, ok, message) {
  const safeMsg = String(message || '').replace(/[<>&"]/g, '');
  const q = new URLSearchParams({
    bind_provider: provider,
    bind_status: ok ? 'success' : 'error',
    bind_msg: safeMsg,
  }).toString();
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>绑定结果</title></head><body>
<p>${ok ? '✅' : '❌'} ${safeMsg || (ok ? '操作成功' : '操作失败')}，正在返回设置页...</p>
<script>location.replace('/settings?' + ${JSON.stringify(q)});</script>
</body></html>`;
  return new Response(html, {
    status: ok ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/**
 * 统一的安全错误响应（不泄露内部错误细节）
 */
export function safeError(message, status = 500) {
  return Response.json({ success: false, error: message }, { status });
}
