export const config = { runtime: 'edge' };

const ARCHIVE_URL = 'https://archive.org/download/gta-vicecity-wasm-assets/game.tar.gz';

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

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // Step 1: resolve the archive.org redirect to get the actual CDN URL.
    // archive.org 302-redirects to a CDN like dn710903.ca.archive.org.
    // Fetching that CDN URL directly avoids archive.org's bot-detection.
    const headResp = await fetch(ARCHIVE_URL, {
      method: 'HEAD',
      headers: FETCH_HEADERS,
      redirect: 'follow',
    });

    const cdnUrl = headResp.url && headResp.url !== ARCHIVE_URL ? headResp.url : null;

    if (!cdnUrl) {
      return new Response('Could not resolve CDN URL from archive.org', {
        status: 502,
        headers: CORS_HEADERS,
      });
    }

    // Step 2: fetch the actual binary from the CDN URL directly.
    const upstream = await fetch(cdnUrl, {
      method: request.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: FETCH_HEADERS,
    });

    if (!upstream.ok) {
      return new Response(`CDN error: ${upstream.status} ${upstream.statusText}`, {
        status: 502,
        headers: CORS_HEADERS,
      });
    }

    // Guard: if upstream returned HTML (bot block / error page), fail clearly.
    const upstreamType = upstream.headers.get('content-type') || '';
    if (upstreamType.includes('text/html')) {
      return new Response(`Upstream returned HTML instead of binary (bot block?): ${cdnUrl}`, {
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
