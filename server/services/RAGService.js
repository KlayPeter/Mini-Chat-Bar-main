/**
 * RAGService - 检索增强生成服务
 * 
 * 功能：
 * - 检索相关文档/消息
 * - 增强 AI 生成质量
 * - 来源追溯
 * - 检索策略优化
 */

const vectorStore = require('./VectorStore');
const Message = require('../models/Messages');
const GroupMessage = require('../models/GroupMessage');

class RAGService {
  constructor() {
    // 检索配置
    this.config = {
      topK: 5,                    // 默认检索数量
      minRelevance: 0.3,          // 最小相关性阈值
      maxContextLength: 2000,     // 最大上下文长度
      hybridWeight: 0.7,          // 混合搜索中向量搜索的权重
    };
  }

  /**
   * 检索相关内容
   * @param {Object} params
   * @param {string} params.query - 查询内容
   * @param {string} params.chatType - 聊天类型
   * @param {string} params.chatId - 聊天ID
   * @param {number} params.topK - 返回数量
   * @param {string} params.strategy - 检索策略: 'vector' | 'keyword' | 'hybrid'
   */
  async retrieve({ query, chatType, chatId, topK = 5, strategy = 'hybrid' }) {
    if (!query || query.trim().length === 0) {
      return { documents: [], sources: [] };
    }

    let results = [];

    switch (strategy) {
      case 'vector':
        results = await this.vectorSearch({ query, chatType, chatId, topK });
        break;
      case 'keyword':
        results = await this.keywordSearch({ query, chatType, chatId, topK });
        break;
      case 'hybrid':
      default:
        results = await this.hybridSearch({ query, chatType, chatId, topK });
    }

    // 过滤低相关性结果
    results = results.filter(r => r.relevance >= this.config.minRelevance);

    // 格式化为文档和来源
    const documents = results.map(r => r.content);
    const sources = results.map(r => ({
      content: r.content.substring(0, 100) + (r.content.length > 100 ? '...' : ''),
      sender: r.metadata?.sender || r.metadata?.senderName || '未知',
      time: r.metadata?.time,
      relevance: r.relevance,
      chatType: r.metadata?.chatType,
      chatId: r.metadata?.chatId
    }));

    return { documents, sources };
  }

  /**
   * 向量搜索
   */
  async vectorSearch({ query, chatType, chatId, topK }) {
    if (!vectorStore.isReady) {
      console.log('⚠️ 向量库未就绪，降级到关键词搜索');
      return this.keywordSearch({ query, chatType, chatId, topK });
    }

    const results = await vectorStore.search({
      query,
      chatType,
      chatId,
      topK
    });

    return results.map(r => ({
      content: r.content,
      metadata: r.metadata,
      relevance: r.relevance || 0.5
    }));
  }

  /**
   * 关键词搜索
   */
  async keywordSearch({ query, chatType, chatId, topK }) {
    const keywords = this.extractKeywords(query);
    
    if (keywords.length === 0) {
      return [];
    }

    const regexPattern = keywords.join('|');
    let messages = [];

    try {
      if (chatType === 'private' && chatId) {
        messages = await Message.find({
          $or: [{ from: chatId }, { to: chatId }],
          content: { $regex: regexPattern, $options: 'i' }
        })
        .sort({ time: -1 })
        .limit(topK * 2)
        .lean();
      } else if (chatType === 'group' && chatId) {
        messages = await GroupMessage.find({
          roomId: chatId,
          content: { $regex: regexPattern, $options: 'i' }
        })
        .sort({ time: -1 })
        .limit(topK * 2)
        .lean();
      } else {
        // 全局搜索
        const [privateMsg, groupMsg] = await Promise.all([
          Message.find({ content: { $regex: regexPattern, $options: 'i' } })
            .sort({ time: -1 }).limit(topK).lean(),
          GroupMessage.find({ content: { $regex: regexPattern, $options: 'i' } })
            .sort({ time: -1 }).limit(topK).lean()
        ]);
        messages = [...privateMsg, ...groupMsg];
      }
    } catch (error) {
      console.error('关键词搜索失败:', error);
      return [];
    }

    // 计算相关性并排序
    return messages
      .map(m => ({
        content: m.content,
        metadata: {
          sender: m.from || m.senderId,
          senderName: m.senderName || '',
          time: m.time,
          chatType: m.roomId ? 'group' : 'private',
          chatId: m.roomId || m.to || ''
        },
        relevance: this.calculateKeywordRelevance(m.content, keywords)
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, topK);
  }

  /**
   * 混合搜索（向量 + 关键词）
   */
  async hybridSearch({ query, chatType, chatId, topK }) {
    const [vectorResults, keywordResults] = await Promise.all([
      this.vectorSearch({ query, chatType, chatId, topK }),
      this.keywordSearch({ query, chatType, chatId, topK })
    ]);

    // 合并结果，去重
    const seen = new Set();
    const merged = [];

    // 先添加向量搜索结果（权重更高）
    for (const r of vectorResults) {
      const key = r.content.substring(0, 50);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({
          ...r,
          relevance: r.relevance * this.config.hybridWeight
        });
      }
    }

    // 再添加关键词搜索结果
    for (const r of keywordResults) {
      const key = r.content.substring(0, 50);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({
          ...r,
          relevance: r.relevance * (1 - this.config.hybridWeight)
        });
      } else {
        // 如果已存在，增加相关性分数
        const existing = merged.find(m => m.content.substring(0, 50) === key);
        if (existing) {
          existing.relevance += r.relevance * (1 - this.config.hybridWeight);
        }
      }
    }

    // 按相关性排序
    return merged
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, topK);
  }

  /**
   * 提取关键词
   */
  extractKeywords(text) {
    // 移除标点符号，分词
    const cleaned = text.replace(/[，。！？、；：""''（）【】《》\s]+/g, ' ');
    const words = cleaned.split(' ').filter(w => w.length > 1);
    
    // 过滤停用词
    const stopWords = new Set(['的', '是', '在', '了', '和', '与', '或', '这', '那', '有', '没有', '什么', '怎么', '如何', '为什么', '可以', '能够', '应该']);
    
    return words.filter(w => !stopWords.has(w));
  }

  /**
   * 计算关键词相关性
   */
  calculateKeywordRelevance(content, keywords) {
    if (!content || keywords.length === 0) return 0;
    
    const lowerContent = content.toLowerCase();
    let matchCount = 0;
    
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }
    
    return matchCount / keywords.length;
  }

  /**
   * 构建增强上下文
   * @param {string} query - 用户问题
   * @param {Array} documents - 检索到的文档
   * @param {Array} recentMessages - 最近的消息
   */
  buildAugmentedContext({ query, documents, recentMessages = [] }) {
    let context = '';
    let totalLength = 0;

    // 添加检索到的相关内容
    if (documents && documents.length > 0) {
      context += '【相关历史讨论】\n';
      for (const doc of documents) {
        if (totalLength + doc.length > this.config.maxContextLength) break;
        context += `- ${doc}\n`;
        totalLength += doc.length;
      }
      context += '\n';
    }

    // 添加最近消息作为即时上下文
    if (recentMessages && recentMessages.length > 0) {
      context += '【最近对话】\n';
      for (const msg of recentMessages.slice(-5)) {
        const line = `${msg.senderName || msg.from}: ${msg.content}`;
        if (totalLength + line.length > this.config.maxContextLength) break;
        context += `${line}\n`;
        totalLength += line.length;
      }
      context += '\n';
    }

    return context;
  }

  /**
   * RAG 增强生成
   * @param {Object} params
   * @param {string} params.query - 用户问题
   * @param {string} params.chatType - 聊天类型
   * @param {string} params.chatId - 聊天ID
   * @param {Array} params.recentMessages - 最近消息
   * @param {Function} params.generateFn - AI 生成函数
   */
  async augmentedGenerate({ query, chatType, chatId, recentMessages, generateFn }) {
    // 1. 检索相关内容
    const { documents, sources } = await this.retrieve({
      query,
      chatType,
      chatId,
      topK: this.config.topK,
      strategy: 'hybrid'
    });

    // 2. 构建增强上下文
    const augmentedContext = this.buildAugmentedContext({
      query,
      documents,
      recentMessages
    });

    // 3. 生成回答
    const prompt = this.buildRAGPrompt(query, augmentedContext);
    const answer = await generateFn(prompt);

    // 4. 返回结果（包含来源）
    return {
      answer,
      sources: sources.filter(s => s.relevance >= this.config.minRelevance),
      retrievedCount: documents.length,
      hasContext: documents.length > 0 || (recentMessages && recentMessages.length > 0)
    };
  }

  /**
   * 构建 RAG 提示词
   */
  buildRAGPrompt(query, context) {
    return `你是一个智能问答助手。请根据提供的上下文信息回答用户的问题。

${context}
【用户问题】
${query}

回答要求：
1. 优先使用上下文中的信息回答
2. 如果上下文中有相关讨论，请引用并说明
3. 回答要准确、简洁、有条理
4. 如果上下文信息不足以回答，请基于你的知识回答，并说明这是通用建议
5. 对于技术问题，给出具体的解决方案或代码示例

请直接回答：`;
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取检索统计
   */
  async getStats() {
    const vectorStats = await vectorStore.getStats();
    return {
      vectorStore: vectorStats,
      config: this.config
    };
  }
}

// 导出单例
const ragService = new RAGService();
module.exports = ragService;
