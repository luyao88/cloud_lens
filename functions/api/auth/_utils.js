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
 * 查找或创建用户（第三方登录通用）
 */
export async function findOrCreateUser(env, provider, providerId, email, username, avatarUrl) {
  let user = await env.cloud_lens_data.prepare('SELECT * FROM users WHERE provider = ? AND provider_id = ?').bind(provider, String(providerId)).first();

  if (!user) {
    const result = await env.cloud_lens_data
      .prepare(
        `INSERT INTO users (provider, provider_id, email, username, avatar_url)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(provider, String(providerId), email, username, avatarUrl)
      .run();

    user = {
      id: result.meta.last_row_id,
      username,
      avatar_url: avatarUrl,
    };
  }

  return user;
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
 * 使用 HMAC-SHA256 对 token 内容签名，防止攻击者伪造 register/reset token
 * token 格式: base64(JSON(payload)) + '.' + base64(HMAC-SHA256(signingKey, payload))
 */

const TOKEN_SIGN_KEY = 'cloud_lens_verify_token_signing_key_v1';

async function hmacSign(key, message) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(key), 'HMAC', false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return bufferToBase64(sig);
}

async function hmacVerify(key, message, signature) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(key), 'HMAC', false, ['verify']);
  const sigBytes = base64ToBuffer(signature);
  return crypto.subtle.verify('HMAC', cryptoKey, sigBytes, enc.encode(message));
}

/**
 * 生成带签名的临时 token
 * @param {object} payload - { email, purpose, exp }
 * @returns {Promise<string>} 签名后的 token
 */
export async function signedToken(payload) {
  const body = btoa(JSON.stringify(payload));
  const sig = await hmacSign(TOKEN_SIGN_KEY, body);
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

  const valid = await hmacVerify(TOKEN_SIGN_KEY, body, sig);
  if (!valid) return null;

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
