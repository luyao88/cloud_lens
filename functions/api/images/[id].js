/**
 * /api/images/:id
 *
 * 管理当前登录用户的单条上传记录。
 *
 * DELETE /api/images/:id
 *   删除记录：校验归属后，尽力删除 Imgur 源文件（delete_hash），
 *   无论 Imgur 是否成功，均删除本地数据库记录。
 *   响应：200 { success: true }
 *         400 { success: false, error: '无效的图片ID' }
 *         401 { success: false, error: '请先登录' }
 *         404 { success: false, error: '图片不存在' }
 *
 * PATCH /api/images/:id，JSON body
 *   { tags: string }  // 标签（逗号分隔，可清空）
 *   响应：200 { success: true, image: {...} }
 */
import { getUserFromRequest } from '../auth/_utils.js';

// 从路由参数解析图片ID，非法时返回 null
const parseId = (params) => {
  const id = Number(params?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function onRequestDelete({ request, env, params }) {
  // 鉴权：必须登录
  const { user } = await getUserFromRequest(request, env);
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 });
  }

  const id = parseId(params);
  if (!id) {
    return Response.json({ success: false, error: '无效的图片ID' }, { status: 400 });
  }

  // 校验记录归属
  const image = await env.cloud_lens_data
    .prepare('SELECT id, delete_hash FROM images WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .first();
  if (!image) {
    return Response.json({ success: false, error: '图片不存在' }, { status: 404 });
  }

  const clientId = env.IMGUR_CLIENT_ID || 'd70305e7c3ac5c6';

  // 尽力删除 Imgur 源文件（失败不阻塞，本地记录照常删除）
  if (image.delete_hash) {
    try {
      await fetch(`https://api.imgur.com/3/image/${image.delete_hash}`, {
        method: 'DELETE',
        headers: { Authorization: `Client-ID ${clientId}` },
      });
    } catch {}
  }

  await env.cloud_lens_data
    .prepare('DELETE FROM images WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .run();

  return Response.json({ success: true });
}

export async function onRequestPatch({ request, env, params }) {
  // 鉴权：必须登录
  const { user } = await getUserFromRequest(request, env);
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 });
  }

  const id = parseId(params);
  if (!id) {
    return Response.json({ success: false, error: '无效的图片ID' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const tags = String(body?.tags ?? '').trim().slice(0, 200);
  if (tags.length >= 200) {
    return Response.json({ success: false, error: '标签过长' }, { status: 400 });
  }

  const result = await env.cloud_lens_data
    .prepare('UPDATE images SET tags = ? WHERE id = ? AND user_id = ?')
    .bind(tags || null, id, user.id)
    .run();
  if (!result.meta.changes) {
    return Response.json({ success: false, error: '图片不存在' }, { status: 404 });
  }

  const image = await env.cloud_lens_data
    .prepare('SELECT id, imgur_id, imgur_url, filename, size, tags, created_at FROM images WHERE id = ?')
    .bind(id)
    .first();

  return Response.json({ success: true, image });
}
