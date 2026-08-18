/**
 * /api/auth/reset-password
 *
 * 重置密码
 * POST body: { email, password, token }
 * token 是 verify-code（purpose='reset'）返回的带 HMAC 签名的临时 token
 *
 * 重置成功后不自动登录，返回 { success: true }，前端引导回登录页
 */
import { hashPassword, verifySignedToken } from './_utils.js';

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

  // 验证带签名的 token
  const tokenData = await verifySignedToken(token);
  if (!tokenData) {
    return Response.json({ success: false, error: '无效的 token' }, { status: 400 });
  }

  if (tokenData.email !== email) {
    return Response.json({ success: false, error: 'token 与邮箱不匹配' }, { status: 400 });
  }

  if (tokenData.purpose !== 'reset') {
    return Response.json({ success: false, error: 'token 用途不匹配' }, { status: 400 });
  }

  if (Date.now() > tokenData.exp) {
    return Response.json({ success: false, error: 'token 已过期，请重新验证' }, { status: 400 });
  }

  // 查找用户
  const user = await env.cloud_lens_data
    .prepare('SELECT id FROM users WHERE provider = ? AND provider_id = ?')
    .bind('email', email)
    .first();

  if (!user) {
    return Response.json({ success: false, error: '该邮箱未注册' }, { status: 400 });
  }

  // 哈希新密码
  const passwordHash = await hashPassword(password);

  try {
    await env.cloud_lens_data
      .prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(passwordHash, user.id)
      .run();
  } catch (err) {
    return Response.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 },
    );
  }

  return Response.json({ success: true });
}
