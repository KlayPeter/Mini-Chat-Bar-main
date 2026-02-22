/**
 * VectorStore - 向量数据库服务
 * 
 * 使用内存存储实现语义搜索（简化版，适合毕业设计）
 * 支持：消息索引、语义搜索、来源追溯
 */

const axios = require('axios');

class VectorStore {
  constructor() {
    // 内存存储
    this.vectors = new Map();  // id -> { embedding, document, metadata }
    this.isReady = false;
    
    // Embedding 配置
    this.embeddingConfig = {
      provider: process.env.EMBEDDING_PROVIDER || 'local', // openai/custom/local
      apiUrl: process.env.EMBEDDING_API_URL || 'https://api.openai.com/v1/embeddings',
      apiKey: process.env.EMBEDDING_API_KEY || '',
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      dimensions: 512
    };

    // 是否使用 API
    this.useEmbeddingAPI = this.embeddingConfig.provider !== 'local' &&
                           !!this.embeddingConfig.apiKey &&
                           this.embeddingConfig.apiKey !== 'your_api_key';
  }

  /**
   * 初始化
   */
  async init() {
    this.isReady = true;

    if (this.useEmbeddingAPI) {
      console.log(`✅ VectorStore 初始化成功 (${this.embeddingConfig.provider}: ${this.embeddingConfig.model})`);
    } else {
      console.log('✅ VectorStore 初始化成功 (本地 hash embedding)');
    }

    return true;
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
   * 自定义 Embedding API（兼容OpenAI格式）
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
   * 本地 hash embedding（降级方案）
   */
  simpleHashEmbedding(text, dimensions = 512) {
    const vector = new Array(dimensions).fill(0);
    const normalized = text.toLowerCase().trim();
    
    // 字符级 hash
    for (let i = 0; i < normalized.length; i++) {
      const charCode = normalized.charCodeAt(i);
      const index = (charCode * (i + 1)) % dimensions;
      vector[index] += 1;
    }
    
    // 词级 hash
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
   * 计算余弦相似度
   */
  cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
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

      this.vectors.set(id, {
        embedding,
        document: message.content,
        metadata: {
          sender: message.from || message.senderName || 'unknown',
          senderName: message.senderName || '',
          time: message.time ? new Date(message.time).toISOString() : new Date().toISOString(),
          chatType: message.roomId ? 'group' : 'private',
          chatId: message.roomId || message.to || '',
          messageType: message.messageType || 'text'
        }
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

      const results = [];

      // 遍历所有向量计算相似度
      for (const [id, data] of this.vectors) {
        // 过滤条件
        if (chatType && data.metadata.chatType !== chatType) continue;
        if (chatId && data.metadata.chatId !== chatId) continue;

        const similarity = this.cosineSimilarity(queryEmbedding, data.embedding);
        
        results.push({
          id,
          content: data.document,
          metadata: data.metadata,
          relevance: similarity
        });
      }

      // 按相似度排序，返回 topK
      return results
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, topK);

    } catch (error) {
      console.error('语义搜索失败:', error.message);
      return [];
    }
  }

  /**
   * 删除消息索引
   */
  async deleteMessage(messageId) {
    return this.vectors.delete(messageId);
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    return {
      count: this.vectors.size,
      isReady: this.isReady,
      embeddingMode: this.useEmbeddingAPI ? 'api' : 'local',
      embeddingModel: this.useEmbeddingAPI ? this.embeddingConfig.model : 'hash',
      storageType: 'memory'
    };
  }

  /**
   * 清空
   */
  async clear() {
    this.vectors.clear();
    console.log('✅ 向量存储已清空');
    return true;
  }
}

// 导出单例
const vectorStore = new VectorStore();
module.exports = vectorStore;
