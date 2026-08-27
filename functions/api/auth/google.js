/**
 * /api/auth/google
 *
 * Google OAuth 登录入口，重定向到 Google 授权页面
 * 支持 popup 模式：带 ?popup=1 时回调用 cookie 传递 popup 标记
 * 注意：Google 严格要求 redirect_uri 精确匹配（不能带 query 参数）
 */
import { getUserFromRequest, makeOAuthState, rememberOAuthState } from './_utils.js';

export async function onRequest({ request, env }) {
  const requestUrl = new URL(request.url);

  // bind=1 且携带有效会话 → 绑定模式：把当前用户 ID 签入 state
  let bindUid = null;
  if (requestUrl.searchParams.get('bind') === '1') {
    const { user } = await getUserFromRequest(request, env);
    if (!user) {
      // 会话已失效时不静默降级为登录，直接回设置页提示
      return Response.redirect(`${requestUrl.origin}/settings?bind_status=error&bind_msg=${encodeURIComponent('登录状态已失效，请先登录后再绑定第三方账号')}`, 302);
    }
    bindUid = user.id;
  }

  let state = await makeOAuthState(env, bindUid);
  if (state) {
    // 签名 state 自带时效与防伪，无需入库；仍写 cookie 供旧版回调兜底比对
  } else {
    state = crypto.randomUUID();
    await rememberOAuthState(env, state);
  }

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

  // 把 state 存到 cookie + 服务端（跨域名部署时 cookie 可能带不到回调）
  await rememberOAuthState(env, state);
  const headers = new Headers();
  const cookieParts = [`oauth_state=${state}; Path=/; SameSite=Lax; Max-Age=600`];
  if (isPopup) {
    cookieParts.push('oauth_popup=1; Path=/; SameSite=Lax; Max-Age=600');
  }
  headers.set('Set-Cookie', cookieParts.join(', '));
  headers.set('Location', url.toString());

  return new Response(null, { status: 302, headers });
}
