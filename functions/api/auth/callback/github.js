/**
 * /api/auth/callback/github
 *
 * GitHub OAuth 回调处理：
 * 1. 用 code 换 access_token
 * 2. 获取 GitHub 用户信息
 * 3. 查找或创建用户
 * 4. 创建 session
 * 5. 设置 Cookie 并跳转回首页
 */
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) return new Response('Missing code', { status: 400 });

  // 验证 state 防 CSRF（如果 cookie 中有 state 才验证，本地代理可能丢失 cookie）
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookieState = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('oauth_state='));
  const savedState = cookieState?.split('=')[1];

  if (savedState) {
    if (!state || state !== savedState) {
      return new Response('Invalid state', { status: 400 });
    }
  }

  // 1. 用 code 换 access_token
  let tokenData;
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    tokenData = await tokenRes.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: 'GitHub API fetch failed', message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!tokenData.access_token) {
    return new Response(JSON.stringify({ error: 'No access token', detail: tokenData }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { access_token } = tokenData;

  // 2. 获取用户信息
  let githubUser;
  try {
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'User-Agent': 'cloudlens',
      },
    });
    githubUser = await userRes.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: 'GitHub user API failed', message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!githubUser.id) {
    return new Response(JSON.stringify({ error: 'No user info', detail: githubUser }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. 如果没有 email，尝试获取
  let email = githubUser.email;
  if (!email) {
    try {
      const emailRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'User-Agent': 'cloudlens',
        },
      });
      const emails = await emailRes.json();
      const primaryEmail = emails.find((e) => e.primary);
      email = primaryEmail?.email || null;
    } catch {}
  }

  // 4. 查找或创建用户
  let user;
  try {
    user = await env.cloud_lens_data
      .prepare('SELECT * FROM users WHERE provider = ? AND provider_id = ?')
      .bind('github', String(githubUser.id))
      .first();

    if (!user) {
      const result = await env.cloud_lens_data
        .prepare(
          `INSERT INTO users (provider, provider_id, email, username, avatar_url)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .bind('github', String(githubUser.id), email, githubUser.login, githubUser.avatar_url)
        .run();

      user = {
        id: result.meta.last_row_id,
        username: githubUser.login,
        avatar_url: githubUser.avatar_url,
      };
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Database error (users)', message: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 5. 创建 session
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  try {
    await env.cloud_lens_data
      .prepare(`INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`)
      .bind(sessionId, user.id, expiresAt.toISOString())
      .run();
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Database error (sessions)', message: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 6. 设置 Cookie 并跳转回首页
  const isHttps = url.protocol === 'https:';
  const secureFlag = isHttps ? '; Secure' : '';

  const headers = new Headers();
  headers.append('Set-Cookie', `oauth_state=; Path=/; SameSite=Lax; Max-Age=0${secureFlag}`);
  headers.append('Set-Cookie', `session=${sessionId}; Path=/; SameSite=Lax; Max-Age=2592000${secureFlag}`);

  // popup 模式：返回 HTML，用 postMessage 通知父窗口后关闭弹窗
  const isPopup = url.searchParams.get('popup') === '1';
  if (isPopup) {
    // 把 Set-Cookie header 加到 HTML 响应上，确保 session cookie 被设置
    headers.set('Content-Type', 'text/html; charset=utf-8');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>登录中...</title></head><body>
<p>登录成功，正在关闭...</p>
<script>
  window.opener.postMessage({ type: 'auth-success' }, '*');
  setTimeout(() => window.close(), 100);
<\/script>
</body></html>`;
    return new Response(html, { status: 200, headers });
  }

  // 普通模式：302 跳转回首页
  headers.set('Location', '/');
  return new Response(null, { status: 302, headers });
}
