/**
 * /api/auth/register
 *
 * 邮箱密码注册
 * POST body: { email, password, token }
 * token 是 verify-code 返回的临时 token
 *
 * 注册成功后自动创建 session 并返回 cookie
 */
import { hashPassword, createSession } from './_utils.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { email, password, token } = body;
  if (!email || !password || !token) {
    return Response.json({ success: false, error: '缺少参数' }, { status: 400 });
  }

  // 验证 token
  let tokenData;
  try {
    tokenData = JSON.parse(atob(token));
  } catch {
    return Response.json({ success: false, error: '无效的 token' }, { status: 400 });
  }

  if (tokenData.email !== email) {
    return Response.json({ success: false, error: 'token 与邮箱不匹配' }, { status: 400 });
  }

  if (tokenData.purpose !== 'register') {
    return Response.json({ success: false, error: 'token 用途不匹配' }, { status: 400 });
  }

  if (Date.now() > tokenData.exp) {
    return Response.json({ success: false, error: 'token 已过期，请重新验证' }, { status: 400 });
  }

  // 再次检查邮箱是否已注册（防止并发）
  const existing = await env.cloud_lens_data
    .prepare('SELECT id FROM users WHERE provider = ? AND provider_id = ?')
    .bind('email', email)
    .first();
  if (existing) {
    return Response.json({ success: false, error: '该邮箱已注册' }, { status: 400 });
  }

  // 哈希密码
  const passwordHash = await hashPassword(password);

  // 插入用户
  let user;
  try {
    const result = await env.cloud_lens_data
      .prepare(
        `INSERT INTO users (provider, provider_id, email, username, avatar_url, password_hash)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind('email', email, email, email.split('@')[0], null, passwordHash)
      .run();

    user = { id: result.meta.last_row_id };
  } catch (err) {
    return Response.json(
      { success: false, error: 'Database error', message: err.message },
      { status: 500 },
    );
  }

  // 创建 session
  const url = new URL(request.url);
  let sessionHeaders;
  try {
    const result = await createSession(env, user.id, url);
    sessionHeaders = result.headers;
  } catch (err) {
    return Response.json(
      { success: false, error: 'Database error (sessions)', message: err.message },
      { status: 500 },
    );
  }

  return Response.json({ success: true }, { headers: sessionHeaders });
}
