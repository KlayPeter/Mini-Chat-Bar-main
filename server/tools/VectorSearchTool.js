/**
 * VectorSearchTool - 向量搜索工具
 * 
 * 提供语义搜索功能（后续集成 Chroma）
 * 当前版本：简单的关键词搜索作为降级方案
 */

const Message = require('../models/Message');
const GroupMessage = require('../models/GroupMessage');

class VectorSearchTool {
  constructor() {
    this.isVectorStoreReady = false;
    this.vectorStore = null;
  }

  /**
   * 初始化向量存储（后续实现）
   */
  async init() {
    try {
      // TODO: 集成 Chroma
      // const { ChromaClient } = require('chromadb');
      // this.vectorStore = new ChromaClient({ path: './data/chroma' });
      // this.collection = await this.vectorStore.getOrCreateCollection({ name: 'messages' });
      // this.isVectorStoreReady = true;
      
      console.log('📦 VectorSearchTool: 使用关键词搜索模式（向量库待集成）');
    } catch (error) {
      console.error('向量库初始化失败:', error);
      this.isVectorStoreReady = false;
    }
  }

  /**
   * 语义搜索（当前使用关键词搜索作为降级）
   * @param {Object} params
   * @param {string} params.query - 搜索查询
   * @param {string} params.chatType - 聊天类型 'private' | 'group'
   * @param {string} params.chatId - 聊天 ID
   * @param {number} params.topK - 返回数量
   */
  static async search({ query, chatType, chatId, topK = 5 }) {
    // 当前使用关键词搜索作为降级方案
    // TODO: 替换为向量搜索
    
    const keywords = query.split(/\s+/).filter(k => k.length > 1);
    
    if (chatType === 'private') {
      return await this.searchPrivateMessages(keywords, chatId, topK);
    } else {
      return await this.searchGroupMessages(keywords, chatId, topK);
    }
  }

  /**
   * 搜索私聊消息
   */
  static async searchPrivateMessages(keywords, chatId, topK) {
    const regexPatterns = keywords.map(k => new RegExp(k, 'i'));
    
    const messages = await Message.find({
      $or: [
        { from: chatId },
        { to: chatId }
      ],
      content: { $in: regexPatterns }
    })
    .sort({ time: -1 })
    .limit(topK)
    .lean();

    return messages.map(m => ({
      ...m,
      relevance: this.calculateRelevance(m.content, keywords)
    }));
  }

  /**
   * 搜索群聊消息
   */
  static async searchGroupMessages(keywords, roomId, topK) {
    const regexPatterns = keywords.map(k => new RegExp(k, 'i'));
    
    const messages = await GroupMessage.find({
      roomId,
      content: { $in: regexPatterns }
    })
    .sort({ time: -1 })
    .limit(topK)
    .lean();

    return messages.map(m => ({
      ...m,
      relevance: this.calculateRelevance(m.content, keywords)
    }));
  }

  /**
   * 计算相关性分数（简单版本）
   */
  static calculateRelevance(content, keywords) {
    if (!content) return 0;
    
    let score = 0;
    const lowerContent = content.toLowerCase();
    
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    
    return score / keywords.length;
  }

  /**
   * 索引消息（后续实现向量化）
   * @param {Object} message - 消息对象
   */
  static async indexMessage(message) {
    // TODO: 实现向量化存储
    // 当前版本不做任何操作，消息已存储在 MongoDB
    return true;
  }

  /**
   * 批量索引消息
   * @param {Array} messages - 消息数组
   */
  static async batchIndex(messages) {
    // TODO: 实现批量向量化
    return true;
  }
}

module.exports = VectorSearchTool;
