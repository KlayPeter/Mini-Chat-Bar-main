const GroupMessage = require('../models/GroupMessage')

/**
 * 问题/答案管理控制器
 */
class QuestionController {
  
  /**
   * 标记消息为问题
   */
  static async markAsQuestion(req, res) {
    try {
      const { messageId } = req.params
      const userId = req.user.userId
      
      const message = await GroupMessage.findById(messageId)
      if (!message) {
        return res.status(404).json({ message: '消息不存在' })
      }
      
      // 只有发送者可以标记为问题
      if (message.from !== userId) {
        return res.status(403).json({ message: '只有发送者可以标记为问题' })
      }
      
      message.isQuestion = true
      message.questionStatus = 'open'
      await message.save()
      
      // 通过 Socket.IO 通知所有成员
      const io = req.app.get('io')
      if (io) {
        io.to(message.roomId).emit('message-updated', {
          messageId: message._id,
          isQuestion: true,
          questionStatus: 'open'
        })
      }
      
      res.json({ success: true, message: '已标记为问题' })
    } catch (err) {
      console.error('标记问题失败:', err)
      res.status(500).json({ message: '标记失败', error: err.message })
    }
  }
  
  /**
   * 标记消息为答案
   */
  static async markAsSolution(req, res) {
    try {
      const { messageId } = req.params
      const { questionId } = req.body
      
      const message = await GroupMessage.findById(messageId)
      const question = await GroupMessage.findById(questionId)
      
      if (!message || !question) {
        return res.status(404).json({ message: '消息不存在' })
      }
      
      if (!question.isQuestion) {
        return res.status(400).json({ message: '目标消息不是问题' })
      }
      
      message.isSolution = true
      message.solutionTo = questionId
      await message.save()
      
      // 通过 Socket.IO 通知
      const io = req.app.get('io')
      if (io) {
        io.to(message.roomId).emit('message-updated', {
          messageId: message._id,
          isSolution: true,
          solutionTo: questionId
        })
      }
      
      res.json({ success: true, message: '已标记为答案' })
    } catch (err) {
      console.error('标记答案失败:', err)
      res.status(500).json({ message: '标记失败', error: err.message })
    }
  }
  
  /**
   * 标记最佳答案
   */
  static async markBestAnswer(req, res) {
    try {
      const { questionId } = req.params
      const { answerId } = req.body
      const userId = req.user.userId
      
      const question = await GroupMessage.findById(questionId)
      const answer = await GroupMessage.findById(answerId)
      
      if (!question || !answer) {
        return res.status(404).json({ message: '消息不存在' })
      }
      
      // 只有提问者可以标记最佳答案
      if (question.from !== userId) {
        return res.status(403).json({ message: '只有提问者可以标记最佳答案' })
      }
      
      if (!question.isQuestion) {
        return res.status(400).json({ message: '目标消息不是问题' })
      }
      
      // 标记最佳答案
      question.bestAnswer = answerId
      question.questionStatus = 'solved'
      await question.save()
      
      // 标记答案为解决方案
      answer.isSolution = true
      answer.solutionTo = questionId
      await answer.save()
      
      // 通过 Socket.IO 通知
      const io = req.app.get('io')
      if (io) {
        io.to(question.roomId).emit('question-solved', {
          questionId: question._id,
          answerId: answer._id,
          questionStatus: 'solved'
        })
      }
      
      res.json({ success: true, message: '已标记最佳答案' })
    } catch (err) {
      console.error('标记最佳答案失败:', err)
      res.status(500).json({ message: '标记失败', error: err.message })
    }
  }
  
  /**
   * 更新问题状态
   */
  static async updateQuestionStatus(req, res) {
    try {
      const { questionId } = req.params
      const { status } = req.body
      const userId = req.user.userId
      
      const question = await GroupMessage.findById(questionId)
      if (!question) {
        return res.status(404).json({ message: '问题不存在' })
      }
      
      // 只有提问者可以更新状态
      if (question.from !== userId) {
        return res.status(403).json({ message: '只有提问者可以更新状态' })
      }
      
      question.questionStatus = status
      await question.save()
      
      // 通过 Socket.IO 通知
      const io = req.app.get('io')
      if (io) {
        io.to(question.roomId).emit('message-updated', {
          messageId: question._id,
          questionStatus: status
        })
      }
      
      res.json({ success: true, message: '状态已更新' })
    } catch (err) {
      console.error('更新状态失败:', err)
      res.status(500).json({ message: '更新失败', error: err.message })
    }
  }
  
  /**
   * 点赞消息
   */
  static async upvoteMessage(req, res) {
    try {
      const { messageId } = req.params
      const userId = req.user.userId
      
      const message = await GroupMessage.findById(messageId)
      if (!message) {
        return res.status(404).json({ message: '消息不存在' })
      }
      
      // 检查是否已点赞
      const upvotes = message.upvotes || []
      const hasUpvoted = upvotes.includes(userId)
      
      if (hasUpvoted) {
        // 取消点赞
        message.upvotes = upvotes.filter(id => id !== userId)
        message.upvoteCount = Math.max(0, (message.upvoteCount || 0) - 1)
      } else {
        // 添加点赞
        message.upvotes = [...upvotes, userId]
        message.upvoteCount = (message.upvoteCount || 0) + 1
      }
      
      await message.save()
      
      // 通过 Socket.IO 通知
      const io = req.app.get('io')
      if (io) {
        io.to(message.roomId).emit('message-updated', {
          messageId: message._id,
          upvoteCount: message.upvoteCount
        })
      }
      
      res.json({ 
        success: true, 
        upvoted: !hasUpvoted,
        upvoteCount: message.upvoteCount 
      })
    } catch (err) {
      console.error('点赞失败:', err)
      res.status(500).json({ message: '点赞失败', error: err.message })
    }
  }
  
  /**
   * 获取问题的所有答案
   */
  static async getQuestionAnswers(req, res) {
    try {
      const { questionId } = req.params
      
      const answers = await GroupMessage.find({
        solutionTo: questionId,
        isSolution: true
      }).sort({ upvoteCount: -1, time: 1 })
      
      res.json({ success: true, answers })
    } catch (err) {
      console.error('获取答案失败:', err)
      res.status(500).json({ message: '获取失败', error: err.message })
    }
  }
}

module.exports = QuestionController
