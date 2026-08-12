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
import { popupResponse, createSession, findOrCreateUser } from '../_utils.js';

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const isPopup = url.searchParams.get('popup') === '1';

  if (!code) return new Response('Missing code', { status: 400 });

  // 验证 state 防 CSRF
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

  const requestUrl = new URL(request.url);
  const origin = env.OAUTH_REDIRECT_ORIGIN || requestUrl.origin;
  const redirectUri = `${origin}/api/auth/callback/google${isPopup ? '?popup=1' : ''}`;

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
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Google token fetch failed', message: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (!tokenData.access_token) {
    return new Response(
      JSON.stringify({ error: 'No access token', detail: tokenData }),
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
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Google user API failed', message: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (!googleUser.id) {
    return new Response(
      JSON.stringify({ error: 'No user info', detail: googleUser }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 3. 查找或创建用户
  let user;
  try {
    user = await findOrCreateUser(
      env,
      'google',
      googleUser.id,
      googleUser.email,
      googleUser.name || googleUser.email,
      googleUser.picture,
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Database error (users)', message: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 4. 创建 session
  let sessionHeaders;
  try {
    const result = await createSession(env, user.id, url);
    sessionHeaders = result.headers;
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Database error (sessions)', message: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 清除 oauth_state cookie
  const isHttps = url.protocol === 'https:';
  const secureFlag = isHttps ? '; Secure' : '';
  sessionHeaders.append('Set-Cookie', `oauth_state=; Path=/; SameSite=Lax; Max-Age=0${secureFlag}`);

  // 5. popup 模式返回 HTML，否则 302 跳转
  if (isPopup) {
    return popupResponse(true, null, sessionHeaders);
  }

  sessionHeaders.set('Location', '/');
  return new Response(null, { status: 302, headers: sessionHeaders });
}
