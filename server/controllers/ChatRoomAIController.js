const axios = require('axios')
const GroupMessage = require('../models/GroupMessage')
const Room = require('../models/Room')
const VectorSearchTool = require('../tools/VectorSearchTool')

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

/**
 * 聊天室 AI 智能助手控制器
 */
class ChatRoomAIController {
  
  /**
   * @AI 问答 - 在聊天室中回答技术问题
   */
  static async askAI(req, res) {
    try {
      const { roomId, question, useRAG = true } = req.body
      const userId = req.user.userId
      
      if (!roomId || !question) {
        return res.status(400).json({ message: '缺少必要参数' })
      }
      
      if (!DEEPSEEK_API_KEY) {
        return res.status(500).json({ message: 'DeepSeek API Key 未配置' })
      }
      
      // 获取聊天室信息
      const room = await Room.findOne({ RoomID: roomId })
      if (!room) {
        return res.status(404).json({ message: '聊天室不存在' })
      }
      
      console.log(`🤖 AI 问答请求: 聊天室=${room.RoomName}, 问题=${question}`)
      
      // 构建上下文
      let context = `你是一个专业的技术助手，正在帮助解答 "${room.RoomName}" 聊天室中的技术问题。\n`
      context += `聊天室技术方向: ${room.techDirection || '通用'}\n\n`
      
      // 如果启用 RAG，检索相关历史消息
      let sources = []
      if (useRAG) {
        try {
          const searchResults = await VectorSearchTool.search({
            query: question,
            chatType: 'group',
            chatId: roomId,
            topK: 5
          })
          
          if (searchResults && searchResults.length > 0) {
            context += `以下是聊天室中相关的历史讨论:\n\n`
            searchResults.forEach((result, index) => {
              context += `[${index + 1}] ${result.sender}: ${result.content}\n`
              sources.push({
                sender: result.sender,
                content: result.content.substring(0, 100),
                relevance: result.relevance
              })
            })
            context += `\n`
          }
        } catch (err) {
          console.warn('RAG 检索失败，继续使用基础模式:', err.message)
        }
      }
      
      context += `用户问题: ${question}\n\n`
      context += `请提供专业、准确的技术回答。如果涉及代码，请给出具体示例。`
      
      // 调用 DeepSeek API
      const aiResponse = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: '你是一个专业的技术助手，擅长解答编程和技术问题。' },
            { role: 'user', content: context }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          stream: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          },
          timeout: 60000
        }
      )
      
      const aiAnswer = aiResponse.data.choices[0]?.message?.content || '抱歉，AI 暂时无法回答这个问题。'
      
      console.log(`✅ AI 回答生成成功，长度: ${aiAnswer.length}`)
      
      // 保存 AI 消息到数据库
      const aiMessage = new GroupMessage({
        roomId: roomId,
        from: 'AI',
        fromName: 'AI 助手',
        fromAvatar: '/images/ai-avatar.png',
        content: aiAnswer,
        messageType: 'text',
        time: new Date()
      })
      
      await aiMessage.save()
      
      // 通过 Socket.IO 实时推送给所有成员
      const io = req.app.get('io')
      if (io) {
        io.to(roomId).emit('group-message', {
          roomId: roomId,
          from: 'AI',
          fromName: 'AI 助手',
          fromAvatar: '/images/ai-avatar.png',
          content: aiAnswer,
          messageType: 'text',
          time: new Date(),
          _id: aiMessage._id,
          isAI: true
        })
      }
      
      res.json({
        success: true,
        message: 'AI 回答已生成',
        answer: aiAnswer,
        sources: sources,
        messageId: aiMessage._id
      })
      
    } catch (err) {
      console.error('❌ AI 问答失败:', err)
      console.error('错误详情:', err.response?.data || err.message)
      res.status(500).json({ 
        message: 'AI 问答失败',
        error: err.response?.data || err.message 
      })
    }
  }
  
  /**
   * 代码智能分析
   */
  static async analyzeCode(req, res) {
    try {
      const { roomId, code, language } = req.body
      
      if (!roomId || !code) {
        return res.status(400).json({ message: '缺少必要参数' })
      }
      
      console.log(`🔍 代码分析请求: 语言=${language}, 长度=${code.length}`)
      
      // 构建分析提示
      const prompt = `请分析以下${language || ''}代码，提供：
1. 代码功能说明
2. 潜在问题和改进建议
3. 最佳实践建议

代码:
\`\`\`${language || ''}
${code}
\`\`\`

请用简洁专业的语言回答。`
      
      // 调用 DeepSeek API
      const aiResponse = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: '你是一个专业的代码审查专家，擅长分析代码质量和提供改进建议。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          stream: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          },
          timeout: 60000
        }
      )
      
      const analysis = aiResponse.data.choices[0]?.message?.content || '代码分析失败'
      
      res.json({
        success: true,
        analysis: analysis
      })
      
    } catch (err) {
      console.error('❌ 代码分析失败:', err)
      res.status(500).json({ 
        message: '代码分析失败',
        error: err.message 
      })
    }
  }
  
  /**
   * 查找相似问题
   */
  static async findSimilarQuestions(req, res) {
    try {
      const { roomId, question } = req.query
      
      if (!roomId || !question) {
        return res.status(400).json({ message: '缺少必要参数' })
      }
      
      // 使用向量搜索查找相似问题
      const results = await VectorSearchTool.search({
        query: question,
        chatType: 'group',
        chatId: roomId,
        topK: 10
      })
      
      // 过滤出问题类型的消息（包含问号或特定关键词）
      const questions = results.filter(r => 
        r.content.includes('?') || 
        r.content.includes('？') ||
        r.content.includes('如何') ||
        r.content.includes('怎么') ||
        r.content.includes('为什么')
      )
      
      res.json({
        success: true,
        questions: questions.slice(0, 5)
      })
      
    } catch (err) {
      console.error('❌ 查找相似问题失败:', err)
      res.status(500).json({ 
        message: '查找相似问题失败',
        error: err.message 
      })
    }
  }
  
  /**
   * 生成讨论总结
   */
  static async generateSummary(req, res) {
    try {
      const { roomId, messageCount = 50 } = req.body
      const userId = req.user.userId
      
      if (!roomId) {
        return res.status(400).json({ message: '缺少聊天室ID' })
      }
      
      // 获取最近的消息
      const messages = await GroupMessage.find({ roomId: roomId })
        .sort({ time: -1 })
        .limit(messageCount)
        .lean()
      
      if (messages.length === 0) {
        return res.json({
          success: true,
          summary: '暂无讨论内容'
        })
      }
      
      // 构建总结提示
      let prompt = `请总结以下技术讨论的要点:\n\n`
      messages.reverse().forEach(msg => {
        if (msg.messageType === 'text' || msg.messageType === 'code') {
          prompt += `${msg.fromName}: ${msg.content.substring(0, 200)}\n`
        }
      })
      prompt += `\n请提供：
1. 主要讨论话题
2. 关键技术点
3. 解决方案总结
4. 待解决问题`
      
      // 调用 DeepSeek API
      const aiResponse = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: '你是一个专业的技术讨论总结专家，擅长提炼关键信息。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          stream: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          },
          timeout: 60000
        }
      )
      
      const summary = aiResponse.data.choices[0]?.message?.content || '总结生成失败'
      
      res.json({
        success: true,
        summary: summary,
        messageCount: messages.length
      })
      
    } catch (err) {
      console.error('❌ 生成总结失败:', err)
      res.status(500).json({ 
        message: '生成总结失败',
        error: err.message 
      })
    }
  }
}

module.exports = ChatRoomAIController
