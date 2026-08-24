/**
 * /api/albums
 *
 * 相册管理（支持嵌套：parent_id 自引用，最多 2 级）。
 *
 * GET /api/albums
 *   列出当前登录用户的所有相册（平铺返回，前端组装树形）。
 *   响应：200 { success: true, albums: [{ id, name, parent_id, image_count, created_at }], default_album_id }
 *         401 { success: false, error: '请先登录' }
 *
 * POST /api/albums，JSON body
 *   { name: string, parent_id?: number }
 *   响应：200 { success: true, album: {...} }
 *         400 { success: false, error: '...' }   // 名称为空 / 嵌套过深 / 同名
 *         401 { success: false, error: '请先登录' }
 */
import { getUserFromRequest } from '../auth/_utils.js';

// 相册最大嵌套深度：顶级为第 1 级，最多到第 2 级
const MAX_DEPTH = 2;

export async function onRequestGet({ request, env }) {
  const { user } = await getUserFromRequest(request, env);
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 });
  }

  try {
    // 相册平铺列表 + 每个相册的图片数量与封面
    // 封面优先取自定义 cover_image_id 对应图片，图片不存在（被删除）时回退为相册内最新一张
    const { results: albums } = await env.cloud_lens_data
      .prepare(
        `SELECT a.id, a.name, a.parent_id, a.created_at, a.cover_image_id,
                (SELECT COUNT(*) FROM images i WHERE i.album_id = a.id) AS image_count,
                COALESCE(
                  (SELECT ci.imgur_url FROM images ci WHERE ci.id = a.cover_image_id),
                  (SELECT i2.imgur_url FROM images i2 WHERE i2.album_id = a.id ORDER BY i2.id DESC LIMIT 1)
                ) AS cover_url
         FROM albums a WHERE a.user_id = ? ORDER BY a.created_at ASC, a.id ASC`,
      )
      .bind(user.id)
      .all();

    // 未分组图片数量
    const ungrouped = await env.cloud_lens_data
      .prepare('SELECT COUNT(*) AS cnt FROM images WHERE user_id = ? AND album_id IS NULL')
      .bind(user.id)
      .first();

    return Response.json({
      success: true,
      albums: albums || [],
      ungrouped_count: ungrouped?.cnt || 0,
      default_album_id: user.default_album_id ?? null,
    });
  } catch (err) {
    console.error('GET /api/albums failed:', err);
    return Response.json({ success: false, error: '获取相册列表失败' }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }) {
  const { user } = await getUserFromRequest(request, env);
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body?.name ?? '').trim().slice(0, 50);
  if (!name) {
    return Response.json({ success: false, error: '相册名称不能为空' }, { status: 400 });
  }

  let parentId = null;
  if (body?.parent_id !== undefined && body?.parent_id !== null) {
    parentId = Number(body.parent_id);
    if (!Number.isInteger(parentId) || parentId <= 0) {
      return Response.json({ success: false, error: '无效的父相册ID' }, { status: 400 });
    }
    const parent = await env.cloud_lens_data
      .prepare('SELECT id, parent_id FROM albums WHERE id = ? AND user_id = ?')
      .bind(parentId, user.id)
      .first();
    if (!parent) {
      return Response.json({ success: false, error: '父相册不存在' }, { status: 404 });
    }
    // 嵌套深度限制：父相册不能自身已是子相册
    if (parent.parent_id) {
      return Response.json({ success: false, error: '相册最多支持 2 级嵌套' }, { status: 400 });
    }
  }

  // 同一父级下名称唯一
  const dup = await env.cloud_lens_data
    .prepare('SELECT id FROM albums WHERE user_id = ? AND parent_id IS ? AND name = ?')
    .bind(user.id, parentId, name)
    .first();
  if (dup) {
    return Response.json({ success: false, error: '同级下已存在同名相册' }, { status: 400 });
  }

  const result = await env.cloud_lens_data
    .prepare('INSERT INTO albums (user_id, name, parent_id) VALUES (?, ?, ?)')
    .bind(user.id, name, parentId)
    .run();

  const album = await env.cloud_lens_data
    .prepare('SELECT id, name, parent_id, created_at FROM albums WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first();

  return Response.json({ success: true, album });
}
