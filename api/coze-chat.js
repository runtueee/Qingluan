import fetch from 'node-fetch';

// 将这里的地址替换为你阿里云 ECS 后端的实际公网 IP 或域名和端口
const BACKEND_URL = 'http://121.199.34.78:3001';

export default async function handler(request, response) {
  // 接收前端请求的方法和 body
  const method = request.method;
  const body = method === 'POST' || method === 'PUT' || method === 'PATCH' ? request.body : null;

  try {
    // 构造转发到后端的完整 URL
    const backendApiUrl = `${BACKEND_URL}${request.url}`;

    // 转发请求到你的后端 API
    const backendResponse = await fetch(backendApiUrl, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        // 如果前端请求有其他需要转发的 header，可以在这里加上
        // 例如: ...request.headers // 可能需要过滤一些不必要的 header
      },
      body: body ? JSON.stringify(body) : null, // 确保只在有 body 的请求中发送 body
    });

    // 读取后端响应的状态码和数据
    const backendData = await backendResponse.json();

    // 将后端响应的状态码和数据返回给前端
    response.status(backendResponse.status).json(backendData);

  } catch (error) {
    console.error('Proxy error:', error);
    // 返回一个通用的错误响应给前端
    response.status(500).json({ error: 'Error forwarding request to backend' });
  }
} 