/**
 * /api/images/batch-tags
 *
 * 批量更新当前登录用户的图片标签。
 *
 * POST /api/images/batch-tags，JSON body
 *   { ids: number[], tags: string }
 *     ids:   待更新的图片 ID 数组（最多 500 条）
 *     tags:  标签字符串，逗号分隔；空字符串表示清空标签
 *   响应：200 { success: true, updated: number }
 *         400 { success: false, error: '...' }
 *         401 { success: false, error: '请先登录' }
 */
import { getUserFromRequest } from '../auth/_utils.js';

const MAX_BATCH = 500;

export async function onRequestPost({ request, env }) {
  const { user } = await getUserFromRequest(request, env);
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? body.ids.filter((n) => Number.isInteger(n) && n > 0) : [];
  const tags = String(body?.tags ?? '').trim().slice(0, 200);

  if (!ids.length) {
    return Response.json({ success: false, error: '请选择至少一张图片' }, { status: 400 });
  }
  if (ids.length > MAX_BATCH) {
    return Response.json({ success: false, error: `单次最多编辑 ${MAX_BATCH} 张` }, { status: 400 });
  }
  if (tags.length >= 200) {
    return Response.json({ success: false, error: '标签过长' }, { status: 400 });
  }

  const placeholders = ids.map(() => '?').join(',');
  const result = await env.cloud_lens_data
    .prepare(
      `UPDATE images SET tags = ? WHERE user_id = ? AND id IN (${placeholders})`,
    )
    .bind(tags || null, user.id, ...ids)
    .run();

  return Response.json({ success: true, updated: result.meta.changes });
}
