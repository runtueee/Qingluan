import fetch from 'node-fetch';

export default async function handler(req, res) {
  const backendUrl = 'http://121.199.34.78:3001'; // Your backend base URL
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  
  // Extract the path after /api/auth
  const backendPath = pathname.replace('/api/auth', '');
  
  const targetUrl = `${backendUrl}${backendPath}`;

  try {
    const backendResponse = await fetch(targetUrl, {
      method: req.method,
      headers: {
        // Forward relevant headers, exclude host
        ...req.headers,
        host: undefined, // Do not forward the host header from the client
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined, // Forward body for non-GET/HEAD requests
    });

    // Forward status code and headers from the backend response
    res.status(backendResponse.status);
    for (const [key, value] of Object.entries(backendResponse.headers.raw())) {
      res.setHeader(key, value);
    }

    // Forward the backend response body
    backendResponse.body.pipe(res);

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
} 