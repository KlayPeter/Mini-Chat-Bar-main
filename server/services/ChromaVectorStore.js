/**
 * ChromaVectorStore - 基于ChromaDB的向量存储
 */

const { ChromaClient } = require('chromadb');
const axios = require('axios');

class ChromaVectorStore {
  constructor() {
    this.client = null;
    this.collection = null;
    this.isReady = false;

    // Embedding 配置
    this.embeddingConfig = {
      provider: process.env.EMBEDDING_PROVIDER || 'local',
      apiUrl: process.env.EMBEDDING_API_URL || 'https://api.openai.com/v1/embeddings',
      apiKey: process.env.EMBEDDING_API_KEY || '',
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      dimensions: 512
    };

    this.useEmbeddingAPI = this.embeddingConfig.provider !== 'local' &&
                           !!this.embeddingConfig.apiKey &&
                           this.embeddingConfig.apiKey !== 'your_api_key';

    // ChromaDB 配置
    this.chromaPath = process.env.CHROMA_PATH || './data/chroma';
    this.collectionName = process.env.CHROMA_COLLECTION || 'chat_messages';
  }

  /**
   * 初始化
   */
  async init() {
    try {
      this.client = new ChromaClient({ path: this.chromaPath });

      // 获取或创建集合
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: { description: '聊天消息向量存储' }
      });

      this.isReady = true;

      if (this.useEmbeddingAPI) {
        console.log(`✅ ChromaVectorStore 初始化成功 (${this.embeddingConfig.provider}: ${this.embeddingConfig.model})`);
      } else {
        console.log('✅ ChromaVectorStore 初始化成功 (本地 hash embedding)');
      }

      return true;
    } catch (error) {
      console.error('❌ ChromaVectorStore 初始化失败:', error.message);
      this.isReady = false;
      return false;
    }
  }

  /**
   * 生成 embedding
   */
  async generateEmbedding(text) {
    if (!text || text.trim().length === 0) {
      return null;
    }

    if (this.useEmbeddingAPI) {
      try {
        return await this.callEmbeddingAPI(text);
      } catch (error) {
        console.warn('Embedding API 失败，使用本地 hash:', error.message);
      }
    }

    return this.simpleHashEmbedding(text);
  }

  /**
   * 调用 Embedding API
   */
  async callEmbeddingAPI(text) {
    const { provider, apiUrl, apiKey, model } = this.embeddingConfig;

    if (provider === 'openai') {
      return this.callOpenAIEmbedding(text, apiUrl, apiKey, model);
    } else {
      return this.callCustomEmbedding(text, apiUrl, apiKey, model);
    }
  }

  /**
   * OpenAI Embedding API
   */
  async callOpenAIEmbedding(text, apiUrl, apiKey, model) {
    const response = await axios.post(
      apiUrl,
      {
        model,
        input: text,
        encoding_format: 'float'
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.data?.data?.[0]?.embedding) {
      return response.data.data[0].embedding;
    }
    throw new Error('OpenAI Embedding API 返回格式错误');
  }

  /**
   * 自定义 Embedding API
   */
  async callCustomEmbedding(text, apiUrl, apiKey, model) {
    const response = await axios.post(
      apiUrl,
      {
        model,
        input: text,
        encoding_format: 'float'
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.data?.data?.[0]?.embedding) {
      return response.data.data[0].embedding;
    }
    throw new Error('Embedding API 返回格式错误');
  }

  /**
   * 本地 hash embedding
   */
  simpleHashEmbedding(text, dimensions = 512) {
    const vector = new Array(dimensions).fill(0);
    const normalized = text.toLowerCase().trim();

    for (let i = 0; i < normalized.length; i++) {
      const charCode = normalized.charCodeAt(i);
      const index = (charCode * (i + 1)) % dimensions;
      vector[index] += 1;
    }

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
   */
  async indexMessage(message) {
    if (!this.isReady || !message || !message.content) {
      return false;
    }

    try {
      const id = message._id?.toString() || `msg_${Date.now()}_${Math.random()}`;
      const embedding = await this.generateEmbedding(message.content);

      if (!embedding) return false;

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
      console.error('索引消息失败:', error.message);
      return false;
    }
  }

  /**
   * 批量索引
   */
  async batchIndex(messages) {
    if (!this.isReady || !messages || messages.length === 0) {
      return { success: 0, failed: 0 };
    }

    let success = 0;
    let failed = 0;

    for (const message of messages) {
      const result = await this.indexMessage(message);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    if (success > 0) {
      console.log(`📊 批量索引完成: 成功 ${success}, 失败 ${failed}`);
    }
    return { success, failed };
  }

  /**
   * 语义搜索
   */
  async search({ query, chatType, chatId, topK = 5 }) {
    if (!this.isReady || !query || query.trim().length === 0) {
      return [];
    }

    try {
      const queryEmbedding = await this.generateEmbedding(query);
      if (!queryEmbedding) return [];

      // 构建过滤条件
      const where = {};
      if (chatType) where.chatType = chatType;
      if (chatId) where.chatId = chatId;

      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
        where: Object.keys(where).length > 0 ? where : undefined
      });

      if (!results.ids || results.ids.length === 0) {
        return [];
      }

      return results.ids[0].map((id, index) => ({
        id,
        content: results.documents[0][index],
        metadata: results.metadatas[0][index],
        relevance: 1 - (results.distances?.[0]?.[index] || 0)
      }));
    } catch (error) {
      console.error('语义搜索失败:', error.message);
      return [];
    }
  }

  /**
   * 删除消息索引
   */
  async deleteMessage(messageId) {
    if (!this.isReady) return false;

    try {
      await this.collection.delete({ ids: [messageId] });
      return true;
    } catch (error) {
      console.error('删除消息失败:', error.message);
      return false;
    }
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    if (!this.isReady) {
      return {
        count: 0,
        isReady: false,
        embeddingMode: 'unknown',
        embeddingModel: 'unknown',
        storageType: 'chromadb'
      };
    }

    const count = await this.collection.count();
    return {
      count,
      isReady: this.isReady,
      embeddingMode: this.useEmbeddingAPI ? 'api' : 'local',
      embeddingModel: this.useEmbeddingAPI ? this.embeddingConfig.model : 'hash',
      storageType: 'chromadb'
    };
  }

  /**
   * 清空
   */
  async clear() {
    if (!this.isReady) return false;

    try {
      await this.client.deleteCollection({ name: this.collectionName });
      this.collection = await this.client.createCollection({
        name: this.collectionName,
        metadata: { description: '聊天消息向量存储' }
      });
      console.log('✅ 向量存储已清空');
      return true;
    } catch (error) {
      console.error('清空失败:', error.message);
      return false;
    }
  }
}

// 导出单例
const chromaVectorStore = new ChromaVectorStore();
module.exports = chromaVectorStore;
