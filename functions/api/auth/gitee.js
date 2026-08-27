/**
 * /api/auth/gitee
 *
 * Gitee OAuth 登录入口，重定向到 Gitee 授权页面
 */
import { rememberOAuthState } from './_utils.js';

export async function onRequest({ request, env }) {
  const state = crypto.randomUUID();

  const requestUrl = new URL(request.url);
  const origin = env.OAUTH_REDIRECT_ORIGIN || requestUrl.origin;

  const redirectUri = `${origin}/api/auth/callback/gitee`;

  const url = new URL('https://gitee.com/oauth/authorize');
  url.searchParams.set('client_id', env.GITEE_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'user_info');
  url.searchParams.set('state', state);

  // 把 state 存到 cookie + 服务端（跨域名部署时 cookie 可能带不到回调）
  await rememberOAuthState(env, state);
  const headers = new Headers();
  headers.set('Set-Cookie', `oauth_state=${state}; Path=/; SameSite=Lax; Max-Age=600`);
  headers.set('Location', url.toString());

  return new Response(null, { status: 302, headers });
}
