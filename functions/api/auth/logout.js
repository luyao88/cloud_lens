/**
 * /api/auth/logout
 *
 * 登出：删除 session 记录，清除 cookie
 */
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const isHttps = url.protocol === 'https:';
  const secureFlag = isHttps ? '; Secure' : '';

  const cookieHeader = request.headers.get('Cookie') || '';
  const sessionCookie = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('session='));

  if (sessionCookie) {
    const sessionId = sessionCookie.split('=')[1];
    await env.cloud_lens_data.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
  }

  const headers = new Headers();
  headers.set('Set-Cookie', `session=; Path=/; SameSite=Lax; Max-Age=0; HttpOnly${secureFlag}`);
  headers.set('Location', '/');

  return new Response(null, { status: 302, headers });
}
