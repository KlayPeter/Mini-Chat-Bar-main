/**
 * AgentController - Agent 控制器
 * 
 * 提供 Agent 相关的 API 接口
 */

const SummaryAgent = require('../agents/SummaryAgent');
const ChatAgent = require('../agents/ChatAgent');
const Summary = require('../models/Summary');

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
      const { question, chatType, targetId, roomId, useContext, sessionId } = req.body;
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
        sessionId: sessionId || `${userId}-${Date.now()}`
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
}

module.exports = AgentController;
