// backend/server.js
require('dotenv').config(); // 这行代码会加载 .env 文件里的环境变量
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose'); // Import mongoose
const User = require('./models/User'); // Import User model

const app = express(); // 创建 Express 应用实例
const PORT = process.env.BACKEND_PORT || 3000; // 获取在 .env 文件里定义的端口号
const MONGODB_URI = process.env.MONGODB_URI; // Get MongoDB connection URI from .env

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// 中间件配置
app.use(cors()); // 启用 CORS，允许前端访问这个后端
app.use(express.json()); // 让服务器能解析前端发过来的 JSON 格式的请求体

// 定义一个 API 接口，用于和 Coze Bot 聊天
// 当前端向 '/api/coze-chat' 这个地址发送 POST 请求时，会执行这里的代码
app.post('/api/coze-chat', async (req, res) => {
    // 从前端发来的请求体中获取用户输入的消息
    // 我们约定前端会发送像这样格式的数据: { "message": "用户输入的内容" }
    const userMessage = req.body.message;

    // --- 新增的调试日志 ---
    console.log("--- DEBUGGING ENVIRONMENT VARIABLES ---");
    console.log("Raw process.env.COZE_BOT_ID:", process.env.COZE_BOT_ID);
    console.log("Type of process.env.COZE_BOT_ID:", typeof process.env.COZE_BOT_ID);
    console.log("Raw process.env.COZE_API_KEY:", process.env.COZE_API_KEY);
    console.log("Type of process.env.COZE_API_KEY:", typeof process.env.COZE_API_KEY);
    console.log("--- END DEBUGGING ---");
    // --- 结束新增的调试日志 ---

    // 如果用户消息为空，就返回错误
    if (!userMessage) {
        return res.status(400).json({ error: '消息内容不能为空' });
    }

    // 从环境变量中获取 Coze Bot ID 和 API Key
    const cozeBotId = process.env.COZE_BOT_ID;
    const cozeApiKey = process.env.COZE_API_KEY;

    // 检查环境变量是否配置正确
    if (!cozeBotId || !cozeApiKey) {
        console.error('Coze Bot ID 或 API Key 未在环境变量中配置。');
        return res.status(500).json({ error: '服务器配置错误' });
    }

    try {
        // 在服务器的控制台打印日志，方便调试
        console.log(`准备发送给 Coze：用户说 - "${userMessage}"`);

        // 使用 axios 向 Coze API 发送 POST 请求
        const cozeResponse = await axios.post(
            'https://api.coze.cn/v3/chat', // Coze API 的地址
            { // 请求体 (发给 Coze 的数据)
                bot_id: cozeBotId,
                user_id: "frontend-user-123", // 暂时固定一个用户ID，以后可以动态生成
                stream: true, // <--- 将这里改为 true
                auto_save_history: true, // 是否自动保存历史记录，根据需要调整
                additional_messages: [ // 用户当前发送的消息
                    {
                        role: "user",
                        content: userMessage,
                        content_type: "text"
                    }
                ]
            },
            { // 请求头
                headers: {
                    'Authorization': `Bearer ${cozeApiKey}`, // Coze 需要的认证令牌
                    'Content-Type': 'application/json' // 告诉 Coze 我们发送的是 JSON 数据
                }
            }
        );

        // Log the entire Coze response to understand its structure
        // console.log('Coze API 响应:', JSON.stringify(cozeResponse.data, null, 2)); // 原始数据不是JSON，直接打印
        console.log('Coze API 原始响应数据:', cozeResponse.data);

        let aiReply = "抱歉，未能从AI流式响应中提取到最终回复。"; // 更新默认回复

        if (typeof cozeResponse.data === 'string') {
            // 替换CRLF为LF，然后按双LF分割事件，以处理不同操作系统的换行符
            const events = cozeResponse.data.replace(/\r\n/g, '\n').split('\n\n');
            console.log(`[DEBUG] 分割出 ${events.length} 个事件块。第一个块预览: ${events[0] ? events[0].substring(0,150) : 'N/A'}`);

            let extractedAnswer = ""; // 用于暂存提取到的回答
            let toolResponseOutput = null; // 用于暂存从tool_response中提取的output

            for (const eventBlock of events) {
                const linesInBlock = eventBlock.split('\n');
                let eventType = null;
                let dataLine = null;

                for (const currentLine of linesInBlock) {
                    if (currentLine.trim().startsWith('event:')) {
                        eventType = currentLine.trim().substring('event:'.length).trim();
                    } else if (currentLine.trim().startsWith('data:')) {
                         // 移除 data: 前缀来获取纯JSON字符串，并trim()
                        dataLine = currentLine.substring('data:'.length).trim();
                    }
                }

                if (eventType && dataLine) {
                    try {
                        const messageData = JSON.parse(dataLine);

                        // 优先查找 conversation.message.completed 事件中的 tool_response 类型
                        if (eventType === 'conversation.message.completed' &&
                            messageData.role === 'assistant' &&
                            messageData.type === 'tool_response' &&
                            messageData.content)
                        {
                             try {
                                 // 尝试解析 tool_response 的 content 字段，它本身是JSON字符串
                                 const toolResponseContent = JSON.parse(messageData.content);
                                 if (toolResponseContent.output && typeof toolResponseContent.output === 'string') {
                                     toolResponseOutput = toolResponseContent.output;
                                     console.log(`[DEBUG] 提取到 tool_response output: ${toolResponseOutput.substring(0, 100)}...`);
                                     // 找到tool_response后通常就是最终回复，可以直接停止遍历（如果确定结构是这样的话）
                                     // break; // 暂时不break，确保检查所有事件
                                 }
                             } catch (parseContentError) {
                                 console.error('解析 tool_response content JSON 出错:', parseContentError, '\n原始 content:', messageData.content);
                             }
                        }

                        // 如果没有找到 tool_response，作为备用，查找 conversation.message.completed 事件中的 answer 类型
                        // 这个逻辑应该在找到tool_response的情况下被跳过或覆盖
                         if (!toolResponseOutput &&
                            eventType === 'conversation.message.completed' &&
                            messageData.role === 'assistant' &&
                            messageData.type === 'answer' &&
                            typeof messageData.content === 'string')
                         {
                            extractedAnswer = messageData.content; // 备用：使用completed事件中的answer
                             console.log(`[DEBUG] 提取到 completed answer (备用): ${extractedAnswer.substring(0, 100)}...`);
                        }

                         // 如果需要累积delta，可以在这里处理 eventType === 'conversation.message.delta'
                         // 但为了简单起见和基于当前日志，优先处理completed事件

                    } catch (parseError) {
                        console.error('解析 Coze event data JSON 出错:', parseError, '\n原始 dataLine:', dataLine);
                        // 这里的错误不会阻止继续处理其他事件
                    }
                }
            }

            // 优先使用 toolResponseOutput，如果没有则使用 extractedAnswer
            if (toolResponseOutput) {
                aiReply = toolResponseOutput;
                 console.log("[DEBUG] aiReply 已更新为 toolResponseOutput");
            } else if (extractedAnswer) {
                aiReply = extractedAnswer;
                 console.log("[DEBUG] aiReply 已更新为 extractedAnswer (备用)");
            }

        } else {
            console.error('Coze API 响应的 data 不是字符串，无法按事件流处理:', cozeResponse.data);
            // 如果 Coze API 在某些情况下（例如 stream:false）返回的是直接的JSON对象，这里可以添加备用解析逻辑
            // 但根据当前 stream:true 的设定和日志，应该是字符串流
            // 尝试之前的非流式解析逻辑作为后备（尽管当前配置下不太可能走到这里）
            if (cozeResponse.data && cozeResponse.data.messages && Array.isArray(cozeResponse.data.messages)) {
                const assistantMessages = cozeResponse.data.messages.filter(
                    msg => msg.role === 'assistant' && msg.content && typeof msg.content === 'string'
                );
                if (assistantMessages.length > 0) {
                    aiReply = assistantMessages[assistantMessages.length - 1].content;
                }
            } else if (cozeResponse.data && cozeResponse.data.answer && typeof cozeResponse.data.answer === 'string') {
                aiReply = cozeResponse.data.answer;
            }
        }

        console.log(`从 Coze 提取并准备回复：AI 说 - "${aiReply}"`);
        res.json({ reply: aiReply });

    } catch (error) {
        // 如果调用 Coze API 出错了，在这里处理
        // 打印详细的错误信息到服务器控制台
        console.error('调用 Coze API 出错:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        // 向前端返回一个错误信息
        res.status(error.response ? error.response.status : 500).json({
            error: '从AI获取回复失败',
            details: error.response ? error.response.data : error.message
        });
    }
});

// --- User Registration Route ---
// 当前端向 '/api/register' 这个地址发送 POST 请求时，会执行这里的代码
app.post('/api/register', async (req, res) => {
    try {
        // 从请求体中获取用户名和密码
        const { username, password } = req.body;

        // 简单的数据验证
        if (!username || !password) {
            return res.status(400).json({ message: '用户名和密码都不能为空' });
        }

        // 检查用户名是否已存在
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: '用户名已存在' });
        }

        // 创建新用户实例
        const newUser = new User({ username, password });

        // 保存用户到数据库 (Mongoose pre-save hook会自动加密密码)
        await newUser.save();

        // 注册成功，返回成功信息
        res.status(201).json({ message: '用户注册成功' });

    } catch (error) {
        console.error('用户注册出错:', error);
        // 处理可能的数据库错误或其他异常
        res.status(500).json({ message: '服务器内部错误' });
    }
});
// --- End User Registration Route ---

// --- User Login Route ---
// 当前端向 '/api/login' 这个地址发送 POST 请求时，会执行这里的代码
app.post('/api/login', async (req, res) => {
    try {
        // 从请求体中获取用户名和密码
        const { username, password } = req.body;

        // 简单的数据验证
        if (!username || !password) {
            return res.status(400).json({ message: '用户名和密码都不能为空' });
        }

        // 查找用户
        const user = await User.findOne({ username });

        // 检查用户是否存在
        if (!user) {
            // 为了安全，对用户名不存在和密码错误返回相同的错误信息
            return res.status(400).json({ message: '用户名或密码错误' });
        }

        // 比较密码
        const isMatch = await user.comparePassword(password);

        // 检查密码是否匹配
        if (!isMatch) {
            return res.status(400).json({ message: '用户名或密码错误' });
        }

        // 登录成功
        // 在实际应用中，这里会生成并返回一个认证令牌 (例如 JWT)
        // 为了简化，目前只返回成功消息和一些基本用户信息
        res.status(200).json({
            message: '登录成功',
            user: {
                id: user._id,
                username: user.username,
                // ⚠️ 不要在这里返回敏感信息如密码
            }
        });

    } catch (error) {
        console.error('用户登录出错:', error);
        // 处理可能的数据库错误或其他异常
        res.status(500).json({ message: '服务器内部错误' });
    }
});
// --- End User Login Route ---

// 启动服务器，并监听指定的端口号
app.listen(PORT, () => {
    console.log(`后端服务器已在 http://localhost:${PORT} 上运行`);
});