/**
 * /api/albums/default
 *
 * PUT /api/albums/default，JSON body
 *   { album_id: number | null }   // null 表示清除默认（未分组）
 *
 * 设置当前登录用户的默认上传相册：
 * 未显式选择相册时，上传的图片自动归入默认相册。
 *
 * 响应：200 { success: true, default_album_id }
 *       400 { success: false, error: '...' }
 *       401 { success: false, error: '请先登录' }
 */
import { getUserFromRequest } from '../auth/_utils.js';

export async function onRequestPut({ request, env }) {
  const { user } = await getUserFromRequest(request, env);
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

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
  }

  await env.cloud_lens_data.prepare('UPDATE users SET default_album_id = ? WHERE id = ?').bind(albumId, user.id).run();

  return Response.json({ success: true, default_album_id: albumId });
}
