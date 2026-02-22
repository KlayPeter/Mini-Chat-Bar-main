/**
 * MessageIndexer - 消息自动向量化服务
 * 
 * 功能：
 * - 监听新消息并自动向量化
 * - 批量索引历史消息
 * - 异步处理，不阻塞消息发送
 */

const vectorStore = require('./vectorStoreFactory');
const Message = require('../models/Messages');
const GroupMessage = require('../models/GroupMessage');

class MessageIndexer {
  constructor() {
    this.isRunning = false;
    this.queue = [];  // 待索引队列
    this.batchSize = 10;  // 批量处理大小
    this.processInterval = 5000;  // 处理间隔（毫秒）
  }

  /**
   * 启动索引服务
   */
  async start() {
    if (this.isRunning) {
      console.log('📦 MessageIndexer 已在运行');
      return;
    }

    // 初始化向量库
    const initialized = await vectorStore.init();
    
    if (!initialized) {
      console.log('⚠️ 向量库初始化失败，消息索引服务未启动');
      console.log('💡 提示: 请安装 chromadb: npm install chromadb');
      return;
    }

    this.isRunning = true;
    console.log('✅ MessageIndexer 已启动');

    // 启动队列处理
    this.startQueueProcessor();
  }

  /**
   * 停止索引服务
   */
  stop() {
    this.isRunning = false;
    console.log('🛑 MessageIndexer 已停止');
  }

  /**
   * 添加消息到索引队列
   * @param {Object} message - 消息对象
   */
  addToQueue(message) {
    if (!this.isRunning) {
      return;
    }

    // 只索引文本消息
    if (message.messageType && message.messageType !== 'text') {
      return;
    }

    this.queue.push(message);
  }

  /**
   * 启动队列处理器
   */
  startQueueProcessor() {
    setInterval(async () => {
      if (this.queue.length === 0) {
        return;
      }

      // 取出一批消息
      const batch = this.queue.splice(0, this.batchSize);
      
      // 异步处理，不阻塞
      this.processBatch(batch).catch(err => {
        console.error('处理索引队列失败:', err.message);
      });

    }, this.processInterval);
  }

  /**
   * 处理一批消息
   */
  async processBatch(messages) {
    if (messages.length === 0) return;

    const results = await vectorStore.batchIndex(messages);
    
    if (results.success > 0) {
      console.log(`📊 索引了 ${results.success} 条消息`);
    }
  }

  /**
   * 索引单条消息（立即执行）
   * @param {Object} message - 消息对象
   */
  async indexNow(message) {
    if (!vectorStore.isReady) {
      return false;
    }

    return await vectorStore.indexMessage(message);
  }

  /**
   * 批量索引历史消息
   * @param {Object} options
   * @param {number} options.limit - 限制数量
   * @param {Date} options.since - 起始时间
   */
  async indexHistoricalMessages({ limit = 1000, since } = {}) {
    if (!vectorStore.isReady) {
      console.log('⚠️ 向量库未就绪，无法索引历史消息');
      return { success: 0, failed: 0 };
    }

    console.log('📚 开始索引历史消息...');

    const query = {};
    if (since) {
      query.time = { $gte: since };
    }

    // 索引私聊消息
    const privateMessages = await Message.find(query)
      .sort({ time: -1 })
      .limit(limit)
      .lean();

    console.log(`📝 找到 ${privateMessages.length} 条私聊消息`);

    // 索引群聊消息
    const groupMessages = await GroupMessage.find(query)
      .sort({ time: -1 })
      .limit(limit)
      .lean();

    console.log(`📝 找到 ${groupMessages.length} 条群聊消息`);

    // 合并并索引
    const allMessages = [...privateMessages, ...groupMessages];
    const results = await vectorStore.batchIndex(allMessages);

    console.log(`✅ 历史消息索引完成: 成功 ${results.success}, 失败 ${results.failed}`);
    
    return results;
  }

  /**
   * 获取索引统计信息
   */
  async getStats() {
    const vectorStats = await vectorStore.getStats();
    
    return {
      ...vectorStats,
      queueLength: this.queue.length,
      isRunning: this.isRunning
    };
  }
}

// 导出单例
const messageIndexer = new MessageIndexer();

module.exports = messageIndexer;
