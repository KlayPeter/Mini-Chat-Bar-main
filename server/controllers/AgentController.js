/**
 * AgentController - Agent 控制器
 * 
 * 提供 Agent 相关的 API 接口
 */

const SummaryAgent = require('../agents/SummaryAgent');
const ChatAgent = require('../agents/ChatAgent');
const Summary = require('../models/Summary');
const ragService = require('../services/RAGService');

// Agent 实例（单例）
const summaryAgent = new SummaryAgent();
const chatAgent = new ChatAgent();

class AgentController {
  /**
   * 生成聊天总结
   * POST /api/agent/summarize
   */
  static async summarize(req, res) {
    try {
      const { chatType, targetId, roomId, timeRange, limit } = req.body;
      const userId = req.user.userId;

      // 参数验证
      if (!chatType || (chatType === 'private' && !targetId) || (chatType === 'group' && !roomId)) {
        return res.status(400).json({
          success: false,
          error: '参数错误：需要指定 chatType 和对应的 targetId/roomId'
        });
      }

      // 执行 Agent
      const result = await summaryAgent.execute({
        chatType,
        userId,
        targetId,
        roomId,
        timeRange,
        limit
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }

      // 保存总结记录（可选）
      try {
        await Summary.create({
          userId,
          chatType,
          targetId: chatType === 'private' ? targetId : roomId,
          summary: result.data.summary,
          statistics: result.data.statistics,
          messageCount: result.data.messageCount
        });
      } catch (saveError) {
        console.error('保存总结记录失败:', saveError);
        // 不影响返回结果
      }

      res.json({
        success: true,
        data: result.data
      });

    } catch (error) {
      console.error('总结生成失败:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 智能问答
   * POST /api/agent/chat
   */
  static async chat(req, res) {
    try {
      const { question, chatType, targetId, roomId, useContext, sessionId, timeRange } = req.body;
      const userId = req.user.userId;

      // 参数验证
      if (!question) {
        return res.status(400).json({
          success: false,
          error: '参数错误：需要提供问题'
        });
      }

      // 执行 Agent
      const result = await chatAgent.execute({
        question,
        chatType,
        userId,
        targetId,
        roomId,
        useContext: useContext !== false,
        sessionId: sessionId || `${userId}-${Date.now()}`,
        timeRange: timeRange || 'recent'
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result.data
      });

    } catch (error) {
      console.error('问答失败:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 获取历史总结
   * GET /api/agent/summaries
   */
  static async getSummaries(req, res) {
    try {
      const userId = req.user.userId;
      const { chatType, targetId, limit = 10 } = req.query;

      const query = { userId };
      if (chatType) query.chatType = chatType;
      if (targetId) query.targetId = targetId;

      const summaries = await Summary.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean();

      res.json({
        success: true,
        data: summaries
      });

    } catch (error) {
      console.error('获取总结历史失败:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 清除会话记忆
   * POST /api/agent/clear-memory
   */
  static async clearMemory(req, res) {
    try {
      const { sessionId } = req.body;
      
      if (sessionId) {
        chatAgent.clearMemory(sessionId);
      }

      res.json({
        success: true,
        message: '会话记忆已清除'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * RAG 检索测试
   * POST /api/agent/rag/search
   */
  static async ragSearch(req, res) {
    try {
      const { query, chatType, chatId, topK = 5, strategy = 'hybrid' } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: '参数错误：需要提供查询内容'
        });
      }

      const result = await ragService.retrieve({
        query,
        chatType,
        chatId,
        topK,
        strategy
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('RAG 检索失败:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 获取 RAG 统计信息
   * GET /api/agent/rag/stats
   */
  static async ragStats(req, res) {
    try {
      const stats = await ragService.getStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * AI 解释文本
   * POST /api/agent/explain
   */
  static async explainText(req, res) {
    try {
      const { text, isFollowUp } = req.body;
      const axios = require('axios');

      if (!text || !text.trim()) {
        return res.status(400).json({
          success: false,
          message: '请提供要解释的文本'
        });
      }

      let explanation;
      
      // 追问模式：直接使用完整上下文
      if (isFollowUp) {
        const response = await axios.post(
          'https://api.deepseek.com/chat/completions',
          {
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content: '你是一个专业的解释助手。用户会提供原文和对话历史，请根据上下文回答用户的追问。回答要简洁清晰。'
              },
              {
                role: 'user',
                content: text
              }
            ],
            temperature: 0.7,
            max_tokens: 800
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        explanation = response.data.choices[0].message.content;
      } else {
        // 首次解释
        const isComplex = text.length > 100 || /代码|函数|class|function|const|let|var|import|export/.test(text);

        if (isComplex) {
          const result = await chatAgent.execute({
            question: `请详细解释以下内容：\n\n${text}`,
            userId: req.user.userId,
            useContext: true
          });
          explanation = result.data.answer;
        } else {
          const response = await axios.post(
            'https://api.deepseek.com/chat/completions',
            {
              model: 'deepseek-chat',
              messages: [
                {
                  role: 'system',
                  content: '你是一个专业的解释助手，擅长用简洁清晰的语言解释各种概念、术语和内容。'
                },
                {
                  role: 'user',
                  content: `请简洁地解释：${text}`
                }
              ],
              temperature: 0.7,
              max_tokens: 500
            },
            {
              headers: {
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          );
          explanation = response.data.choices[0].message.content;
        }
      }

      res.json({
        success: true,
        explanation
      });
    } catch (error) {
      console.error('AI 解释失败:', error);
      res.status(500).json({
        success: false,
        message: 'AI 解释失败',
        error: error.message
      });
    }
  }
}

module.exports = AgentController;
