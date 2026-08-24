/**
 * /api/auth/update-profile
 *
 * 已登录用户更新个人信息（用户名、头像）
 * POST body: { username?, avatar_url? }
 *
 * 需要用户已登录（session 有效）
 */
import { getUserFromRequest } from './_utils.js';

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

  const { username, avatar_url } = body;

  // 构建动态更新字段
  const updates = [];
  const params = [];

  if (username !== undefined) {
    const trimmed = String(username).trim();
    if (trimmed.length === 0 || trimmed.length > 32) {
      return Response.json({ success: false, error: '用户名长度需在 1-32 个字符之间' }, { status: 400 });
    }
    updates.push('username = ?');
    params.push(trimmed);
  }

  if (avatar_url !== undefined) {
    const url = String(avatar_url).trim();
    if (url && !/^https?:\/\/.+/i.test(url)) {
      return Response.json({ success: false, error: '头像链接必须是有效的 http/https URL' }, { status: 400 });
    }
    updates.push('avatar_url = ?');
    params.push(url || null);
  }

  if (!updates.length) {
    return Response.json({ success: false, error: '没有需要更新的字段' }, { status: 400 });
  }

  params.push(user.id);
  await env.cloud_lens_data.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();

  return Response.json({ success: true });
}
