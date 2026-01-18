const express = require('express')
const router = express.Router()
const auth = require('../middlewares/auth')
const ChatRoomAIController = require('../controllers/ChatRoomAIController')

// @AI 问答
router.post('/ask', auth, ChatRoomAIController.askAI)

// 代码分析
router.post('/analyze-code', auth, ChatRoomAIController.analyzeCode)

// 获取聊天室智能提示
router.get('/insights/:roomId', auth, ChatRoomAIController.getRoomInsights)

// AI 主动回答问题
router.post('/proactive-answer', auth, ChatRoomAIController.proactiveAnswer)

// 查找相似问题
router.get('/similar', auth, ChatRoomAIController.findSimilarQuestions)

// 生成讨论总结
router.post('/summary', auth, ChatRoomAIController.generateSummary)

module.exports = router
