/**
 * ChatAgent - 智能问答 Agent
 * 
 * 功能：
 * - 上下文感知问答
 * - RAG 增强生成
 * - 记忆管理
 * - 来源追溯
 */

const BaseAgent = require('./BaseAgent');
const DatabaseTool = require('../tools/DatabaseTool');
const VectorSearchTool = require('../tools/VectorSearchTool');
const ragService = require('../services/RAGService');

class ChatAgent extends BaseAgent {
  constructor() {
    super('ChatAgent', '智能问答助手');
    
    // 短期记忆（会话级）
    this.shortTermMemory = new Map();
    
    // RAG 配置
    this.useRAG = true;
    
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

      // 工具2：RAG 检索相关内容
      ragRetrieve: async (params) => {
        return await ragService.retrieve(params);
      },

      // 工具3：语义搜索相关消息
      searchRelevant: async (params) => {
        return await VectorSearchTool.search(params);
      },

      // 工具4：生成回答（RAG 增强）
      generateAnswer: async (params) => {
        return await this.generateAnswerWithRAG(params);
      }
    });
  }

  /**
   * 规划执行步骤
   */
  planSteps(task) {
    const { question, chatType, userId, targetId, roomId, useContext = true, useRAG = true } = task;

    const steps = [];
    const chatId = chatType === 'private' ? targetId : roomId;

    // 步骤1：获取最近消息
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

    // 步骤2：RAG 检索相关内容
    if (useRAG && this.useRAG) {
      steps.push({
        tool: 'ragRetrieve',
        params: {
          query: question,
          chatType,
          chatId,
          topK: 5,
          strategy: 'hybrid'
        }
      });
    }

    // 步骤3：生成回答
    steps.push({
      tool: 'generateAnswer',
      params: {
        question,
        recentMessages: useContext ? '{{step0}}' : [],
        ragResult: (useRAG && this.useRAG) ? (useContext ? '{{step1}}' : '{{step0}}') : null,
        sessionId: task.sessionId
      }
    });

    return steps;
  }

  /**
   * 格式化最终结果
   */
  formatResult(results, task) {
    const useContext = task.useContext !== false;
    const useRAG = task.useRAG !== false && this.useRAG;
    
    // 根据步骤数量确定结果索引
    let answerIndex = 0;
    if (useContext) answerIndex++;
    if (useRAG) answerIndex++;
    
    const answer = results[answerIndex] || results[results.length - 1];
    const context = useContext ? results[0] : [];
    const ragResult = useRAG ? results[useContext ? 1 : 0] : null;

    return {
      answer: answer.text,
      sources: answer.sources || [],
      confidence: answer.confidence || 0.8,
      contextUsed: context.length > 0,
      contextCount: context.length,
      ragUsed: !!ragResult,
      retrievedCount: ragResult?.documents?.length || 0
    };
  }

  /**
   * 使用 RAG 增强生成回答
   */
  async generateAnswerWithRAG({ question, recentMessages, ragResult, sessionId }) {
    // 获取短期记忆
    const memory = this.getMemory(sessionId);
    
    // 构建上下文
    let contextText = '';
    
    // 添加 RAG 检索结果
    if (ragResult && ragResult.documents && ragResult.documents.length > 0) {
      contextText += '【相关历史讨论】\n';
      ragResult.documents.forEach((doc, i) => {
        const source = ragResult.sources?.[i];
        const sender = source?.sender || '未知';
        contextText += `[${sender}]: ${doc}\n`;
      });
      contextText += '\n';
    }
    
    // 添加最近消息
    if (recentMessages && recentMessages.length > 0) {
      contextText += '【最近对话】\n';
      recentMessages.slice(-8).forEach(m => {
        const sender = m.senderName || m.from;
        contextText += `${sender}: ${m.content}\n`;
      });
      contextText += '\n';
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

${contextText}
${memoryText ? `【对话历史】\n${memoryText}\n` : ''}
【用户问题】
${question}

回答要求：
1. 优先使用【相关历史讨论】中的信息回答，如果有相关内容请引用
2. 结合【最近对话】的上下文理解问题
3. 回答要准确、简洁、有条理
4. 如果是技术问题，给出具体的解决方案或代码示例
5. 如果上下文信息不足，基于你的知识回答，并说明这是通用建议

请直接回答问题：
`;

    try {
      const answer = await this.callAI(prompt);
      
      // 更新记忆
      this.addToMemory(sessionId, 'user', question);
      this.addToMemory(sessionId, 'assistant', answer);

      // 提取引用来源
      const sources = this.extractSourcesFromRAG(ragResult, recentMessages, answer);

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
   * 从 RAG 结果中提取来源
   */
  extractSourcesFromRAG(ragResult, recentMessages, answer) {
    const sources = [];
    const answerLower = answer.toLowerCase();

    // 从 RAG 结果提取
    if (ragResult && ragResult.sources) {
      for (const source of ragResult.sources) {
        if (source.relevance >= 0.3) {
          // 检查回答是否引用了这个来源
          const keywords = source.content.split(/\s+/).filter(k => k.length > 2);
          const matchCount = keywords.filter(k => 
            answerLower.includes(k.toLowerCase())
          ).length;

          if (matchCount >= 2 || source.relevance >= 0.5) {
            sources.push({
              content: source.content,
              sender: source.sender,
              time: source.time,
              relevance: source.relevance,
              type: 'rag'
            });
          }
        }
      }
    }

    // 从最近消息提取
    if (recentMessages && recentMessages.length > 0) {
      for (const msg of recentMessages) {
        const keywords = msg.content.split(/\s+/).filter(k => k.length > 2);
        const matchCount = keywords.filter(k => 
          answerLower.includes(k.toLowerCase())
        ).length;

        if (matchCount >= 2) {
          // 避免重复
          const exists = sources.some(s => 
            s.content.substring(0, 50) === msg.content.substring(0, 50)
          );
          
          if (!exists) {
            sources.push({
              content: msg.content.substring(0, 100),
              sender: msg.senderName || msg.from,
              time: msg.time,
              relevance: matchCount / Math.max(keywords.length, 1),
              type: 'recent'
            });
          }
        }
      }
    }

    return sources.slice(0, 5);  // 最多返回 5 个来源
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
   * 设置是否使用 RAG
   */
  setUseRAG(enabled) {
    this.useRAG = enabled;
  }
}

module.exports = ChatAgent;
