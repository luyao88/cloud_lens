/**
 * /upload 路由处理
 *
 * 接收前端上传的图片/视频文件或图片网址，转发到 Imgur API 进行存储。
 * 使用 Client-ID 匿名上传，无需用户登录 Imgur。
 *
 * 请求：POST /upload，FormData:
 *   - 文件上传: { file: 图片/视频文件 }
 *   - 网址上传: { url: 图片网址（http(s)://...） }
 *
 * 响应：
 *   200 Imgur API 返回的 JSON，包含 data.link（图片/视频地址）、data.id 等
 *   400 { success: false, error: '缺少 file 字段' }
 *   413 { success: false, error: '文件过大...' }
 *   415 { success: false, error: '不支持的文件类型...' }
 *   4xx/5xx { success: false, error: '...' }（Imgur 拒绝或网络不可达）
 *
 * 支持的格式：
 *   图片：JPEG, PNG, GIF, APNG, TIFF, BMP, WebP（上限 20MB）
 *   视频：MP4, WebM 等（上限 100MB；Cloudflare 免费版请求体上限 100MB）
 */

const IMAGE_MAX_BYTES = 20 * 1024 * 1024;
const VIDEO_MAX_BYTES = 100 * 1024 * 1024;

const IMAGE_MIME_RE = /^image\/(jpeg|jpg|png|gif|apng|tiff|bmp|webp|avif)$/;
const VIDEO_MIME_RE = /^video\/(mp4|webm|x-msvideo|quicktime|x-matroska|x-flv|mpeg)$/i;
const IMAGE_EXT_RE = /\.(jpe?g|png|gif|apng|tiff?|bmp|webp|avif)$/i;
const VIDEO_EXT_RE = /\.(mp4|webm|avi|mov|mkv|flv|wmv|mpeg|mpg)$/i;

/**
 * CORS 收紧为来源白名单：本站自身 + 本地开发端口 +
 * 环境变量 UPLOAD_ALLOWED_ORIGINS（逗号分隔）。不再向任意来源开放上传中继。
 */
function isAllowedOrigin(request, env, origin) {
  try {
    const selfHost = new URL(request.url).host;
    const originHost = new URL(origin).host;
    if (originHost === selfHost) return true;
    const hostname = new URL(origin).hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    const extra = String(env?.UPLOAD_ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return extra.includes(origin);
  } catch {
    return false;
  }
}

function corsHeaders(request, env) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  const origin = request.headers.get('Origin');
  if (origin && isAllowedOrigin(request, env, origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  return headers;
}

const json = (data, status = 200, request, env) => Response.json(data, { status, headers: corsHeaders(request, env) });

// CORS 预检
export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

export async function onRequestPost({ request, env }) {
  // 仅处理 POST：GET /upload 由前端路由接管（Cloudflare Pages 自动 fallback 到 index.html）
  // 解析表单，取出 file / url 字段
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return json({ success: false, error: '无效的表单数据' }, 400, request, env);
  }

  const urlField = formData.get('url');
  if (urlField && typeof urlField === 'string' && urlField.trim()) {
    return uploadByUrl(urlField.trim(), request, env);
  }

  const imgFile = formData.get('file');
  if (!imgFile) {
    return json({ success: false, error: '缺少 file 或 url 字段' }, 400, request, env);
  }

  // 类型校验：MIME 优先，空 MIME 时按扩展名兜底
  const mime = (imgFile.type || '').toLowerCase();
  const name = imgFile.name || '';
  const isImage = IMAGE_MIME_RE.test(mime) || (!mime && IMAGE_EXT_RE.test(name));
  const isVideo = !isImage && (VIDEO_MIME_RE.test(mime) || (!mime && VIDEO_EXT_RE.test(name)));
  if (!isImage && !isVideo) {
    return json({ success: false, error: '不支持的文件类型，仅支持常见图片与 MP4/WebM 视频' }, 415, request, env);
  }

  // 大小校验：超限直接拒绝，避免浪费带宽转发后才被 Imgur 拒绝
  const maxBytes = isVideo ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
  const maxMB = Math.round(maxBytes / 1024 / 1024);
  if ((imgFile.size || 0) > maxBytes) {
    return json({ success: false, error: `文件过大，${isVideo ? '视频' : '图片'}最大 ${maxMB}MB` }, 413, request, env);
  }

  const clientId = env.IMGUR_CLIENT_ID || 'd70305e7c3ac5c6';

  // 转发到 Imgur（Client-ID 匿名上传）
  const body = new FormData();
  body.append('image', imgFile);
  try {
    const res = await fetch('https://api.imgur.com/3/upload', {
      method: 'POST',
      headers: { Authorization: `Client-ID ${clientId}` },
      body,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.data?.link) {
      return json({ success: false, error: data?.data?.error || `Imgur 上传失败（HTTP ${res.status}）` }, res.status >= 400 ? res.status : 502, request, env);
    }
    return json(data, 200, request, env);
  } catch {
    // workerd 网络层失败（如本地网络无法直连 Imgur）会抛出内部错误，这里转为明确的提示
    return json({ success: false, error: '无法连接 Imgur 服务，请检查网络或代理设置' }, 502, request, env);
  }
}

/**
 * 网址上传分支：通过 Imgur /3/image 接口以 type=URL 方式抓取远端图片。
 * 仅支持图片（Imgur 网址上传不支持视频）。先做基础校验：
 *   - http/https 协议
 *   - 解析得通 hostname
 *   - 扩展名命中图片白名单（避免把 HTML 页面当图片转发，浪费 Imgur 配额）
 * 之后不做服务端预取，让 Imgur 自行抓取并返回结果。
 */
async function uploadByUrl(urlStr, request, env) {
  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch {
    return json({ success: false, error: '网址格式无效' }, 400, request, env);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return json({ success: false, error: '仅支持 http/https 网址' }, 400, request, env);
  }
  if (!parsed.hostname) {
    return json({ success: false, error: '网址缺少域名' }, 400, request, env);
  }
  // 扩展名校验：忽略 query/hash，按 pathname 判定
  if (!IMAGE_EXT_RE.test(parsed.pathname)) {
    return json({ success: false, error: '网址扩展名非图片，仅支持 jpg/png/gif/webp 等' }, 415, request, env);
  }

  const clientId = env.IMGUR_CLIENT_ID || 'd70305e7c3ac5c6';
  const body = new FormData();
  body.append('image', urlStr);
  body.append('type', 'URL');
  try {
    const res = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: { Authorization: `Client-ID ${clientId}` },
      body,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.data?.link) {
      return json({ success: false, error: data?.data?.error || `Imgur 网址上传失败（HTTP ${res.status}）` }, res.status >= 400 ? res.status : 502, request, env);
    }
    return json(data, 200, request, env);
  } catch {
    return json({ success: false, error: '无法连接 Imgur 服务，请检查网络或代理设置' }, 502, request, env);
  }
}
