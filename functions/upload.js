/**
 * /upload 路由处理
 *
 * 接收前端上传的图片/视频文件，转发到 Imgur API 进行存储。
 * 使用 Client-ID 匿名上传，无需用户登录 Imgur。
 *
 * 请求：POST /upload，FormData { file: 图片/视频文件 }
 * 响应：Imgur API 返回的 JSON，包含 data.link（图片/视频地址）、data.id 等
 *
 * 支持的格式：
 *   图片：JPEG, PNG, GIF, APNG, TIFF, BMP, WebP（上限 20MB）
 *   视频：MP4, WebM, AVI, MOV, MKV, FLV, WMV, MPEG（上限 200MB）
 */
export async function onRequest({ request }) {
  const { method } = request;
  const formData = await request.formData();
  const imgFile = formData.get('file');
  // 创建 FormData 对象
  const body = new FormData();
  body.append('image', imgFile);
  return fetch(`https://api.imgur.com/3/upload?client_id=d70305e7c3ac5c6`, {
    method,
    headers: {
      Authorization: 'Client-ID d70305e7c3ac5c6',
    },
    body,
  });
}
