// This Vercel Serverless Function acts as a proxy for authentication requests to the ECS backend.

import fetch from 'node-fetch';

export default async function (req, res) {
  // 从 Vercel 环境变量中获取后端 URL，如果未设置则使用默认值
  const ECS_BACKEND_URL = process.env.ECS_BACKEND_URL || 'http://121.199.34.78:3001';

  // 确保请求方法是 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Vercel 会自动解析请求路径，例如 /api/auth/login 或 /api/auth/register
  const targetPath = req.url; 

  try {
    // 将请求转发到你的 ECS 后端
    const response = await fetch(`${ECS_BACKEND_URL}${targetPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 可以根据需要转发其他请求头，例如 Authorization
        // ...req.headers, 
      },
      body: JSON.stringify(req.body), // Vercel 会自动解析 JSON 请求体到 req.body
    });

    const data = await response.json();

    // 将后端响应的状态码和数据返回给前端
    res.status(response.status).json(data);

  } catch (error) {
    console.error('Error proxying auth request to ECS backend:', error);
    res.status(500).json({ message: 'AI服务返回了无效的响应' }); // 使用与 Coze AI 相同的错误信息
  }
}
