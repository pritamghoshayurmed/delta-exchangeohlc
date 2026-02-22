/**
 * Vercel serverless proxy → https://cdn.india.deltaex.org
 * Replaces the Vite dev-server proxy for production deployments.
 */
export default async function handler(req, res) {
  const { path, ...queryParams } = req.query;
  const pathStr = Array.isArray(path) ? path.join('/') : (path ?? '');

  const url = new URL(`https://cdn.india.deltaex.org/${pathStr}`);
  Object.entries(queryParams).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });

  try {
    const upstream = await fetch(url.toString(), {
      method: req.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });

    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('Content-Type') ?? 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(body);
  } catch (err) {
    res.status(502).json({ error: 'Proxy error', message: err.message });
  }
}
