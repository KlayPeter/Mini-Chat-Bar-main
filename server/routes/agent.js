/**
 * Agent 路由
 */

const express = require('express');
const router = express.Router();
const AgentController = require('../controllers/AgentController');
const auth = require('../middlewares/auth');

// 所有路由都需要认证
router.use(auth);

/**
 * POST /api/agent/summarize
 * 生成聊天总结
 * 
 * Body:
 * - chatType: 'private' | 'group'
 * - targetId: 私聊对方用户 ID（chatType='private' 时必填）
 * - roomId: 群 ID（chatType='group' 时必填）
 * - timeRange: { start, end } 时间范围（可选）
 * - limit: 消息数量限制（可选，默认 100）
 */
router.post('/summarize', AgentController.summarize);

/**
 * POST /api/agent/chat
 * 智能问答
 * 
 * Body:
 * - question: 问题（必填）
 * - chatType: 'private' | 'group'（可选，用于获取上下文）
 * - targetId: 私聊对方用户 ID（可选）
 * - roomId: 群 ID（可选）
 * - useContext: 是否使用上下文（默认 true）
 * - sessionId: 会话 ID（可选，用于记忆管理）
 */
router.post('/chat', AgentController.chat);

/**
 * GET /api/agent/summaries
 * 获取历史总结
 * 
 * Query:
 * - chatType: 聊天类型（可选）
 * - targetId: 目标 ID（可选）
 * - limit: 数量限制（默认 10）
 */
router.get('/summaries', AgentController.getSummaries);

/**
 * POST /api/agent/clear-memory
 * 清除会话记忆
 * 
 * Body:
 * - sessionId: 会话 ID
 */
router.post('/clear-memory', AgentController.clearMemory);

/**
 * POST /api/agent/rag/search
 * RAG 检索测试
 * 
 * Body:
 * - query: 查询内容（必填）
 * - chatType: 聊天类型（可选）
 * - chatId: 聊天 ID（可选）
 * - topK: 返回数量（默认 5）
 * - strategy: 检索策略 'vector' | 'keyword' | 'hybrid'（默认 hybrid）
 */
router.post('/rag/search', AgentController.ragSearch);

/**
 * GET /api/agent/rag/stats
 * 获取 RAG 统计信息
 */
router.get('/rag/stats', AgentController.ragStats);

/**
 * POST /api/agent/explain
 * AI 解释文本
 * 
 * Body:
 * - text: 要解释的文本（必填）
 */
router.post('/explain', AgentController.explainText);

module.exports = router;
