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
import { createSession, findOrCreateUser, popupResponse, resolveOAuthState, performOAuthBind } from '../_utils.js';

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) return new Response('Missing code', { status: 400 });

  // 校验 state（签名优先，旧版兼容兜底）并区分 登录/绑定 模式
  const resolved = await resolveOAuthState({ env, request, url });
  if (!resolved) {
    return new Response('Invalid or missing state', { status: 400 });
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
  } catch {
    return new Response(JSON.stringify({ error: 'GitHub API fetch failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!tokenData.access_token) {
    return new Response(JSON.stringify({ error: 'No access token' }), {
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
  } catch {
    return new Response(JSON.stringify({ error: 'GitHub user API failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!githubUser.id) {
    return new Response(JSON.stringify({ error: 'No user info' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. 获取邮箱：只信任「primary 且 verified」的邮箱用于账号合并，
  //    未验证邮箱仅作记录，不参与 findOrCreateUser 的按邮箱合并（防接管）
  let email = githubUser.email;
  let emailTrusted = false;
  if (!email) {
    try {
      const emailRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'User-Agent': 'cloudlens',
        },
      });
      const emails = await emailRes.json();
      const primaryEmail = Array.isArray(emails) ? emails.find((e) => e.primary && e.verified) : null;
      email = primaryEmail?.email || null;
    } catch {}
  }
  emailTrusted = !!email;

  // 绑定模式：把该第三方身份关联到当前会话用户，不创建/切换登录态
  if (resolved.mode === 'bind') {
    return performOAuthBind(env, request, resolved.uid, 'github', String(githubUser.id), email || null, githubUser.avatar_url);
  }

  // 4. 查找或创建用户（仅已验证邮箱参与按邮箱合并）
  let user;
  try {
    user = await findOrCreateUser(
      env,
      'github',
      String(githubUser.id),
      email,
      githubUser.login,
      githubUser.avatar_url,
      { emailTrusted },
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Database error (users)' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 5. 创建 session
  let sessionHeaders;
  try {
    const result = await createSession(env, user.id, url);
    sessionHeaders = result.headers;
  } catch {
    return new Response(JSON.stringify({ error: 'Database error (sessions)' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const isHttps = url.protocol === 'https:';
  const secureFlag = isHttps ? '; Secure' : '';
  sessionHeaders.append('Set-Cookie', `oauth_state=; Path=/; SameSite=Lax; Max-Age=0${secureFlag}`);

  // popup 模式：返回 HTML，用 postMessage 通知父窗口后关闭弹窗
  // targetOrigin 用 '*'：opener 页面域名可能与回调域不同（如 pages.dev 访问自定义域后端）
  const isPopup = url.searchParams.get('popup') === '1';
  if (isPopup) {
    return popupResponse(true, null, sessionHeaders);
  }

  // 普通模式：302 跳转回首页
  sessionHeaders.set('Location', '/');
  return new Response(null, { status: 302, headers: sessionHeaders });
}
