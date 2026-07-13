export async function onRequest({ request }) {
  const { method } = request;
  const formData = await request.formData();
  const imgFile = formData.get('file');
  // 创建 FormData 对象
  const body = new FormData();
  body.append('image', imgFile);
  return fetch(`https://api.imgur.com/3/upload?client_id=d70305e7c3ac5c6`, {
    method,
    headers: {
      ...request.headers,
    },
    body,
  });
}
