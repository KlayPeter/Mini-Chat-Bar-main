require("dotenv").config();
const axios = require("axios");
const AIConversation = require("../models/AIConversation");

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

// 预定义角色提示词
const ROLE_PROMPTS = {
  default: `你是一个AI智能小助手，请用简短的中文回答用户的问题。
当前项目叫做"Mini-Chat-Bar聊天软件"，作者名字是"密码的箱子"。
当别人问起作者相关消息时，你给他推荐GitHub链接：https://github.com/KlayPeter。`,
  
  assistant: `你是一个专业的AI助手，擅长解答各类问题。你的回答应该准确、简洁、有条理。
始终保持礼貌和专业，提供有价值的信息和建议。`,
  
  teacher: `你是一位耐心的老师，擅长用简单易懂的方式解释复杂概念。
你会使用类比、举例等方法帮助学生理解知识点。
对学生的问题保持鼓励态度，引导他们独立思考。`,
  
  friend: `你是用户的好朋友，说话轻松随意，有幽默感。
你会关心用户的感受，给予情感支持和鼓励。
聊天时使用口语化的表达，让对话更亲切自然。`,
  
  programmer: `你是一位资深程序员，精通多种编程语言和技术栈。
你会提供清晰的代码示例和技术解决方案。
解释技术概念时注重实践应用，给出最佳实践建议。`,
  
  writer: `你是一位专业作家，擅长各类文字创作。
你可以帮助用户润色文章、提供写作建议、创作故事。
你的表达优美流畅，富有文采。`,
  
  psychologist: `你是一位心理咨询师，善于倾听和理解他人。
你会用温和、支持性的语言与用户交流。
提供情绪管理建议时保持专业和同理心。`
};

class AIController {
  // 发送消息给AI（流式响应）
  static async chatStream(req, res) {
    try {
      const { question, role = 'default', customPrompt } = req.body;
      const userId = req.user.userId;
      const username = req.user.username;

      if (!question) {
        return res.status(400).json({ error: "问题不能为空" });
      }

      if (!DEEPSEEK_API_KEY) {
        return res.status(500).json({ error: "服务器配置错误：DeepSeek API Key 未设置" });
      }

      // 设置SSE响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // 获取或创建用户的对话记录
      let conversation = await AIConversation.findOne({ userId });

      if (!conversation) {
        conversation = new AIConversation({
          userId,
          role,
          rolePrompt: customPrompt || ROLE_PROMPTS[role] || ROLE_PROMPTS.default,
          messages: []
        });
      }

      // 如果角色变更，重置对话
      if (role !== conversation.role || (customPrompt && customPrompt !== conversation.rolePrompt)) {
        conversation.role = role;
        conversation.rolePrompt = customPrompt || ROLE_PROMPTS[role] || ROLE_PROMPTS.default;
        conversation.messages = [];
      }

      // 添加用户消息
      conversation.messages.push({
        role: 'user',
        content: question,
        timestamp: new Date()
      });

      // 构建发送给AI的消息历史
      const systemPrompt = conversation.rolePrompt.replace('${user}', username);
      const recentMessages = conversation.messages.slice(-20);

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...recentMessages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        }))
      ];

      // 调用DeepSeek API（流式）
      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: "deepseek-chat",
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 2000,
          stream: true,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          },
          responseType: 'stream',
          timeout: 30000
        }
      );

      let fullAnswer = '';

      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              if (content) {
                fullAnswer += content;
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      });

      response.data.on('end', async () => {
        // 保存AI回复
        conversation.messages.push({
          role: 'assistant',
          content: fullAnswer,
          timestamp: new Date()
        });

        conversation.trimMessages(30);
        await conversation.save();

        res.write(`data: ${JSON.stringify({ done: true, conversationId: conversation._id })}\n\n`);
        res.end();
      });

      response.data.on('error', (error) => {
        console.error("流式响应错误:", error);
        res.write(`data: ${JSON.stringify({ error: "流式响应失败" })}\n\n`);
        res.end();
      });

    } catch (error) {
      console.error("AI聊天失败:", error.response?.data || error.message);
      res.write(`data: ${JSON.stringify({ error: "AI响应失败" })}\n\n`);
      res.end();
    }
  }

  // 发送消息给AI
  static async chat(req, res) {
    try {
      const { question, role = 'default', customPrompt } = req.body;
      const userId = req.user.userId;
      const username = req.user.username;

      if (!question) {
        return res.status(400).json({ error: "问题不能为空" });
      }

      if (!DEEPSEEK_API_KEY) {
        return res.status(500).json({ error: "服务器配置错误：DeepSeek API Key 未设置" });
      }

      // 获取或创建用户的对话记录
      let conversation = await AIConversation.findOne({ userId });
      
      if (!conversation) {
        conversation = new AIConversation({
          userId,
          role,
          rolePrompt: customPrompt || ROLE_PROMPTS[role] || ROLE_PROMPTS.default,
          messages: []
        });
      }

      // 如果角色变更，重置对话
      if (role !== conversation.role || (customPrompt && customPrompt !== conversation.rolePrompt)) {
        conversation.role = role;
        conversation.rolePrompt = customPrompt || ROLE_PROMPTS[role] || ROLE_PROMPTS.default;
        conversation.messages = [];
      }

      // 添加用户消息
      conversation.messages.push({
        role: 'user',
        content: question,
        timestamp: new Date()
      });

      // 构建发送给AI的消息历史
      const systemPrompt = conversation.rolePrompt.replace('${user}', username);
      
      // 获取最近的对话历史（最多10轮）
      const recentMessages = conversation.messages.slice(-20); // 用户+助手消息，约10轮对话
      
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...recentMessages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        }))
      ];

      // 调用DeepSeek API
      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: "deepseek-chat",
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 2000,
          stream: false,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          },
          timeout: 30000 // 30秒超时
        }
      );

      const aiAnswer = response.data.choices[0]?.message?.content || 
                      "抱歉，我暂时无法回答您的问题。";

      // 保存AI回复
      conversation.messages.push({
        role: 'assistant',
        content: aiAnswer,
        timestamp: new Date()
      });

      // 限制消息历史长度
      conversation.trimMessages(30);

      // 保存到数据库
      await conversation.save();

      res.json({ 
        answer: aiAnswer,
        conversationId: conversation._id,
        messageCount: conversation.messages.length
      });

    } catch (error) {
      console.error("AI聊天失败:", error.response?.data || error.message);
      res.status(500).json({ 
        error: "AI响应失败",
        details: error.response?.data?.error || error.message
      });
    }
  }

  // 获取对话历史
  static async getHistory(req, res) {
    try {
      const userId = req.user.userId;
      const { limit = 50 } = req.query;

      const conversation = await AIConversation.findOne({ userId });

      if (!conversation) {
        return res.json({ 
          messages: [],
          role: 'default',
          totalCount: 0
        });
      }

      const messages = conversation.messages
        .filter(m => m.role !== 'system')
        .slice(-limit)
        .map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp
        }));

      res.json({
        messages,
        role: conversation.role,
        totalCount: conversation.messages.length
      });

    } catch (error) {
      console.error("获取对话历史失败:", error);
      res.status(500).json({ error: "获取对话历史失败" });
    }
  }

  // 清空对话历史
  static async clearHistory(req, res) {
    try {
      const userId = req.user.userId;

      await AIConversation.findOneAndUpdate(
        { userId },
        { $set: { messages: [], updatedAt: new Date() } },
        { upsert: true }
      );

      res.json({ message: "对话历史已清空" });

    } catch (error) {
      console.error("清空对话历史失败:", error);
      res.status(500).json({ error: "清空对话历史失败" });
    }
  }

  // 切换角色
  static async switchRole(req, res) {
    try {
      const userId = req.user.userId;
      const { role, customPrompt } = req.body;

      if (!ROLE_PROMPTS[role] && !customPrompt) {
        return res.status(400).json({ error: "无效的角色" });
      }

      const conversation = await AIConversation.findOneAndUpdate(
        { userId },
        { 
          $set: { 
            role,
            rolePrompt: customPrompt || ROLE_PROMPTS[role],
            messages: [], // 切换角色时清空历史
            updatedAt: new Date()
          }
        },
        { upsert: true, new: true }
      );

      res.json({ 
        message: "角色切换成功",
        role: conversation.role
      });

    } catch (error) {
      console.error("切换角色失败:", error);
      res.status(500).json({ error: "切换角色失败" });
    }
  }

  // 获取可用角色列表
  static getRoles(req, res) {
    const roles = Object.keys(ROLE_PROMPTS).map(key => ({
      key,
      name: {
        default: 'AI助手',
        assistant: '专业助手',
        teacher: '耐心老师',
        friend: '贴心朋友',
        programmer: '程序员',
        writer: '专业作家',
        psychologist: '心理咨询师'
      }[key],
      description: ROLE_PROMPTS[key].split('\n')[0]
    }));

    res.json({ roles });
  }
}

module.exports = AIController;

