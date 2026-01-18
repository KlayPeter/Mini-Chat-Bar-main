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
   * 获取聊天室智能提示
   * 分析未解决问题、需要帮助的消息等
   */
  static async getRoomInsights(req, res) {
    try {
      const { roomId } = req.params
      
      if (!roomId) {
        return res.status(400).json({ message: '缺少聊天室ID' })
      }
      
      console.log(`📊 获取聊天室智能提示: ${roomId}`)
      
      // 获取所有未解决的问题
      const openQuestions = await GroupMessage.find({
        roomId: roomId,
        isQuestion: true,
        questionStatus: 'open'
      }).sort({ time: -1 }).limit(10).lean()
      
      // 获取最近 30 分钟的所有消息，用于分析热门讨论
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
      const recentMessages = await GroupMessage.find({
        roomId: roomId,
        time: { $gte: thirtyMinutesAgo },
        messageType: { $ne: 'system' }
      }).sort({ time: -1 }).lean()
      
      // 分析热门讨论话题（通过关键词和回复数）
      const topicMap = new Map()
      for (const msg of recentMessages) {
        // 提取关键词（简单实现：取前 20 个字符作为话题）
        const topic = msg.content.substring(0, 20)
        if (!topicMap.has(topic)) {
          topicMap.set(topic, {
            topic: topic,
            fullContent: msg.content,
            messageCount: 0,
            participants: new Set(),
            lastMessageTime: msg.time
          })
        }
        const topicData = topicMap.get(topic)
        topicData.messageCount++
        topicData.participants.add(msg.fromName)
      }
      
      // 找出最热门的讨论（消息数最多）
      const hotTopics = Array.from(topicMap.values())
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 3)
        .map(t => ({
          topic: t.fullContent.substring(0, 50),
          messageCount: t.messageCount,
          participantCount: t.participants.size
        }))
      
      // 分析每个问题的状态
      const insights = {
        totalOpenQuestions: openQuestions.length,
        urgentQuestions: [], // 超过30分钟无回复
        aiCanHelp: [], // AI可以帮助回答的
        recentQuestions: [], // 最近的问题
        hotTopics: hotTopics, // 热门讨论
        recentActivityCount: recentMessages.length // 最近活跃度
      }
      
      const now = new Date()
      
      for (const question of openQuestions) {
        const timeSinceAsked = now - new Date(question.time)
        const minutesSinceAsked = Math.floor(timeSinceAsked / 60000)
        
        // 获取该问题的回复数
        const replyCount = await GroupMessage.countDocuments({
          roomId: roomId,
          'quotedMessage.id': question._id.toString()
        })
        
        const questionInfo = {
          id: question._id,
          content: question.content.substring(0, 100),
          fromName: question.fromName,
          minutesAgo: minutesSinceAsked,
          replyCount: replyCount
        }
        
        // 超过30分钟无回复的紧急问题
        if (minutesSinceAsked > 30 && replyCount === 0) {
          insights.urgentQuestions.push(questionInfo)
        }
        
        // AI可以帮助的问题（包含技术关键词）
        const techKeywords = ['如何', '怎么', '为什么', '报错', 'error', 'bug', '不work', '不生效']
        if (techKeywords.some(keyword => question.content.includes(keyword))) {
          insights.aiCanHelp.push(questionInfo)
        }
        
        // 最近10分钟的问题
        if (minutesSinceAsked <= 10) {
          insights.recentQuestions.push(questionInfo)
        }
      }
      
      // 生成 AI 播报文本
      let aiSpeech = ''
      if (insights.totalOpenQuestions === 0) {
        aiSpeech = '当前没有未解决的问题，大家讨论得很顺利！'
      } else {
        aiSpeech = `当前有 ${insights.totalOpenQuestions} 个未解决的问题`
        if (insights.urgentQuestions.length > 0) {
          aiSpeech += `，其中 ${insights.urgentQuestions.length} 个超过 30 分钟无人回复`
        }
      }
      
      if (hotTopics.length > 0) {
        const hottest = hotTopics[0]
        aiSpeech += `。最近讨论最激烈的是"${hottest.topic}"，已有 ${hottest.messageCount} 条消息，${hottest.participantCount} 人参与`
      }
      
      // 生成智能提示文本
      let suggestions = []
      
      if (insights.urgentQuestions.length > 0) {
        suggestions.push({
          type: 'urgent',
          text: `${insights.urgentQuestions.length} 个问题超过 30 分钟无人回复`,
          action: 'show_questions',
          questions: insights.urgentQuestions
        })
      }
      
      if (insights.aiCanHelp.length > 0) {
        suggestions.push({
          type: 'ai_help',
          text: `AI 可以帮助回答 ${insights.aiCanHelp.length} 个问题`,
          action: 'ai_answer',
          questions: insights.aiCanHelp
        })
      }
      
      if (insights.totalOpenQuestions > 0) {
        suggestions.push({
          type: 'open_questions',
          text: `检测到 ${insights.totalOpenQuestions} 个未解决问题`,
          action: 'show_all',
          count: insights.totalOpenQuestions
        })
      }
      
      if (hotTopics.length > 0) {
        suggestions.push({
          type: 'hot_topic',
          text: `热门讨论：${hotTopics[0].topic}`,
          action: 'view_topic',
          topics: hotTopics
        })
      }
      
      console.log(`✅ 智能提示生成成功: ${suggestions.length} 条建议`)
      
      res.json({
        success: true,
        insights: insights,
        suggestions: suggestions,
        aiSpeech: aiSpeech // AI 播报文本
      })
      
    } catch (err) {
      console.error('❌ 获取智能提示失败:', err)
      res.status(500).json({ 
        message: '获取智能提示失败',
        error: err.message 
      })
    }
  }
  
  /**
   * AI 主动回答问题
   */
  static async proactiveAnswer(req, res) {
    try {
      const { roomId, questionId } = req.body
      
      if (!roomId || !questionId) {
        return res.status(400).json({ message: '缺少必要参数' })
      }
      
      // 获取问题消息
      const question = await GroupMessage.findById(questionId)
      if (!question) {
        return res.status(404).json({ message: '问题不存在' })
      }
      
      // 调用 askAI 方法回答问题
      req.body.question = question.content
      req.body.useRAG = true
      
      return await ChatRoomAIController.askAI(req, res)
      
    } catch (err) {
      console.error('❌ AI 主动回答失败:', err)
      res.status(500).json({ 
        message: 'AI 主动回答失败',
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
