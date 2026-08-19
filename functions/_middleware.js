/**
 * 全局中间件
 *
 * Cloudflare Pages Functions 的 _middleware.js 会对同目录及子目录下
 * 的所有函数生效。这里用 try-catch 包裹请求，捕获任何未处理的异常，
 * 返回结构化的 JSON 错误信息，而不是裸 500。
 */
export async function onRequest(context) {
  try {
    return await context.next();
  } catch (err) {
    console.error('[middleware] unhandled error:', err);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
