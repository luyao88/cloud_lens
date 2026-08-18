/**
 * /upload 路由处理
 *
 * 接收前端上传的图片/视频文件，转发到 Imgur API 进行存储。
 * 使用 Client-ID 匿名上传，无需用户登录 Imgur。
 *
 * 请求：POST /upload，FormData { file: 图片/视频文件 }
 * 响应：
 *   200 Imgur API 返回的 JSON，包含 data.link（图片/视频地址）、data.id 等
 *   400 { success: false, error: '缺少 file 字段' }
 *   4xx/5xx { success: false, error: '...' }（Imgur 拒绝或网络不可达）
 *
 * 支持的格式：
 *   图片：JPEG, PNG, GIF, APNG, TIFF, BMP, WebP（上限 20MB）
 *   视频：MP4, WebM（上限 200MB；注：Cloudflare 免费版请求体上限 100MB）
 */

// 匿名接口无凭证，放开 CORS 允许本地开发（localhost）等跨域调用
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (data, status = 200) => Response.json(data, { status, headers: CORS_HEADERS });

// CORS 预检
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost({ request }) {
  // 仅处理 POST：GET /upload 由前端路由接管（Cloudflare Pages 自动 fallback 到 index.html）
  // 解析表单，取出文件
  let imgFile;
  try {
    const formData = await request.formData();
    imgFile = formData.get('file');
  } catch {
    return json({ success: false, error: '无效的表单数据' }, 400);
  }
  if (!imgFile) {
    return json({ success: false, error: '缺少 file 字段' }, 400);
  }

  // 转发到 Imgur（Client-ID 匿名上传）
  const body = new FormData();
  body.append('image', imgFile);
  try {
    const res = await fetch('https://api.imgur.com/3/upload', {
      method: 'POST',
      headers: { Authorization: 'Client-ID d70305e7c3ac5c6' },
      body,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.data?.link) {
      return json(
        { success: false, error: data?.data?.error || `Imgur 上传失败（HTTP ${res.status}）` },
        res.status >= 400 ? res.status : 502,
      );
    }
    return json(data);
  } catch {
    // workerd 网络层失败（如本地网络无法直连 Imgur）会抛出内部错误，这里转为明确的提示
    return json({ success: false, error: '无法连接 Imgur 服务，请检查网络或代理设置' }, 502);
  }
}
