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

  const user = await env.cloud_lens_data.prepare('SELECT id, username, avatar_url, email FROM users WHERE id = ?').bind(session.user_id).first();

  return { user: user || null, session };
}

/**
 * 查找或创建用户（支持多登录方式关联）
 *
 * 查找逻辑：
 * 1. 先按 (provider, provider_id) 在 user_auth_methods 中精确查找
 * 2. 如果没找到且 email 不为空，尝试按 email 关联到已有用户（实现账号合并）
 * 3. 都没找到则创建新用户 + 写入 user_auth_methods
 */
export async function findOrCreateUser(env, provider, providerId, email, username, avatarUrl) {
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

  // 2. 如果有 email，尝试按 email 关联到已有用户
  if (email) {
    const existingUser = await env.cloud_lens_data
      .prepare('SELECT id, username, avatar_url, email FROM users WHERE email = ?')
      .bind(email)
      .first();

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
        await env.cloud_lens_data
          .prepare('UPDATE users SET avatar_url = ? WHERE id = ?')
          .bind(avatarUrl, existingUser.id)
          .run();
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
 */
export async function getUserAuthMethods(env, userId) {
  const methods = await env.cloud_lens_data
    .prepare(
      `SELECT provider, provider_id, email FROM user_auth_methods WHERE user_id = ? ORDER BY created_at`,
    )
    .bind(userId)
    .all();

  return methods.results || [];
}

/**
 * 绑定新登录方式到已有用户
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function bindAuthMethod(env, userId, provider, providerId, email = null, passwordHash = null) {
  // 检查该方式是否已被绑定
  const existing = await env.cloud_lens_data
    .prepare('SELECT user_id FROM user_auth_methods WHERE provider = ? AND provider_id = ?')
    .bind(provider, String(providerId))
    .first();

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

  return bufferToBase64(hashBuffer) === hashBase64;
}

/**
 * ============ 临时 Token 签名工具（防伪造） ============
 * 使用 SHA-256 对 token 内容签名，防止攻击者伪造 register/reset token
 * token 格式: base64(JSON(payload)) + '.' + base64(SHA-256(signingKey + payload))
 */

const TOKEN_SIGN_KEY = 'cloud_lens_verify_token_signing_key_v1';

/**
 * 生成带签名的临时 token
 * @param {object} payload - { email, purpose, exp }
 * @returns {Promise<string>} 签名后的 token
 */
export async function signedToken(payload) {
  const body = btoa(JSON.stringify(payload));
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(body + TOKEN_SIGN_KEY));
  const sig = bufferToBase64(hashBuffer);
  return `${body}.${sig}`;
}

/**
 * 验证并解析带签名的临时 token
 * @param {string} token - 签名 token
 * @returns {Promise<object|null>} 解析后的 payload，验证失败返回 null
 */
export async function verifySignedToken(token) {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(body + TOKEN_SIGN_KEY));
  const expectedSig = bufferToBase64(hashBuffer);

  if (sig !== expectedSig) return null;

  try {
    const data = JSON.parse(atob(body));
    if (!data.email || !data.purpose || !data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * 统一的安全错误响应（不泄露内部错误细节）
 */
export function safeError(message, status = 500) {
  return Response.json({ success: false, error: message }, { status });
}
