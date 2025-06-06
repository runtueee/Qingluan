// This Vercel Serverless Function acts as a proxy for authentication requests to the ECS backend.

const { URL } = require('url');
const fetch = require('node-fetch'); // Ensure node-fetch is installed in your frontend project's dependencies

// Replace with your actual ECS backend URL
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://121.199.34.78:3001';

export default async function handler(req, res) {
  const { pathname, searchParams } = new URL(req.url, `http://${req.headers.host}`);

  // Construct the target URL for the backend
  // We are proxying paths under /api/auth to the backend's /auth path
  const backendPath = pathname.replace(/^\/api/, ''); // Remove /api prefix
  const targetUrl = `${BACKEND_BASE_URL}${backendPath}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

  console.log(`Proxying request from ${req.method} ${req.url} to ${targetUrl}`);

  try {
    // Forward the request to the backend
    const backendResponse = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        // You might need to forward other headers like Authorization if applicable
        // ...req.headers, // Be cautious with forwarding all headers
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
    });

    // Set the status code and headers from the backend response
    res.status(backendResponse.status);
    backendResponse.headers.forEach((value, name) => {
      // Avoid setting forbidden headers like Content-Encoding that Vercel handles
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(name.toLowerCase())) {
         res.setHeader(name, value);
      }
    });

    // Send the backend response body back to the frontend
    const backendResponseBody = await backendResponse.text(); // Use .text() or .json() based on expected response type
    res.send(backendResponseBody);

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ message: 'Internal Server Error proxying request', error: error.message });
  }
}
