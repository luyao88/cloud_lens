/**
 * /api/auth/github
 *
 * GitHub OAuth 登录入口，重定向到 GitHub 授权页面
 */
export async function onRequest({ request, env }) {
  const state = crypto.randomUUID();

  const requestUrl = new URL(request.url);
  const origin = env.OAUTH_REDIRECT_ORIGIN || requestUrl.origin;

  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  url.searchParams.set('redirect_uri', `${origin}/api/auth/callback/github`);
  url.searchParams.set('scope', 'read:user user:email');
  url.searchParams.set('state', state);

  // 把 state 存到 cookie 里防 CSRF（本地 http 环境 SameSite=Lax）
  const headers = new Headers();
  headers.set('Set-Cookie', `oauth_state=${state}; Path=/; SameSite=Lax; Max-Age=600`);
  headers.set('Location', url.toString());

  return new Response(null, { status: 302, headers });
}
