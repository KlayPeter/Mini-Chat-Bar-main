/**
 * VectorSearchTool - 向量搜索工具
 * 
 * 提供语义搜索功能，集成 Chroma 向量数据库
 */

const Message = require('../models/Messages');
const GroupMessage = require('../models/GroupMessage');
const vectorStore = require('../services/VectorStore');

class VectorSearchTool {
  /**
   * 初始化向量存储
   */
  static async init() {
    return await vectorStore.init();
  }

  /**
   * 语义搜索
   * @param {Object} params
   * @param {string} params.query - 搜索查询
   * @param {string} params.chatType - 聊天类型 'private' | 'group'
   * @param {string} params.chatId - 聊天 ID
   * @param {number} params.topK - 返回数量
   */
  static async search({ query, chatType, chatId, topK = 5 }) {
    // 优先使用向量搜索
    if (vectorStore.isReady) {
      const results = await vectorStore.search({
        query,
        chatType,
        chatId,
        topK
      });

      if (results.length > 0) {
        return results;
      }
    }

    // 降级：使用关键词搜索
    console.log('📝 使用关键词搜索（向量库未就绪或无结果）');
    return await this.keywordSearch({ query, chatType, chatId, topK });
  }

  /**
   * 关键词搜索（降级方案）
   */
  static async keywordSearch({ query, chatType, chatId, topK }) {
    const keywords = query.split(/\s+/).filter(k => k.length > 1);
    
    if (keywords.length === 0) {
      return [];
    }

    const regexPatterns = keywords.map(k => new RegExp(k, 'i'));
    
    let messages = [];
    
    if (chatType === 'private') {
      messages = await Message.find({
        $or: [
          { from: chatId },
          { to: chatId }
        ],
        content: { $regex: keywords.join('|'), $options: 'i' }
      })
      .sort({ time: -1 })
      .limit(topK)
      .lean();
    } else if (chatType === 'group') {
      messages = await GroupMessage.find({
        roomId: chatId,
        content: { $regex: keywords.join('|'), $options: 'i' }
      })
      .sort({ time: -1 })
      .limit(topK)
      .lean();
    } else {
      // 搜索所有消息
      const privateMessages = await Message.find({
        content: { $regex: keywords.join('|'), $options: 'i' }
      })
      .sort({ time: -1 })
      .limit(topK)
      .lean();

      const groupMessages = await GroupMessage.find({
        content: { $regex: keywords.join('|'), $options: 'i' }
      })
      .sort({ time: -1 })
      .limit(topK)
      .lean();

      messages = [...privateMessages, ...groupMessages]
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, topK);
    }

    return messages.map(m => ({
      content: m.content,
      metadata: {
        sender: m.from || m.senderName,
        senderName: m.senderName || '',
        time: m.time,
        chatType: m.roomId ? 'group' : 'private',
        chatId: m.roomId || m.to || ''
      },
      relevance: this.calculateRelevance(m.content, keywords)
    }));
  }

  /**
   * 计算相关性分数
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
    
    return Math.min(score / keywords.length, 1);
  }

  /**
   * 索引消息
   * @param {Object} message - 消息对象
   */
  static async indexMessage(message) {
    return await vectorStore.indexMessage(message);
  }

  /**
   * 批量索引消息
   * @param {Array} messages - 消息数组
   */
  static async batchIndex(messages) {
    return await vectorStore.batchIndex(messages);
  }

  /**
   * 删除消息索引
   * @param {string} messageId - 消息 ID
   */
  static async deleteIndex(messageId) {
    return await vectorStore.deleteMessage(messageId);
  }

  /**
   * 获取向量库统计信息
   */
  static async getStats() {
    return await vectorStore.getStats();
  }

  /**
   * 检查向量库是否就绪
   */
  static isReady() {
    return vectorStore.isReady;
  }
}

module.exports = VectorSearchTool;
