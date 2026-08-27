/**
 * /api/auth/bind-email
 *
 * 已登录用户绑定/更换邮箱密码登录方式
 * POST body: { email, token, password?, current_password? }
 *   - token: verify-code 返回的带签名临时 token（purpose='bind-email'）
 *   - password: 首次绑定时设置密码（更换邮箱时不需要，保留旧密码）
 *   - current_password: 更换邮箱时需要验证当前密码（首次绑定不需要）
 *
 * 需要用户已登录（session 有效）
 */
import { hashPassword, verifyPassword, getUserFromRequest, verifySignedToken, validatePassword } from './_utils.js';

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

  const { email, password, token, current_password } = body;
  if (!email || !token) {
    return Response.json({ success: false, error: '缺少参数' }, { status: 400 });
  }

  // 验证签名 token
  const tokenData = await verifySignedToken(env, token);
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
  const existing = await env.cloud_lens_data.prepare('SELECT user_id FROM user_auth_methods WHERE provider = ? AND provider_id = ?').bind('email', email).first();

  if (existing && existing.user_id !== user.id) {
    return Response.json({ success: false, error: '该邮箱已被其他账号绑定' }, { status: 400 });
  }

  if (existing && existing.user_id === user.id) {
    return Response.json({ success: false, error: '该邮箱已绑定到当前账号' }, { status: 400 });
  }

  // 判断是首次绑定还是更换邮箱（优先 user_auth_methods，回退 users 表）
  const usersRow = await env.cloud_lens_data.prepare('SELECT provider, email, password_hash FROM users WHERE id = ?').bind(user.id).first();
  let oldBind = await env.cloud_lens_data.prepare('SELECT provider_id, password_hash FROM user_auth_methods WHERE user_id = ? AND provider = ?').bind(user.id, 'email').first();
  if (!oldBind && usersRow?.provider === 'email') {
    oldBind = { provider_id: usersRow.email, password_hash: usersRow.password_hash };
  }

  let passwordHash;
  let stmts;
  // 邮箱注册的账号需同步 users.provider_id，避免旧邮箱残留可登录
  const syncUsersStmt =
    usersRow?.provider === 'email'
      ? env.cloud_lens_data.prepare('UPDATE users SET email = ?, provider_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(email, email, user.id)
      : env.cloud_lens_data.prepare('UPDATE users SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(email, user.id);

  if (oldBind) {
    // 更换邮箱：需要验证当前密码，不需要新密码
    if (!current_password) {
      return Response.json({ success: false, error: '更换邮箱需要验证当前密码' }, { status: 400 });
    }

    // 获取当前密码哈希
    let storedHash = oldBind.password_hash;
    if (!storedHash) {
      storedHash = usersRow?.password_hash || null;
    }

    if (!storedHash) {
      return Response.json({ success: false, error: '该账号未设置密码' }, { status: 400 });
    }

    const valid = await verifyPassword(current_password, storedHash);
    if (!valid) {
      return Response.json({ success: false, error: '当前密码错误' }, { status: 400 });
    }

    // 保留旧密码哈希
    passwordHash = storedHash;

    stmts = [
      // 解绑旧邮箱
      env.cloud_lens_data.prepare('DELETE FROM user_auth_methods WHERE user_id = ? AND provider = ?').bind(user.id, 'email'),
      // 绑定到当前用户
      env.cloud_lens_data.prepare(`INSERT INTO user_auth_methods (user_id, provider, provider_id, email, password_hash) VALUES (?, ?, ?, ?, ?)`).bind(user.id, 'email', email, email, passwordHash),
      syncUsersStmt,
    ];
  } else {
    // 首次绑定：必须设置密码
    const pwdError = validatePassword(password);
    if (pwdError) {
      return Response.json({ success: false, error: pwdError }, { status: 400 });
    }
    passwordHash = await hashPassword(password);

    stmts = [
      env.cloud_lens_data.prepare(`INSERT INTO user_auth_methods (user_id, provider, provider_id, email, password_hash) VALUES (?, ?, ?, ?, ?)`).bind(user.id, 'email', email, email, passwordHash),
      syncUsersStmt,
    ];
  }

  // batch 为事务：解绑/绑定/users 同步三步要么全部成功要么全部回滚，
  // 避免"删了旧邮箱绑定后插入失败"导致账号丢失邮箱登录方式
  try {
    await env.cloud_lens_data.batch(stmts);
  } catch (err) {
    console.error('[bind-email] batch failed:', err);
    return Response.json({ success: false, error: '绑定失败，请稍后重试' }, { status: 500 });
  }

  return Response.json({ success: true });
}
