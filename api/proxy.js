export const config = { runtime: 'edge' };

const TARGET_URL = 'https://archive.org/download/gta-vicecity-wasm-assets/game.tar.gz';

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  try {
    const upstream = await fetch(TARGET_URL, {
      method: request.method,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow',
    });

    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    headers.set('Content-Type', 'application/octet-stream');

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) headers.set('Content-Length', contentLength);

    if (request.method === 'HEAD') {
      return new Response(null, { status: 200, headers });
    }

    return new Response(upstream.body, { status: 200, headers });
  } catch (err) {
    return new Response(`Proxy error: ${err.message}`, { status: 502 });
  }
}
