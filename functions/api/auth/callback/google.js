/**
 * /api/auth/callback/google
 *
 * Google OAuth 回调处理：
 * 1. 用 code 换 access_token
 * 2. 获取 Google 用户信息
 * 3. 查找或创建用户
 * 4. 创建 session
 * 5. 设置 Cookie 并跳转回首页（或 popup 模式返回 postMessage HTML）
 */
import { popupResponse, createSession, findOrCreateUser, verifyOAuthState } from '../_utils.js';

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // 从 cookie 读取 popup 标记（redirect_uri 不能带 query 参数）
  const cookieHeader = request.headers.get('Cookie') || '';
  const isPopup = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .some((c) => c.startsWith('oauth_popup=1'));

  if (!code) return new Response('Missing code', { status: 400 });

  // 强制校验 state 防 CSRF：cookie 或服务端记录任一命中即可
  if (!(await verifyOAuthState({ env, request, state }))) {
    return new Response('Invalid or missing state', { status: 400 });
  }

  const requestUrl = new URL(request.url);
  const origin = env.OAUTH_REDIRECT_ORIGIN || requestUrl.origin;
  const redirectUri = `${origin}/api/auth/callback/google`;

  // 1. 用 code 换 access_token
  let tokenData;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });
    tokenData = await tokenRes.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Google token fetch failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (!tokenData.access_token) {
    return new Response(
      JSON.stringify({ error: 'No access token' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { access_token } = tokenData;

  // 2. 获取用户信息
  let googleUser;
  try {
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    googleUser = await userRes.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Google user API failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (!googleUser.id) {
    return new Response(
      JSON.stringify({ error: 'No user info' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 3. 查找或创建用户（Google 邮箱必定经过验证，可信参与账号合并）
  let user;
  try {
    user = await findOrCreateUser(
      env,
      'google',
      googleUser.id,
      googleUser.email,
      googleUser.name || googleUser.email,
      googleUser.picture,
      { emailTrusted: true },
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Database error (users)' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 4. 创建 session
  let sessionHeaders;
  try {
    const result = await createSession(env, user.id, url);
    sessionHeaders = result.headers;
  } catch {
    return new Response(
      JSON.stringify({ error: 'Database error (sessions)' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 清除 oauth_state cookie
  const isHttps = url.protocol === 'https:';
  const secureFlag = isHttps ? '; Secure' : '';
  sessionHeaders.append('Set-Cookie', `oauth_state=; Path=/; SameSite=Lax; Max-Age=0${secureFlag}`);

  // 5. popup 模式返回 HTML，否则 302 跳转
  if (isPopup) {
    // postMessage 目标 origin 收敛为本站，避免向任意页面广播登录状态
    // targetOrigin 用 '*'：opener 页面域名可能与回调域不同（如 pages.dev 访问自定义域后端）
    return popupResponse(true, null, sessionHeaders);
  }

  sessionHeaders.set('Location', '/');
  return new Response(null, { status: 302, headers: sessionHeaders });
}
