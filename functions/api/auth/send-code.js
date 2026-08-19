/**
 * /api/auth/send-code
 *
 * 发送邮箱验证码
 * POST body: { email, purpose: 'register' | 'login' | 'reset' }
 *
 * 需要环境变量：
 * - RESEND_API_KEY: Resend 邮件服务 API Key
 * - MAIL_FROM: 发件地址（如 onboarding@resend.dev 或你的域名邮箱）
 */

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

  const { email, purpose } = body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ success: false, error: '邮箱格式不正确' }, { status: 400 });
  }

  if (!['register', 'login', 'reset', 'bind-email'].includes(purpose)) {
    return Response.json({ success: false, error: '无效的 purpose' }, { status: 400 });
  }

  // 注册前检查：邮箱是否已注册
  if (purpose === 'register') {
    const existing = await env.cloud_lens_data.prepare('SELECT id FROM users WHERE provider = ? AND provider_id = ?').bind('email', email).first();
    if (existing) {
      return Response.json({ success: false, error: '该邮箱已注册' }, { status: 400 });
    }
  }

  // 登录/重置密码前检查：邮箱是否已注册
  if (purpose === 'login' || purpose === 'reset') {
    const existing = await env.cloud_lens_data.prepare('SELECT id FROM users WHERE provider = ? AND provider_id = ?').bind('email', email).first();
    if (!existing) {
      return Response.json({ success: false, error: '该邮箱未注册' }, { status: 400 });
    }
  }

  // 绑定邮箱前检查：邮箱是否已被绑定
  if (purpose === 'bind-email') {
    const existing = await env.cloud_lens_data
      .prepare('SELECT user_id FROM user_auth_methods WHERE provider = ? AND provider_id = ?')
      .bind('email', email)
      .first();
    if (existing) {
      return Response.json({ success: false, error: '该邮箱已被其他账号绑定' }, { status: 400 });
    }
  }

  // 生成 6 位验证码
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 分钟过期

  // 存入数据库（先使该邮箱之前的未使用验证码失效）
  try {
    await env.cloud_lens_data.prepare('UPDATE verification_codes SET used = 1 WHERE email = ? AND used = 0').bind(email).run();

    await env.cloud_lens_data.prepare(`INSERT INTO verification_codes (email, code, purpose, expires_at) VALUES (?, ?, ?, ?)`).bind(email, code, purpose, expiresAt).run();
  } catch (err) {
    return Response.json({ success: false, error: '服务器内部错误' }, { status: 500 });
  }

  // 调用 Resend API 发送邮件
  const mailFrom = env.MAIL_FROM || 'onboarding@resend.dev';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: mailFrom,
        to: email,
        subject: `镜云图床验证码 - ${code}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #03b6aa;">镜云图床</h2>
            <p>您的验证码是：</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #03b6aa; padding: 16px 0; text-align: center; background: #f5f5f5; border-radius: 8px; margin: 16px 0;">
              ${code}
            </div>
            <p style="color: #888; font-size: 14px;">验证码 10 分钟内有效，请尽快使用。</p>
            <p style="color: #888; font-size: 14px;">如果不是您本人操作，请忽略此邮件。</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ success: false, error: '邮件发送失败', detail: errText }, { status: 500 });
    }
  } catch (err) {
    return Response.json({ success: false, error: '邮件发送失败' }, { status: 500 });
  }

  return Response.json({ success: true });
}
