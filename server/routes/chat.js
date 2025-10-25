const express = require('express')
const router = express.Router()
const auth = require('../middlewares/auth')
const ChatController = require('../controllers/ChatController')

// 专门的用户搜索接口
router.get("/search/users", auth, ChatController.searchUsers)

// 搜索聊天记录
router.get("/search", auth, ChatController.searchMessages)

// 获取最后一条消息
router.get("/last_message/:id", auth, ChatController.getLastMessage)

// 获取聊天消息列表
router.get("/messages/:id", auth, ChatController.getMessages)

// 发送消息
router.post("/messages/:id", auth, ChatController.sendMessage)

// 删除单条消息
router.delete("/message/:messageId", auth, ChatController.deleteMessage)

// 删除与特定用户的所有消息
router.delete("/messages/:id", auth, ChatController.deleteMessagesWithUser)

// 批量删除消息
router.delete("/messages", auth, ChatController.deleteMultipleMessages)

// 标记消息为已读
router.put("/read/:fromUserId", auth, ChatController.markMessagesAsRead)

// 获取未读消息数量
router.get("/unread/:fromUserId", auth, ChatController.getUnreadCount)

// 获取所有好友的未读消息数量
router.get("/unread", auth, ChatController.getAllUnreadCounts)

module.exports = router