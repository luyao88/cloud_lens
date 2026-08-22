/**
 * /api/auth/change-password
 *
 * 修改密码（需登录）
 * POST body: { current_password, new_password }
 *
 * 验证当前密码 → 更新 user_auth_methods + users 表中的 password_hash
 */
import { verifyPassword, hashPassword, getUserFromRequest } from './_utils.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') {
    return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

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

  const { current_password, new_password } = body;
  if (!current_password || !new_password) {
    return Response.json({ success: false, error: '缺少参数' }, { status: 400 });
  }

  if (new_password.length < 6) {
    return Response.json({ success: false, error: '新密码至少 6 位' }, { status: 400 });
  }

  // 获取当前密码哈希（优先 user_auth_methods，回退 users 表）
  let storedHash;
  const authMethod = await env.cloud_lens_data
    .prepare('SELECT password_hash FROM user_auth_methods WHERE user_id = ? AND provider = ?')
    .bind(user.id, 'email')
    .first();

  if (authMethod) {
    storedHash = authMethod.password_hash;
  } else {
    const userRow = await env.cloud_lens_data
      .prepare('SELECT password_hash FROM users WHERE id = ?')
      .bind(user.id)
      .first();
    storedHash = userRow?.password_hash;
  }

  if (!storedHash) {
    return Response.json({ success: false, error: '该账号未设置密码' }, { status: 400 });
  }

  // 验证当前密码
  const valid = await verifyPassword(current_password, storedHash);
  if (!valid) {
    return Response.json({ success: false, error: '当前密码错误' }, { status: 400 });
  }

  // 哈希新密码
  const newHash = await hashPassword(new_password);

  // 更新 user_auth_methods
  try {
    await env.cloud_lens_data
      .prepare('UPDATE user_auth_methods SET password_hash = ? WHERE user_id = ? AND provider = ?')
      .bind(newHash, user.id, 'email')
      .run();
  } catch (err) {
    // 旧用户可能没有 user_auth_methods 记录
  }

  // 更新 users 表
  try {
    await env.cloud_lens_data
      .prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(newHash, user.id)
      .run();
  } catch (err) {
    return Response.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }

  return Response.json({ success: true });
}
