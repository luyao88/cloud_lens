/**
 * /api/auth/bind-email
 *
 * 已登录用户绑定邮箱密码登录方式
 * POST body: { email, password, token }
 *   - token: verify-code 返回的带签名临时 token（purpose='bind-email'）
 *
 * 需要用户已登录（session 有效）
 */
import { hashPassword, getUserFromRequest, verifySignedToken, bindAuthMethod } from './_utils.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  // 验证登录状态
  const { user } = await getUserFromRequest(request, env);
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 });
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

  // 验证签名 token
  const tokenData = await verifySignedToken(token);
  if (!tokenData) {
    return Response.json({ success: false, error: '无效的 token' }, { status: 400 });
  }

  if (tokenData.email !== email) {
    return Response.json({ success: false, error: 'token 与邮箱不匹配' }, { status: 400 });
  }

  if (tokenData.purpose !== 'bind-email') {
    return Response.json({ success: false, error: 'token 用途不匹配' }, { status: 400 });
  }

  if (Date.now() > tokenData.exp) {
    return Response.json({ success: false, error: 'token 已过期，请重新验证' }, { status: 400 });
  }

  // 检查该邮箱是否已被其他用户绑定
  const existing = await env.cloud_lens_data
    .prepare('SELECT user_id FROM user_auth_methods WHERE provider = ? AND provider_id = ?')
    .bind('email', email)
    .first();

  if (existing && existing.user_id !== user.id) {
    return Response.json({ success: false, error: '该邮箱已被其他账号绑定' }, { status: 400 });
  }

  // 如果当前用户已经绑定了该邮箱，提示无需重复绑定
  if (existing && existing.user_id === user.id) {
    return Response.json({ success: false, error: '该邮箱已绑定到当前账号' }, { status: 400 });
  }

  // 哈希密码
  const passwordHash = await hashPassword(password);

  // 绑定到当前用户
  const result = await bindAuthMethod(env, user.id, 'email', email, email, passwordHash);
  if (!result.success) {
    return Response.json({ success: false, error: result.error }, { status: 400 });
  }

  // 更新 users 表的 email（如果之前为空）
  if (!user.email) {
    await env.cloud_lens_data
      .prepare('UPDATE users SET email = ? WHERE id = ?')
      .bind(email, user.id)
      .run();
  }

  return Response.json({ success: true });
}
