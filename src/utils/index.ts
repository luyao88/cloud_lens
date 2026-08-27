// URL格式化
const formatURL = (props: any, v: any, key?: string) => {
  let FILE_ID = '';
  const ERROR_MSG = `${v._vh_filename} 上传失败`;
  try {
    FILE_ID = v.data.link.split('/').slice(-1)[0];
  } catch { }
  const url = `${props.nodeHost}/v2/${FILE_ID}`;
  if (key == 'md') {
    return FILE_ID ? `![${v._vh_filename}](${url})` : ERROR_MSG;
  }
  if (key == 'html') {
    return FILE_ID ? `<img src="${url}" alt="${v._vh_filename}">` : ERROR_MSG;
  }
  return FILE_ID ? url : ERROR_MSG;
};

/**
 * 头像展示地址
 * - 本站地址（含 /v2/ 代理路径）、data: URL、相对路径：原样返回
 * - 仅 Imgur 图床的文件转本站 /v2/ 代理（Imgur 国内直连不可达）
 * - 其他图源（GitHub/Gitee/Google 等第三方头像）直接使用原始链接
 */
export function resolveAvatarSrc(rawUrl?: string | null, nodeHost = ''): string {
  const raw = (rawUrl || '').trim();
  if (!raw) return '';

  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return raw; // 相对路径或非法输入原样返回
  }

  if (raw.startsWith('data:')) return raw;

  const base = nodeHost || (typeof location !== 'undefined' ? location.origin : '');
  const selfOrigin = base ? new URL(base).origin : '';
  if (!selfOrigin || u.origin !== selfOrigin) {
    // 只有 Imgur 的文件才需要走本站代理；外站头像一律直链
    if (!/(^|\.)imgur\.com$/i.test(u.hostname)) return raw;
    const fileId = u.pathname.split('/').pop() || '';
    if (!fileId) return raw;
    return `${base}/v2/${fileId}`;
  }
  return raw;
}

export { formatURL }
