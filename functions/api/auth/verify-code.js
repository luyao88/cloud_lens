/**
 * /api/auth/verify-code
 *
 * 校验验证码，返回带签名的临时 token（用于后续注册/重置密码接口）
 * POST body: { email, code, purpose }
 *
 * 临时 token = base64(JSON({ email, purpose, exp })) + '.' + HMAC-SHA256 签名
 */
import { signedToken } from './_utils.js';

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

  const { email, code, purpose } = body;
  if (!email || !code) {
    return Response.json({ success: false, error: '缺少参数' }, { status: 400 });
  }

  // 查询最新的未使用验证码
  let record;
  try {
    record = await env.cloud_lens_data
      .prepare(
        `SELECT * FROM verification_codes
         WHERE email = ? AND code = ? AND used = 0
         ORDER BY id DESC LIMIT 1`,
      )
      .bind(email, code)
      .first();
  } catch (err) {
    return Response.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }

  if (!record) {
    return Response.json({ success: false, error: '验证码错误' }, { status: 400 });
  }

  // 检查是否过期
  if (new Date(record.expires_at) < new Date()) {
    return Response.json({ success: false, error: '验证码已过期' }, { status: 400 });
  }

  // 检查 purpose 是否匹配
  if (purpose && record.purpose !== purpose) {
    return Response.json({ success: false, error: '验证码用途不匹配' }, { status: 400 });
  }

  // 标记为已使用
  try {
    await env.cloud_lens_data
      .prepare('UPDATE verification_codes SET used = 1 WHERE id = ?')
      .bind(record.id)
      .run();
  } catch (err) {
    return Response.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }

  // 生成带签名的临时 token（10 分钟有效）
  const tokenData = {
    email,
    purpose: record.purpose,
    exp: Date.now() + 10 * 60 * 1000,
  };
  const token = await signedToken(tokenData);

  return Response.json({ success: true, token });
}
