/**
 * /api/images
 *
 * 保存上传成功的图片信息到数据库。
 * 上传仍走 /upload（匿名），上传成功后前端调用本接口持久化记录。
 *
 * 请求：POST /api/images，JSON body
 *   {
 *     imgur_id:    string,   // Imgur 图片ID
 *     imgur_url:   string,   // Imgur 图片地址（必填）
 *     delete_hash: string,   // Imgur 删除哈希
 *     filename:    string,   // 原始文件名
 *     size:        number,   // 文件大小（字节）
 *     tags:        string    // 标签（逗号分隔，可空）
 *   }
 *
 * 响应：
 *   200 { success: true, image: {...} }
 *   400 { success: false, error: '...' }   // 参数缺失
 *   401 { success: false, error: '请先登录' } // 未登录
 */
import { getUserFromRequest } from '../auth/_utils.js';

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

  // 写入数据库（user_id 来自 session，created_at 自动填充）
  const result = await env.cloud_lens_data
    .prepare(
      `INSERT INTO images (user_id, imgur_id, imgur_url, delete_hash, filename, size, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      user.id,
      imgur_id || null,
      imgur_url,
      delete_hash || null,
      filename || null,
      typeof size === 'number' ? size : null,
      tags || null,
    )
    .run();

  // 查回完整记录返回
  const image = await env.cloud_lens_data
    .prepare('SELECT * FROM images WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first();

  return Response.json({ success: true, image });
}
