/**
 * ChatAgent - 智能问答 Agent
 * 
 * 功能：
 * - 上下文感知问答
 * - RAG 增强（后续实现）
 * - 记忆管理
 */

const BaseAgent = require('./BaseAgent');
const DatabaseTool = require('../tools/DatabaseTool');
const VectorSearchTool = require('../tools/VectorSearchTool');

class ChatAgent extends BaseAgent {
  constructor() {
    super('ChatAgent', '智能问答助手');
    
    // 短期记忆（会话级）
    this.shortTermMemory = new Map();
    
    // 注册工具
    this.registerTools({
      // 工具1：获取最近消息作为上下文
      getRecentMessages: async (params) => {
        const { chatType, userId, targetId, roomId, limit = 10 } = params;
        
        if (chatType === 'private') {
          return await DatabaseTool.getPrivateMessages({
            userId,
            targetId,
            limit
          });
        } else {
          return await DatabaseTool.getGroupMessages({
            roomId,
            limit
          });
        }
      },

      // 工具2：语义搜索相关消息
      searchRelevant: async (params) => {
        return await VectorSearchTool.search(params);
      },

      // 工具3：生成回答
      generateAnswer: async (params) => {
        return await this.generateAnswerWithAI(params);
      }
    });
  }

  /**
   * 规划执行步骤
   */
  planSteps(task) {
    const { question, chatType, userId, targetId, roomId, useContext = true } = task;

    const steps = [];

    // 如果需要上下文，先获取最近消息
    if (useContext) {
      steps.push({
        tool: 'getRecentMessages',
        params: {
          chatType,
          userId,
          targetId,
          roomId,
          limit: 10
        }
      });
    }

    // 生成回答
    steps.push({
      tool: 'generateAnswer',
      params: {
        question,
        context: useContext ? '{{step0}}' : [],
        sessionId: task.sessionId
      }
    });

    return steps;
  }

  /**
   * 格式化最终结果
   */
  formatResult(results, task) {
    const hasContext = task.useContext !== false;
    const answer = hasContext ? results[1] : results[0];
    const context = hasContext ? results[0] : [];

    return {
      answer: answer.text,
      sources: answer.sources || [],
      confidence: answer.confidence || 0.8,
      contextUsed: context.length > 0,
      contextCount: context.length
    };
  }

  /**
   * 使用 AI 生成回答
   */
  async generateAnswerWithAI({ question, context, sessionId }) {
    // 获取短期记忆
    const memory = this.getMemory(sessionId);
    
    // 构建上下文
    let contextText = '';
    if (context && context.length > 0) {
      contextText = context
        .slice(-10)
        .map(m => {
          const sender = m.senderName || m.from;
          return `${sender}: ${m.content}`;
        })
        .join('\n');
    }

    // 构建记忆上下文
    let memoryText = '';
    if (memory.length > 0) {
      memoryText = memory
        .slice(-5)
        .map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
        .join('\n');
    }

    const prompt = `
你是一个智能问答助手，请根据上下文信息回答用户的问题。

${contextText ? `【相关聊天记录】\n${contextText}\n` : ''}
${memoryText ? `【对话历史】\n${memoryText}\n` : ''}
【用户问题】
${question}

要求：
1. 如果聊天记录中有相关信息，优先引用
2. 回答要准确、简洁
3. 如果不确定，请说明
4. 如果是技术问题，给出具体的解决方案

请直接回答问题，不要重复问题内容。
`;

    try {
      const answer = await this.callAI(prompt);
      
      // 更新记忆
      this.addToMemory(sessionId, 'user', question);
      this.addToMemory(sessionId, 'assistant', answer);

      // 提取引用来源
      const sources = this.extractSources(context, answer);

      return {
        text: answer,
        sources,
        confidence: sources.length > 0 ? 0.9 : 0.7
      };

    } catch (error) {
      return {
        text: '抱歉，我暂时无法回答您的问题，请稍后重试。',
        sources: [],
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * 获取会话记忆
   */
  getMemory(sessionId) {
    if (!sessionId) return [];
    return this.shortTermMemory.get(sessionId) || [];
  }

  /**
   * 添加到记忆
   */
  addToMemory(sessionId, role, content) {
    if (!sessionId) return;
    
    if (!this.shortTermMemory.has(sessionId)) {
      this.shortTermMemory.set(sessionId, []);
    }
    
    const memory = this.shortTermMemory.get(sessionId);
    memory.push({
      role,
      content,
      timestamp: new Date()
    });

    // 保持最近 20 条
    if (memory.length > 20) {
      memory.shift();
    }
  }

  /**
   * 清除会话记忆
   */
  clearMemory(sessionId) {
    this.shortTermMemory.delete(sessionId);
  }

  /**
   * 提取引用来源
   */
  extractSources(context, answer) {
    if (!context || context.length === 0) return [];

    const sources = [];
    const answerLower = answer.toLowerCase();

    for (const msg of context) {
      // 简单匹配：如果回答中包含消息内容的关键词
      const keywords = msg.content.split(/\s+/).filter(k => k.length > 3);
      const matchCount = keywords.filter(k => 
        answerLower.includes(k.toLowerCase())
      ).length;

      if (matchCount >= 2 || (keywords.length <= 2 && matchCount >= 1)) {
        sources.push({
          messageId: msg._id,
          content: msg.content.substring(0, 100),
          sender: msg.senderName || msg.from,
          relevance: matchCount / Math.max(keywords.length, 1)
        });
      }
    }

    return sources.slice(0, 3);  // 最多返回 3 个来源
  }
}

module.exports = ChatAgent;
