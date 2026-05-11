export const config = { runtime: 'edge' };

const ARCHIVE_URL = 'https://archive.org/download/gta-vicecity-wasm-assets/game.tar.gz';

// Fallback CDN URL — the CDN nginx has no bot-detection, unlike archive.org's main server.
// Resolved from: curl -sI https://archive.org/download/gta-vicecity-wasm-assets/game.tar.gz
const FALLBACK_CDN_URL = 'https://dn710903.ca.archive.org/0/items/gta-vicecity-wasm-assets/game.tar.gz';

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/octet-stream, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Cross-Origin-Resource-Policy': 'cross-origin',
};

async function resolveCdnUrl() {
  try {
    // Try redirect: 'manual' to capture the 302 Location header
    const resp = await fetch(ARCHIVE_URL, {
      method: 'HEAD',
      headers: FETCH_HEADERS,
      redirect: 'manual',
    });
    const location = resp.headers.get('location');
    if (location && location.startsWith('https://')) return location;
  } catch (_) {}

  // Fallback: use the known CDN URL directly
  return FALLBACK_CDN_URL;
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const cdnUrl = await resolveCdnUrl();

    const upstream = await fetch(cdnUrl, {
      method: request.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: FETCH_HEADERS,
    });

    if (!upstream.ok) {
      return new Response(`CDN error ${upstream.status}: ${cdnUrl}`, {
        status: 502,
        headers: CORS_HEADERS,
      });
    }

    // Guard: if upstream returned HTML (bot block / error page), fail clearly.
    const upstreamType = upstream.headers.get('content-type') || '';
    if (upstreamType.includes('text/html')) {
      return new Response(`CDN returned HTML instead of binary: ${cdnUrl}`, {
        status: 502,
        headers: CORS_HEADERS,
      });
    }

    const respHeaders = new Headers(CORS_HEADERS);
    respHeaders.set('Content-Type', 'application/octet-stream');

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) respHeaders.set('Content-Length', contentLength);

    if (request.method === 'HEAD') {
      return new Response(null, { status: 200, headers: respHeaders });
    }

    return new Response(upstream.body, { status: 200, headers: respHeaders });
  } catch (err) {
    return new Response(`Proxy error: ${err.message}`, {
      status: 502,
      headers: CORS_HEADERS,
    });
  }
}
