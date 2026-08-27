/**
 * /api/images
 *
 * GET  分页查询当前登录用户的上传记录（个人主页用）
 * POST 保存上传成功的图片信息到数据库。
 *      上传仍走 /upload（匿名），上传成功后前端调用本接口持久化记录。
 *
 * GET 请求：GET /api/images?limit=100&offset=0&album_id=...
 *   album_id 缺省  → 查询全部图片（stats 同口径）
 *   album_id=数字  → 仅查询该相册内的图片
 *   album_id=0     → 仅查询未分组图片（album_id IS NULL）
 * 响应：
 *   200 { success: true, images: [...], stats: { total, totalSize } }
 *   401 { success: false, error: '请先登录' }
 *
 * POST 请求：POST /api/images，JSON body
 *   {
 *     imgur_id:    string,   // Imgur 图片ID
 *     imgur_url:   string,   // Imgur 图片地址（必填）
 *     delete_hash: string,   // Imgur 删除哈希
 *     filename:    string,   // 原始文件名
 *     size:        number,   // 文件大小（字节）
 *     tags:        string,   // 标签（逗号分隔，可空）
 *     album_id:    number    // 目标相册（缺省时归入用户默认相册；null 为未分组）
 *   }
 *
 * 响应：
 *   200 { success: true, image: {...} }
 *   400 { success: false, error: '...' }   // 参数缺失
 *   401 { success: false, error: '请先登录' } // 未登录
 */
import { getUserFromRequest } from '../auth/_utils.js';

export async function onRequestGet({ request, env }) {
  // 鉴权：必须登录
  const { user } = await getUserFromRequest(request, env);
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 });
  }

  // 分页参数（limit 默认 100，上限 500）
  const { searchParams } = new URL(request.url);
  let limit = parseInt(searchParams.get('limit') || '100', 10);
  let offset = parseInt(searchParams.get('offset') || '0', 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = 100;
  if (limit > 500) limit = 500;
  if (!Number.isFinite(offset) || offset < 0) offset = 0;

  // 相册过滤：缺省=全部；数字=指定相册；0=未分组
  const albumParam = searchParams.get('album_id');
  let albumFilter = '';
  const binds = [user.id];
  if (albumParam !== null) {
    const albumId = parseInt(albumParam, 10);
    if (Number.isInteger(albumId) && albumId >= 0) {
      albumFilter = albumId === 0 ? ' AND album_id IS NULL' : ' AND album_id = ?';
      if (albumId > 0) binds.push(albumId);
    }
  }

  const { results: images } = await env.cloud_lens_data
    .prepare(
      `SELECT id, imgur_id, imgur_url, filename, size, tags, album_id, created_at
       FROM images WHERE user_id = ?${albumFilter} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    )
    .bind(...binds, limit, offset)
    .all();

  const stats = await env.cloud_lens_data
    .prepare(
      `SELECT COUNT(*) AS total, COALESCE(SUM(size), 0) AS totalSize FROM images WHERE user_id = ?${albumFilter}`,
    )
    .bind(...binds)
    .first();

  return Response.json({ success: true, images, stats });
}

export async function onRequestPost({ request, env }) {
  // 鉴权：必须登录
  const { user } = await getUserFromRequest(request, env);
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 });
  }

  const body = await request.json();
  const { imgur_id, imgur_url, delete_hash, filename, size, tags } = body || {};

  // 校验必填字段
  if (!imgur_url) {
    return Response.json(
      { success: false, error: 'imgur_url 不能为空' },
      { status: 400 },
    );
  }

  // 目标相册：显式指定时校验归属；缺省时归入默认相册；null 为未分组
  let albumId = null;
  if (body?.album_id !== undefined && body?.album_id !== null) {
    albumId = Number(body.album_id);
    if (!Number.isInteger(albumId) || albumId <= 0) {
      return Response.json({ success: false, error: '无效的相册ID' }, { status: 400 });
    }
    const album = await env.cloud_lens_data
      .prepare('SELECT id FROM albums WHERE id = ? AND user_id = ?')
      .bind(albumId, user.id)
      .first();
    if (!album) {
      return Response.json({ success: false, error: '相册不存在' }, { status: 404 });
    }
  } else if (user.default_album_id) {
    // 未显式指定 → 默认上传相册（相册已被删除时降级为未分组）
    const def = await env.cloud_lens_data
      .prepare('SELECT id FROM albums WHERE id = ? AND user_id = ?')
      .bind(user.default_album_id, user.id)
      .first();
    albumId = def ? def.id : null;
  }

  // 写入数据库（user_id 来自 session，created_at 自动填充）
  const result = await env.cloud_lens_data
    .prepare(
      `INSERT INTO images (user_id, imgur_id, imgur_url, delete_hash, filename, size, tags, album_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      user.id,
      imgur_id || null,
      imgur_url,
      delete_hash || null,
      filename || null,
      typeof size === 'number' ? size : null,
      tags || null,
      albumId,
    )
    .run();

  // 查回完整记录返回
  const image = await env.cloud_lens_data
    .prepare('SELECT * FROM images WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first();

  return Response.json({ success: true, image });
}
