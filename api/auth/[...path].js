// This Vercel Serverless Function acts as a proxy for authentication requests to the ECS backend.

import fetch from 'node-fetch';
const { URL } = require('url');

// Replace with your actual ECS backend URL
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://121.199.34.78:3001';

export default async function handler(req, res) {
  const { pathname, searchParams } = new URL(req.url, `http://${req.headers.host}`);

  const backendPath = pathname.replace(/^\/api/, '');
  const targetUrl = `${BACKEND_BASE_URL}${backendPath}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

  // *** 新增的调试日志 ***
  console.log(`[AUTH_PROXY_DEBUG] Request received: ${req.method} ${req.url}`);
  console.log(`[AUTH_PROXY_DEBUG] Target backend URL: ${targetUrl}`);
  // *** 结束新增的调试日志 ***

  try {
    // Forward the request to the backend
    const backendResponse = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        // You might need to forward other headers like Authorization if applicable
        // ...req.headers, // Be cautious with forwarding all headers
      },
      // 确保正确处理 req.body，对于 POST 请求 req.body 通常需要stringify
      body: req.method === 'POST' || req.method === 'PUT' ? JSON.stringify(req.body) : undefined, // 明确JSON.stringify
    });

    // *** 新增的调试日志 ***
    console.log(`[AUTH_PROXY_DEBUG] Backend response status: ${backendResponse.status}`);
    const backendResponseBody = await backendResponse.text(); // 先读取为文本，方便调试
    console.log(`[AUTH_PROXY_DEBUG] Raw backend response body (first 500 chars): ${backendResponseBody.substring(0, 500)}`);
    console.log(`[AUTH_PROXY_DEBUG] Backend Content-Type header: ${backendResponse.headers.get('content-type')}`);
    // *** 结束新增的调试日志 ***

    // 如果后端返回的不是 JSON，Vercel 代理应该返回一个不同的错误信息给前端
    if (!backendResponse.headers.get('content-type')?.includes('application/json')) {
      console.error(`[AUTH_PROXY_ERROR] Backend did not return JSON for ${targetUrl}. Content-Type: ${backendResponse.headers.get('content-type')}`);
      return res.status(502).json({ // 使用 502 Bad Gateway 表示代理收到了无效响应
        message: '后端返回了无效的响应（非JSON）',
        backendStatus: backendResponse.status,
        rawBackendResponse: backendResponseBody.substring(0, 500),
        contentType: backendResponse.headers.get('content-type')
      });
    }

    // Set the status code and headers from the backend response
    res.status(backendResponse.status);
    backendResponse.headers.forEach((value, name) => {
      // Avoid setting forbidden headers like Content-Encoding that Vercel handles
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(name.toLowerCase())) {
         res.setHeader(name, value);
      }
    });

    // Send the backend response body back to the frontend (parsed as JSON)
    const parsedData = JSON.parse(backendResponseBody); // 尝试解析 JSON
    res.json(parsedData); // 使用 res.json() 发送 JSON 响应

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ message: 'Internal Server Error proxying request', error: error.message, details: error.stack });
  }
}
