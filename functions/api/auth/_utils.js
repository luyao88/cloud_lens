/**
 * OAuth 回调通用工具函数
 */

/**
 * popup 模式下返回的 HTML 页面
 * 通过 postMessage 通知父窗口登录结果，然后关闭弹窗
 * @param {boolean} success - 是否成功
 * @param {string} [message] - 错误信息
 * @param {Headers} [headers] - 附加的 response headers（如 Set-Cookie）
 */
export function popupResponse(success, message, headers) {
  const data = success ? 'auth-success' : 'auth-error';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>登录中...</title></head><body>
<p>${success ? '登录成功，正在关闭...' : '登录失败'}</p>
<script>
  window.opener.postMessage({ type: '${data}'${message ? `, message: "${message.replace(/"/g, '\\"')}"` : ''} }, '*');
  setTimeout(function(){ window.close(); }, 100);
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
 * 返回 { sessionId, headers }
 */
export async function createSession(env, userId, url) {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const isHttps = url.protocol === 'https:';
  const secureFlag = isHttps ? '; Secure' : '';

  await env.cloud_lens_data
    .prepare(`INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`)
    .bind(sessionId, userId, expiresAt.toISOString())
    .run();

  const headers = new Headers();
  headers.append('Set-Cookie', `session=${sessionId}; Path=/; SameSite=Lax; Max-Age=2592000${secureFlag}`);
  return { sessionId, headers };
}

/**
 * 查找或创建用户（第三方登录通用）
 */
export async function findOrCreateUser(env, provider, providerId, email, username, avatarUrl) {
  let user = await env.cloud_lens_data
    .prepare('SELECT * FROM users WHERE provider = ? AND provider_id = ?')
    .bind(provider, String(providerId))
    .first();

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

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

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

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

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
