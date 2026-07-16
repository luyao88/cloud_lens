/**
 * /v2/:fileId 路由处理
 *
 * 根据文件类型分流：
 * - 图片：走 WordPress CDN (i0~i3.wp.com) 缓存加速，首次回源到 /imgur-proxy/:fileId 取图
 * - 视频：直接 302 重定向到 i.imgur.com，让浏览器直接与 Imgur 通信
 *   （Cloudflare Workers 代理视频存在兼容性问题，某些文件无法正确返回 Range 响应）
 *
 * 访问链路：
 *   图片：浏览器 -> /v2/xxx.png -> WordPress CDN -> /imgur-proxy/xxx.png -> i.imgur.com/xxx.png
 *   视频：浏览器 -> /v2/xxx.mp4 -> 302 重定向 -> i.imgur.com/xxx.mp4 (浏览器直接 Range 请求)
 */
export async function onRequestGet({ request }) {
  const { url } = request;
  const newUrl = new URL(url);
  const fileId = newUrl.pathname.replace('/v2/', '');

  // 判断是否为视频文件
  const isVideo = /\.(mp4|webm|avi|mov|mkv|flv|wmv|mpeg|mpg)$/i.test(fileId);

  if (isVideo) {
    // 视频：直接 302 重定向到 Imgur，浏览器自行处理 Range 请求
    // Imgur 的 i.imgur.com 域名允许跨域视频播放，无需防盗链处理
    return Response.redirect(`https://i.imgur.com/${fileId}`, 302);
  }

  // 图片代理：走 WordPress CDN 缓存加速
  // 随机选 i0~i3.wp.com 节点，首次访问回源到 /imgur-proxy/:fileId，后续直接返回缓存
  return fetch(`https://i${Math.floor(Math.random() * 4)}.wp.com/${newUrl.hostname}${newUrl.pathname.replace('v2', 'imgur-proxy')}${newUrl.search}`);
}
