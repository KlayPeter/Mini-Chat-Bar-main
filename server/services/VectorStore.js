/**
 * VectorStore - 向量数据库服务
 * 
 * 使用 Chroma 实现语义搜索
 * 支持本地部署和云服务两种模式
 * 
 * 安装依赖：npm install chromadb
 */

const axios = require('axios');

class VectorStore {
  constructor() {
    this.client = null;
    this.collection = null;
    this.isReady = false;
    this.useEmbeddingAPI = true;  // 使用 API 生成 embedding
    this.collectionName = 'chat_messages';
  }

  /**
   * 初始化向量数据库
   */
  async init() {
    try {
      // 动态导入 chromadb
      const { ChromaClient } = await import('chromadb');
      
      // 根据环境变量选择模式
      const chromaUrl = process.env.CHROMA_URL;
      
      if (chromaUrl) {
        // 独立服务模式
        this.client = new ChromaClient({ path: chromaUrl });
        console.log(`📦 VectorStore: 连接到 Chroma 服务 ${chromaUrl}`);
      } else {
        // 嵌入模式（本地文件存储）
        this.client = new ChromaClient();
        console.log('📦 VectorStore: 使用嵌入模式（本地存储）');
      }

      // 创建或获取集合
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: { description: '聊天消息向量存储' }
      });

      this.isReady = true;
      console.log('✅ VectorStore 初始化成功');
      
      return true;
    } catch (error) {
      console.error('❌ VectorStore 初始化失败:', error.message);
      console.log('💡 提示: 请确保已安装 chromadb: npm install chromadb');
      this.isReady = false;
      return false;
    }
  }

  /**
   * 生成文本的 embedding 向量
   * 使用 DeepSeek 或其他 embedding API
   */
  async generateEmbedding(text) {
    if (!text || text.trim().length === 0) {
      return null;
    }

    try {
      // 方案1：使用 DeepSeek embedding API（如果支持）
      // 方案2：使用简单的 TF-IDF 或 hash 作为降级方案
      
      // 当前使用简单的 hash 向量作为降级方案
      // TODO: 替换为真正的 embedding API
      return this.simpleHashEmbedding(text);
      
    } catch (error) {
      console.error('生成 embedding 失败:', error);
      return this.simpleHashEmbedding(text);
    }
  }

  /**
   * 简单的 hash embedding（降级方案）
   * 将文本转换为固定维度的向量
   */
  simpleHashEmbedding(text, dimensions = 384) {
    const vector = new Array(dimensions).fill(0);
    const normalized = text.toLowerCase().trim();
    
    // 基于字符的简单 hash
    for (let i = 0; i < normalized.length; i++) {
      const charCode = normalized.charCodeAt(i);
      const index = (charCode * (i + 1)) % dimensions;
      vector[index] += 1;
    }
    
    // 基于词的 hash
    const words = normalized.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = ((hash << 5) - hash) + word.charCodeAt(j);
        hash = hash & hash;
      }
      const index = Math.abs(hash) % dimensions;
      vector[index] += 2;
    }
    
    // 归一化
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] = vector[i] / magnitude;
      }
    }
    
    return vector;
  }

  /**
   * 索引单条消息
   * @param {Object} message - 消息对象
   */
  async indexMessage(message) {
    if (!this.isReady) {
      console.warn('VectorStore 未就绪，跳过索引');
      return false;
    }

    if (!message || !message.content) {
      return false;
    }

    try {
      const id = message._id?.toString() || `msg_${Date.now()}`;
      const embedding = await this.generateEmbedding(message.content);
      
      if (!embedding) {
        return false;
      }

      await this.collection.add({
        ids: [id],
        embeddings: [embedding],
        documents: [message.content],
        metadatas: [{
          sender: message.from || message.senderName || 'unknown',
          senderName: message.senderName || '',
          time: message.time ? new Date(message.time).toISOString() : new Date().toISOString(),
          chatType: message.roomId ? 'group' : 'private',
          chatId: message.roomId || message.to || '',
          messageType: message.messageType || 'text'
        }]
      });

      return true;
    } catch (error) {
      // 如果是重复 ID 错误，忽略
      if (error.message?.includes('already exists')) {
        return true;
      }
      console.error('索引消息失败:', error.message);
      return false;
    }
  }

  /**
   * 批量索引消息
   * @param {Array} messages - 消息数组
   */
  async batchIndex(messages) {
    if (!this.isReady || !messages || messages.length === 0) {
      return { success: 0, failed: 0 };
    }

    let success = 0;
    let failed = 0;

    // 分批处理，每批 100 条
    const batchSize = 100;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      const ids = [];
      const embeddings = [];
      const documents = [];
      const metadatas = [];

      for (const message of batch) {
        if (!message.content) continue;

        const id = message._id?.toString() || `msg_${Date.now()}_${Math.random()}`;
        const embedding = await this.generateEmbedding(message.content);
        
        if (embedding) {
          ids.push(id);
          embeddings.push(embedding);
          documents.push(message.content);
          metadatas.push({
            sender: message.from || message.senderName || 'unknown',
            senderName: message.senderName || '',
            time: message.time ? new Date(message.time).toISOString() : new Date().toISOString(),
            chatType: message.roomId ? 'group' : 'private',
            chatId: message.roomId || message.to || '',
            messageType: message.messageType || 'text'
          });
        }
      }

      if (ids.length > 0) {
        try {
          await this.collection.add({
            ids,
            embeddings,
            documents,
            metadatas
          });
          success += ids.length;
        } catch (error) {
          console.error('批量索引失败:', error.message);
          failed += ids.length;
        }
      }
    }

    console.log(`📊 批量索引完成: 成功 ${success}, 失败 ${failed}`);
    return { success, failed };
  }

  /**
   * 语义搜索
   * @param {Object} params
   * @param {string} params.query - 搜索查询
   * @param {string} params.chatType - 聊天类型 'private' | 'group'
   * @param {string} params.chatId - 聊天 ID
   * @param {number} params.topK - 返回数量
   */
  async search({ query, chatType, chatId, topK = 5 }) {
    if (!this.isReady) {
      console.warn('VectorStore 未就绪，使用降级搜索');
      return [];
    }

    if (!query || query.trim().length === 0) {
      return [];
    }

    try {
      const queryEmbedding = await this.generateEmbedding(query);
      
      if (!queryEmbedding) {
        return [];
      }

      // 构建过滤条件
      const whereFilter = {};
      if (chatType) {
        whereFilter.chatType = chatType;
      }
      if (chatId) {
        whereFilter.chatId = chatId;
      }

      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
        where: Object.keys(whereFilter).length > 0 ? whereFilter : undefined
      });

      // 格式化结果
      if (!results || !results.documents || !results.documents[0]) {
        return [];
      }

      return results.documents[0].map((doc, index) => ({
        content: doc,
        metadata: results.metadatas?.[0]?.[index] || {},
        distance: results.distances?.[0]?.[index] || 0,
        relevance: 1 - (results.distances?.[0]?.[index] || 0)  // 转换为相关性分数
      }));

    } catch (error) {
      console.error('语义搜索失败:', error.message);
      return [];
    }
  }

  /**
   * 删除消息索引
   * @param {string} messageId - 消息 ID
   */
  async deleteMessage(messageId) {
    if (!this.isReady) return false;

    try {
      await this.collection.delete({
        ids: [messageId]
      });
      return true;
    } catch (error) {
      console.error('删除索引失败:', error.message);
      return false;
    }
  }

  /**
   * 获取集合统计信息
   */
  async getStats() {
    if (!this.isReady) {
      return { count: 0, isReady: false };
    }

    try {
      const count = await this.collection.count();
      return {
        count,
        isReady: true,
        collectionName: this.collectionName
      };
    } catch (error) {
      return { count: 0, isReady: false, error: error.message };
    }
  }

  /**
   * 清空集合
   */
  async clear() {
    if (!this.isReady) return false;

    try {
      // 删除并重新创建集合
      await this.client.deleteCollection({ name: this.collectionName });
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: { description: '聊天消息向量存储' }
      });
      console.log('✅ 向量集合已清空');
      return true;
    } catch (error) {
      console.error('清空集合失败:', error.message);
      return false;
    }
  }
}

// 导出单例
const vectorStore = new VectorStore();

module.exports = vectorStore;
