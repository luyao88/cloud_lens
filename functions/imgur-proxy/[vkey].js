/**
 * /imgur-proxy/:fileId 路由处理
 *
 * 作为 WordPress CDN 的回源目标，代理请求到 Imgur 并绕过防盗链。
 * 仅处理图片（视频在 /v2/ 路由中已直接代理到 Imgur）。
 *
 * 访问链路：
 *   WordPress CDN -> /imgur-proxy/xxx.png -> i.imgur.com/xxx.png
 */
export async function onRequestGet({ request }) {
  const { url } = request;
  const newUrl = new URL(url);
  return fetch(`https://i.imgur.com/${newUrl.pathname.replace('imgur-proxy', '')}`, {
    headers: {
      referer: 'https://www.vhimg.com', // 绕过 Imgur 防盗链
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    },
  });
}
