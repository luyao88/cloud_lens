export async function onRequestGet({ request }) {
  const { url } = request;
  const newUrl = new URL(url);
  const fileId = newUrl.pathname.replace('/v2/', '');
  // 视频格式直接走 Imgur 代理（WordPress CDN 不支持视频）
  const isVideo = /\.(mp4|webm|avi|mov|mkv|flv|wmv|mpeg|mpg)$/i.test(fileId);
  if (isVideo) {
    return fetch(`https://i.imgur.com/${fileId}`, {
      headers: {
        referer: 'https://www.vhimg.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
    });
  }
  // 图片走 WordPress CDN 缓存加速
  return fetch(`https://i${Math.floor(Math.random() * 4)}.wp.com/${newUrl.hostname}${newUrl.pathname.replace('v2', 'imgur-proxy')}${newUrl.search}`);
}
