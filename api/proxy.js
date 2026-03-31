export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing "url" query parameter' });
  }

  // Whitelist: only allow MangaDex API calls
  const allowed = ['api.mangadex.org', 'uploads.mangadex.org'];
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  if (!allowed.some(host => parsed.hostname === host)) {
    return res.status(403).json({ error: 'Domain not allowed. Only MangaDex API is permitted.' });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'ZynqToonProxy/1.0',
        'Accept': 'application/json',
      },
    });

    const contentType = upstream.headers.get('content-type') || 'application/json';
    const body = await upstream.text();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(upstream.status).send(body);
  } catch (err) {
    console.error('Proxy fetch error:', err);
    return res.status(502).json({ error: 'Upstream fetch failed', message: err.message });
  }
}
