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

export { formatURL }
