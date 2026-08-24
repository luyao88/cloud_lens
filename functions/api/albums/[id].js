/**
 * /api/albums/:id
 *
 * 管理当前登录用户的单个相册。
 *
 * PATCH /api/albums/:id，JSON body
 *   { name?: string, cover_image_id?: number | null }
 *   // name：相册名（仅在显式传入时修改）
 *   // cover_image_id：自定义封面图片ID（null 清除回退为自动封面；数字须属于该相册内图片）
 *   响应：200 { success: true, album: {...} }
 *         404 { success: false, error: '相册不存在' }
 *
 * DELETE /api/albums/:id
 *   删除相册：相册内图片移入「未分组」（album_id 置 NULL），
 *   子相册提升为顶级相册；若被删相册是默认上传相册则同步清除。
 *   响应：200 { success: true }
 */
import { getUserFromRequest } from '../auth/_utils.js';

const parseId = (params) => {
  const id = Number(params?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function onRequestPatch({ request, env, params }) {
  const { user } = await getUserFromRequest(request, env);
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 });
  }

  const id = parseId(params);
  if (!id) {
    return Response.json({ success: false, error: '无效的相册ID' }, { status: 400 });
  }

  const album = await env.cloud_lens_data
    .prepare('SELECT id, parent_id FROM albums WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .first();
  if (!album) {
    return Response.json({ success: false, error: '相册不存在' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));

  // 动态字段更新：name / cover_image_id 仅在显式传入时修改，避免误清空
  const sets = [];
  const binds = [];

  if (body?.name !== undefined) {
    const name = String(body.name ?? '').trim().slice(0, 50);
    if (!name) {
      return Response.json({ success: false, error: '相册名称不能为空' }, { status: 400 });
    }
    // 同一父级下名称唯一（排除自身）
    const dup = await env.cloud_lens_data
      .prepare('SELECT id FROM albums WHERE user_id = ? AND parent_id IS ? AND name = ? AND id != ?')
      .bind(user.id, album.parent_id, name, id)
      .first();
    if (dup) {
      return Response.json({ success: false, error: '同级下已存在同名相册' }, { status: 400 });
    }
    sets.push('name = ?');
    binds.push(name);
  }

  if (body?.cover_image_id !== undefined) {
    let coverImageId = null;
    if (body.cover_image_id !== null) {
      coverImageId = Number(body.cover_image_id);
      if (!Number.isInteger(coverImageId) || coverImageId <= 0) {
        return Response.json({ success: false, error: '无效的封面图片ID' }, { status: 400 });
      }
      // 封面图必须属于该用户且在该相册内
      const img = await env.cloud_lens_data
        .prepare('SELECT id FROM images WHERE id = ? AND user_id = ? AND album_id = ?')
        .bind(coverImageId, user.id, id)
        .first();
      if (!img) {
        return Response.json({ success: false, error: '封面图片不存在或不属于该相册' }, { status: 404 });
      }
    }
    sets.push('cover_image_id = ?');
    binds.push(coverImageId);
  }

  if (!sets.length) {
    return Response.json({ success: false, error: '没有需要更新的字段' }, { status: 400 });
  }

  sets.push("updated_at = datetime('now')");
  await env.cloud_lens_data
    .prepare(`UPDATE albums SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`)
    .bind(...binds, id, user.id)
    .run();

  // 返回最新相册记录
  const updated = await env.cloud_lens_data
    .prepare('SELECT id, name, parent_id, cover_image_id FROM albums WHERE id = ?')
    .bind(id)
    .first();

  return Response.json({ success: true, album: updated });
}

export async function onRequestDelete({ request, env, params }) {
  const { user } = await getUserFromRequest(request, env);
  if (!user) {
    return Response.json({ success: false, error: '请先登录' }, { status: 401 });
  }

  const id = parseId(params);
  if (!id) {
    return Response.json({ success: false, error: '无效的相册ID' }, { status: 400 });
  }

  const album = await env.cloud_lens_data
    .prepare('SELECT id FROM albums WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .first();
  if (!album) {
    return Response.json({ success: false, error: '相册不存在' }, { status: 404 });
  }

  try {
    // 1. 相册内图片移入未分组
    await env.cloud_lens_data.prepare('UPDATE images SET album_id = NULL WHERE album_id = ? AND user_id = ?').bind(id, user.id).run();
    // 2. 子相册提升为顶级
    await env.cloud_lens_data.prepare('UPDATE albums SET parent_id = NULL WHERE parent_id = ? AND user_id = ?').bind(id, user.id).run();
    // 3. 若是默认上传相册则清除
    const { user: fresh } = await getUserFromRequest(request, env);
    if (fresh?.default_album_id === id) {
      await env.cloud_lens_data.prepare('UPDATE users SET default_album_id = NULL WHERE id = ?').bind(user.id).run();
    }
    // 4. 删除相册本身
    await env.cloud_lens_data.prepare('DELETE FROM albums WHERE id = ? AND user_id = ?').bind(id, user.id).run();
  } catch {
    return Response.json({ success: false, error: '删除失败，请稍后重试' }, { status: 500 });
  }

  return Response.json({ success: true });
}
