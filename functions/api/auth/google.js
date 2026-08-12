/**
 * /api/auth/google
 *
 * Google OAuth 登录入口，重定向到 Google 授权页面
 * 支持 popup 模式：带 ?popup=1 时回调用 cookie 传递 popup 标记
 * 注意：Google 严格要求 redirect_uri 精确匹配（不能带 query 参数）
 */
export async function onRequest({ request, env }) {
  const state = crypto.randomUUID();

  const requestUrl = new URL(request.url);
  const origin = env.OAUTH_REDIRECT_ORIGIN || requestUrl.origin;
  const isPopup = requestUrl.searchParams.get('popup') === '1';

  // redirect_uri 不能带 query 参数，popup 标记通过 cookie 传递
  const redirectUri = `${origin}/api/auth/callback/google`;

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');

  // 把 state 和 popup 标记存到 cookie 里防 CSRF + 传递 popup 模式
  const headers = new Headers();
  const cookieParts = [`oauth_state=${state}; Path=/; SameSite=Lax; Max-Age=600`];
  if (isPopup) {
    cookieParts.push('oauth_popup=1; Path=/; SameSite=Lax; Max-Age=600');
  }
  headers.set('Set-Cookie', cookieParts.join(', '));
  headers.set('Location', url.toString());

  return new Response(null, { status: 302, headers });
}
