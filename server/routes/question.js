const express = require('express')
const router = express.Router()
const QuestionController = require('../controllers/QuestionController')
const auth = require('../middlewares/auth')

// 标记为问题
router.post('/:messageId/mark-question', auth, QuestionController.markAsQuestion)

// 切换问题解决状态
router.post('/:messageId/toggle-status', auth, QuestionController.toggleQuestionStatus)

// 标记为答案
router.post('/:messageId/mark-solution', auth, QuestionController.markAsSolution)

// 标记最佳答案
router.post('/:questionId/best-answer', auth, QuestionController.markBestAnswer)

// 更新问题状态
router.patch('/:questionId/status', auth, QuestionController.updateQuestionStatus)

// 点赞
router.post('/:messageId/upvote', auth, QuestionController.upvoteMessage)

// Emoji 反应
router.post('/:messageId/reaction', auth, QuestionController.toggleReaction)

// 获取问题的答案
router.get('/:questionId/answers', auth, QuestionController.getQuestionAnswers)

module.exports = router
