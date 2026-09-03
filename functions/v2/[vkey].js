/**
 * /v2/:fileId 路由处理
 *
 * 根据文件类型分流：
 * - 图片：走 WordPress CDN (i0~i3.wp.com) 缓存加速，首次回源到 /imgur-proxy/:fileId 取图
 * - 视频：Worker 透传代理 i.imgur.com（转发 Range 请求，流式返回响应，
 *   客户端全程只与本站通信，不直连 i.imgur.com）
 *
 * 访问链路：
 *   图片：浏览器 -> /v2/xxx.png -> WordPress CDN -> /imgur-proxy/xxx.png -> i.imgur.com/xxx.png
 *   视频：浏览器 -> /v2/xxx.mp4 -> Worker 透传 -> i.imgur.com/xxx.mp4
 */
export async function onRequestGet({ request }) {
  const { url, headers } = request;
  const newUrl = new URL(url);
  const fileId = newUrl.pathname.replace('/v2/', '');

  // 判断是否为视频文件
  const isVideo = /\.(mp4|webm|avi|mov|mkv|flv|wmv|mpeg|mpg)$/i.test(fileId);

  if (isVideo) {
    // 视频：透传代理 Imgur
    // 把客户端的 Range 头原样转发，支持分段播放/拖动进度条（206 + Content-Range）
    const upstreamHeaders = new Headers();
    const range = headers.get('range');
    if (range) {
      upstreamHeaders.set('Range', range);
    }

    const upstream = await fetch(`https://i.imgur.com/${fileId}`, {
      headers: upstreamHeaders,
    });

    // 原样透传上游响应头（过滤逐跳头与内容编码头）
    const respHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (k === 'set-cookie' || k === 'connection' || k === 'keep-alive' || k === 'transfer-encoding' || k === 'content-encoding') {
        return;
      }
      respHeaders.set(key, value);
    });
    // 允许跨域播放
    respHeaders.set('Access-Control-Allow-Origin', '*');
    if (!respHeaders.has('accept-ranges')) {
      respHeaders.set('Accept-Ranges', 'bytes');
    }

    // 流式转发响应体，原样保留上游状态码（200/206）
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: respHeaders,
    });
  }

  // 图片代理：走 WordPress CDN 缓存加速
  // 随机选 i0~i3.wp.com 节点，首次访问回源到 /imgur-proxy/:fileId，后续直接返回缓存
  return fetch(`https://i${Math.floor(Math.random() * 4)}.wp.com/${newUrl.hostname}${newUrl.pathname.replace('v2', 'imgur-proxy')}${newUrl.search}`);
}
