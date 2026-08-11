/**
 * /api/auth/google
 *
 * Google OAuth 登录入口，重定向到 Google 授权页面
 * 支持 popup 模式：带 ?popup=1 时回调会返回 postMessage HTML 而非 302 跳转
 */
export async function onRequest({ request, env }) {
  const state = crypto.randomUUID();

  const requestUrl = new URL(request.url);
  const origin = env.OAUTH_REDIRECT_ORIGIN || requestUrl.origin;
  const isPopup = requestUrl.searchParams.get('popup') === '1';

  // redirect_uri 带上 popup 标记，回调据此决定返回 HTML 还是 302 跳转
  const redirectUri = new URL(`${origin}/api/auth/callback/google`);
  if (isPopup) redirectUri.searchParams.set('popup', '1');

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri.toString());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');

  // 把 state 存到 cookie 里防 CSRF
  const headers = new Headers();
  headers.set('Set-Cookie', `oauth_state=${state}; Path=/; SameSite=Lax; Max-Age=600`);
  headers.set('Location', url.toString());

  return new Response(null, { status: 302, headers });
}
