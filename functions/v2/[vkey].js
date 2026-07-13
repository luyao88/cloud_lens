/**
 * /v2/:fileId 路由处理
 *
 * 根据文件类型分流：
 * - 图片：走 WordPress CDN (i0~i3.wp.com) 缓存加速，首次回源到 /imgur-proxy/:fileId 取图
 * - 视频：直接代理到 i.imgur.com，转发 Range 请求支持视频分段加载，添加长缓存头让 Cloudflare 边缘缓存
 *
 * 访问链路：
 *   图片：浏览器 -> /v2/xxx.png -> WordPress CDN -> /imgur-proxy/xxx.png -> i.imgur.com/xxx.png
 *   视频：浏览器 -> /v2/xxx.mp4 -> i.imgur.com/xxx.mp4 (Range 请求) -> Cloudflare 边缘缓存
 */
export async function onRequestGet({ request }) {
  const { url, headers } = request;
  const newUrl = new URL(url);
  const fileId = newUrl.pathname.replace('/v2/', '');

  // 判断是否为视频文件（WordPress CDN 仅支持图片缓存，视频需直接走 Imgur 代理）
  const isVideo = /\.(mp4|webm|avi|mov|mkv|flv|wmv|mpeg|mpg)$/i.test(fileId);

  if (isVideo) {
    // 视频代理：直接请求 Imgur，转发 Range 头支持分段加载
    const res = await fetch(`https://i.imgur.com/${fileId}`, {
      headers: {
        referer: 'https://www.vhimg.com', // 绕过 Imgur 防盗链
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        // 转发 Range 请求头，视频播放器依赖此头实现分段加载和拖拽跳转
        ...(headers.get('range') ? { range: headers.get('range') } : {}),
      },
    });
    // 保留原始响应（Content-Type、Content-Length、Accept-Ranges 等），添加缓存头
    const newRes = new Response(res.body, res);
    newRes.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return newRes;
  }

  // 图片代理：走 WordPress CDN 缓存加速
  // 随机选 i0~i3.wp.com 节点，首次访问回源到 /imgur-proxy/:fileId，后续直接返回缓存
  return fetch(`https://i${Math.floor(Math.random() * 4)}.wp.com/${newUrl.hostname}${newUrl.pathname.replace('v2', 'imgur-proxy')}${newUrl.search}`);
}
