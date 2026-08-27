/**
 * /api/auth/github
 *
 * GitHub OAuth 登录入口，重定向到 GitHub 授权页面
 * 支持 popup 模式：带 ?popup=1 时回调会返回 postMessage HTML 而非 302 跳转
 */
import { getUserFromRequest, makeOAuthState, rememberOAuthState } from './_utils.js';

export async function onRequest({ request, env }) {
  const requestUrl = new URL(request.url);

  // bind=1 且携带有效会话 → 绑定模式：把当前用户 ID 签入 state，
  // 回调据此执行账号关联而不是切换登录
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
    // 未配置 TOKEN_SIGN_KEY 的兜底：退回旧版 UUID + 服务端登记（不支持绑定模式）
    state = crypto.randomUUID();
    await rememberOAuthState(env, state);
  }

  const origin = env.OAUTH_REDIRECT_ORIGIN || requestUrl.origin;
  const isPopup = requestUrl.searchParams.get('popup') === '1';

  // redirect_uri 带上 popup 标记，回调据此决定返回 HTML 还是 302
  const redirectUri = new URL(`${origin}/api/auth/callback/github`);
  if (isPopup) redirectUri.searchParams.set('popup', '1');

  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri.toString());
  url.searchParams.set('scope', 'read:user user:email');
  url.searchParams.set('state', state);

  // 把 state 存到 cookie + 服务端（跨域名部署时 cookie 可能带不到回调）
  await rememberOAuthState(env, state);
  const headers = new Headers();
  headers.set('Set-Cookie', `oauth_state=${state}; Path=/; SameSite=Lax; Max-Age=600`);
  headers.set('Location', url.toString());

  return new Response(null, { status: 302, headers });
}
