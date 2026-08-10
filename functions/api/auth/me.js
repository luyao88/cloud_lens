/**
 * /api/auth/me
 *
 * 获取当前登录用户信息
 */
export async function onRequest({ request, env }) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const sessionCookie = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('session='));

  if (!sessionCookie) {
    return Response.json({ user: null });
  }

  const sessionId = sessionCookie.split('=')[1];

  // 查询 session
  const session = await env.cloud_lens_data
    .prepare(`SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')`)
    .bind(sessionId)
    .first();

  if (!session) {
    return Response.json({ user: null });
  }

  // 查询用户
  const user = await env.cloud_lens_data
    .prepare('SELECT id, username, avatar_url, email FROM users WHERE id = ?')
    .bind(session.user_id)
    .first();

  if (!user) {
    return Response.json({ user: null });
  }

  return Response.json({ user });
}
