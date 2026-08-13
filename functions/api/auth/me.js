/**
 * /api/auth/me
 *
 * 获取当前登录用户信息
 */
import { getUserFromRequest } from './_utils.js';

export async function onRequest({ request, env }) {
  const { user } = await getUserFromRequest(request, env);
  return Response.json({ user });
}
