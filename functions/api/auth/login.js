/**
 * /api/auth/login
 *
 * 邮箱密码登录
 * POST body: { email, password, remember }
 *
 * 登录成功后创建 session 并返回 cookie
 * remember=true（默认）: 30 天持久 cookie；remember=false: 会话级 cookie
 */
import { verifyPassword, createSession } from './_utils.js';

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

  const { email, password, remember } = body;
  if (!email || !password) {
    return Response.json({ success: false, error: '缺少参数' }, { status: 400 });
  }

  // 查询用户（优先从 user_auth_methods 查，回退到 users 表）
  let user;
  try {
    user = await env.cloud_lens_data
      .prepare(
        `SELECT u.id, u.username, u.avatar_url, u.email, m.password_hash
         FROM user_auth_methods m
         JOIN users u ON u.id = m.user_id
         WHERE m.provider = ? AND m.provider_id = ?`,
      )
      .bind('email', email)
      .first();

    // 回退：旧用户可能还没有 user_auth_methods 记录
    if (!user) {
      user = await env.cloud_lens_data.prepare('SELECT * FROM users WHERE provider = ? AND provider_id = ?').bind('email', email).first();
    }
  } catch (err) {
    return Response.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }

  if (!user) {
    return Response.json({ success: false, error: '邮箱或密码错误' }, { status: 400 });
  }

  // 验证密码（password_hash 可能在 user_auth_methods 或 users 表中）
  const passwordHash = user.password_hash;
  if (!passwordHash) {
    return Response.json({ success: false, error: '该账号未设置密码，请使用第三方登录' }, { status: 400 });
  }

  const valid = await verifyPassword(password, passwordHash);
  if (!valid) {
    return Response.json({ success: false, error: '邮箱或密码错误' }, { status: 400 });
  }

  // 创建 session
  const url = new URL(request.url);
  let sessionHeaders;
  try {
    const result = await createSession(env, user.id, url, remember !== false);
    sessionHeaders = result.headers;
  } catch (err) {
    return Response.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }

  return Response.json({ success: true }, { headers: sessionHeaders });
}
