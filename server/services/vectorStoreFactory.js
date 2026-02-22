/**
 * VectorStore 工厂
 * 根据配置选择使用内存存储或ChromaDB
 */

const storeType = process.env.VECTOR_STORE_TYPE || 'memory';

let vectorStore;

if (storeType === 'chromadb') {
  vectorStore = require('./ChromaVectorStore');
  console.log('📦 使用 ChromaDB 向量存储');
} else {
  vectorStore = require('./VectorStore');
  console.log('📦 使用内存向量存储');
}

module.exports = vectorStore;
