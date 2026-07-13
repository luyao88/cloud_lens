export async function onRequestGet({ request }) {
  const { url } = request;
  const newUrl = new URL(url);
  return fetch(`https://i${Math.floor(Math.random() * 4)}.wp.com/${newUrl.hostname}${newUrl.pathname.replace('v2', 'imgur-proxy')}${newUrl.search}`);
}
