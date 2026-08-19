/**
 * /api/auth/me
 *
 * 获取当前登录用户信息（含已绑定的登录方式）
 */
import { getUserFromRequest, getUserAuthMethods } from './_utils.js';

export async function onRequest({ request, env }) {
  const { user } = await getUserFromRequest(request, env);

  if (!user) {
    return Response.json({ user: null });
  }

  // 获取已绑定的登录方式
  const authMethods = await getUserAuthMethods(env, user.id);

  return Response.json({
    user: {
      ...user,
      auth_methods: authMethods.map((m) => ({ provider: m.provider, email: m.email })),
    },
  });
}
