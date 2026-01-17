const Favorite = require('../models/Favorite')
const Message = require('../models/Messages')
const GroupMessage = require('../models/GroupMessage')

class FavoriteController {
  /**
   * 添加收藏
   */
  static async addFavorite(req, res) {
    try {
      const userId = req.user.userId
      const { messageId, messageType, chatId, tags, note } = req.body
      
      console.log('收藏请求:', { userId, messageId, messageType, chatId })
      
      if (!messageId || !messageType || !chatId) {
        return res.status(400).json({ message: '缺少必要参数' })
      }
      
      // 检查是否已收藏
      const existing = await Favorite.findOne({ userId, messageId })
      if (existing) {
        return res.json({ 
          success: true, 
          message: '已收藏',
          favorite: existing 
        })
      }
      
      // 获取消息详情
      let messageData
      console.log('查找消息:', messageType, messageId)
      
      if (messageType === 'private') {
        messageData = await Message.findById(messageId)
      } else if (messageType === 'group' || messageType === 'chatroom') {
        messageData = await GroupMessage.findById(messageId)
      }
      
      console.log('消息数据:', messageData ? '找到' : '未找到')
      
      if (!messageData) {
        return res.status(404).json({ message: '消息不存在' })
      }
      
      // 创建收藏
      const favoriteData = {
        userId,
        messageId,
        messageType,
        chatId,
        content: messageData.content || messageData.fileInfo?.fileName || '无内容',
        contentType: messageData.messageType || 'text',
        codeInfo: messageData.codeInfo || null,
        sender: {
          id: messageData.from || messageData.senderID,
          name: messageData.fromName || messageData.senderName,
          avatar: messageData.fromAvatar || messageData.senderAvatar
        },
        tags: tags || [],
        note: note || ''
      }
      
      // 如果是图片或文件消息，添加文件信息到 content
      if (messageData.fileInfo) {
        favoriteData.fileInfo = messageData.fileInfo
      }
      
      console.log('创建收藏数据:', favoriteData)
      
      const favorite = new Favorite(favoriteData)
      await favorite.save()
      
      console.log('收藏保存成功')
      
      res.json({
        success: true,
        message: '收藏成功',
        favorite
      })
      
    } catch (err) {
      console.error('添加收藏失败:', err)
      console.error('错误堆栈:', err.stack)
      res.status(500).json({ message: '添加收藏失败', error: err.message })
    }
  }
  
  /**
   * 取消收藏
   */
  static async removeFavorite(req, res) {
    try {
      const userId = req.user.userId
      const { messageId } = req.params
      
      const result = await Favorite.findOneAndDelete({ userId, messageId })
      
      if (!result) {
        return res.status(404).json({ message: '收藏不存在' })
      }
      
      res.json({
        success: true,
        message: '取消收藏成功'
      })
      
    } catch (err) {
      console.error('取消收藏失败:', err)
      res.status(500).json({ message: '取消收藏失败', error: err.message })
    }
  }
  
  /**
   * 获取收藏列表
   */
  static async getFavorites(req, res) {
    try {
      const userId = req.user.userId
      const { messageType, contentType, search, page = 1, limit = 20 } = req.query
      
      const query = { userId }
      
      if (messageType) {
        query.messageType = messageType
      }
      
      if (contentType) {
        query.contentType = contentType
      }
      
      // 搜索功能：支持搜索内容、发送者名称、备注
      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i')
        query.$or = [
          { content: searchRegex },
          { 'sender.name': searchRegex },
          { note: searchRegex },
          { 'codeInfo.fileName': searchRegex }
        ]
      }
      
      const skip = (page - 1) * limit
      
      const [favorites, total] = await Promise.all([
        Favorite.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Favorite.countDocuments(query)
      ])
      
      // 添加聊天来源信息
      const User = require('../models/Users')
      const Room = require('../models/Room')
      
      const favoritesWithSource = await Promise.all(favorites.map(async (fav) => {
        let sourceName = '未知来源'
        
        try {
          console.log('处理收藏:', {
            messageType: fav.messageType,
            chatId: fav.chatId,
            content: fav.content?.substring(0, 20)
          })
          
          if (fav.messageType === 'private') {
            // 私聊：查找对方用户名
            const otherUser = await User.findOne({ uID: fav.chatId })
            console.log('查找私聊用户:', fav.chatId, '结果:', otherUser?.uName)
            sourceName = otherUser ? otherUser.uName : '私聊用户'
          } else if (fav.messageType === 'group') {
            // 群聊：查找群名（群聊也使用 Room 模型）
            const group = await Room.findOne({ RoomID: fav.chatId, type: 'normal' })
            console.log('查找群聊:', fav.chatId, '结果:', group?.RoomName)
            sourceName = group ? group.RoomName : '群聊'
          } else if (fav.messageType === 'chatroom') {
            // 聊天室：查找聊天室名
            const chatroom = await Room.findOne({ RoomID: fav.chatId, type: 'chatroom' })
            console.log('查找聊天室:', fav.chatId, '结果:', chatroom?.RoomName)
            sourceName = chatroom ? chatroom.RoomName : '聊天室'
          }
          
          console.log('最终来源名称:', sourceName)
        } catch (err) {
          console.error('获取来源信息失败:', err)
        }
        
        return {
          ...fav,
          sourceName
        }
      }))
      
      res.json({
        success: true,
        favorites: favoritesWithSource,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      })
      
    } catch (err) {
      console.error('获取收藏列表失败:', err)
      res.status(500).json({ message: '获取收藏列表失败', error: err.message })
    }
  }
  
  /**
   * 检查是否已收藏
   */
  static async checkFavorite(req, res) {
    try {
      const userId = req.user.userId
      const { messageId } = req.params
      
      const favorite = await Favorite.findOne({ userId, messageId })
      
      res.json({
        success: true,
        isFavorited: !!favorite,
        favorite: favorite || null
      })
      
    } catch (err) {
      console.error('检查收藏状态失败:', err)
      res.status(500).json({ message: '检查收藏状态失败', error: err.message })
    }
  }
  
  /**
   * 更新收藏（标签、备注）
   */
  static async updateFavorite(req, res) {
    try {
      const userId = req.user.userId
      const { messageId } = req.params
      const { tags, note } = req.body
      
      const favorite = await Favorite.findOne({ userId, messageId })
      
      if (!favorite) {
        return res.status(404).json({ message: '收藏不存在' })
      }
      
      if (tags !== undefined) {
        favorite.tags = tags
      }
      
      if (note !== undefined) {
        favorite.note = note
      }
      
      await favorite.save()
      
      res.json({
        success: true,
        message: '更新成功',
        favorite
      })
      
    } catch (err) {
      console.error('更新收藏失败:', err)
      res.status(500).json({ message: '更新收藏失败', error: err.message })
    }
  }
  
  /**
   * 获取收藏统计
   */
  static async getStats(req, res) {
    try {
      const userId = req.user.userId
      
      const [total, byType, byContentType] = await Promise.all([
        Favorite.countDocuments({ userId }),
        Favorite.aggregate([
          { $match: { userId } },
          { $group: { _id: '$messageType', count: { $sum: 1 } } }
        ]),
        Favorite.aggregate([
          { $match: { userId } },
          { $group: { _id: '$contentType', count: { $sum: 1 } } }
        ])
      ])
      
      res.json({
        success: true,
        stats: {
          total,
          byType: byType.reduce((acc, item) => {
            acc[item._id] = item.count
            return acc
          }, {}),
          byContentType: byContentType.reduce((acc, item) => {
            acc[item._id] = item.count
            return acc
          }, {})
        }
      })
      
    } catch (err) {
      console.error('获取收藏统计失败:', err)
      res.status(500).json({ message: '获取收藏统计失败', error: err.message })
    }
  }
}

module.exports = FavoriteController
