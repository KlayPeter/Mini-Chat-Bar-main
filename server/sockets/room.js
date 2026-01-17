const Room = require("../models/Room")
const GroupMessage = require("../models/GroupMessage")

// 消息索引服务
const messageIndexer = require('../services/MessageIndexer')

// 全局房间用户管理 - 改为存储 userId 而不是 socket.id
const roomUsers = new Map(); // roomId -> Set of userId

// 主函数
const roomSocketHandler = function(socket, io) {
  
  // 加入房间（简化版，用于聊天室）
  socket.on("join-room", (roomId) => {
    socket.join(roomId)
    console.log(`🏠 加入聊天室: ${roomId}, Socket ID: ${socket.id}`)
  })
  
  // 离开房间
  socket.on("leave-room", (roomId) => {
    socket.leave(roomId)
    console.log(`🚪 离开聊天室: ${roomId}, Socket ID: ${socket.id}`)
  })
  
  // 加入群聊房间
  socket.on("join-group", async ({ roomId, userId }) => {
    try {
      socket.userId = userId
      socket.currentRoom = roomId
      
      // 加入 Socket.IO 房间
      socket.join(roomId)
      
      // 记录用户连接 - 使用 userId 而不是 socket.id
      if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, new Set())
      }
      roomUsers.get(roomId).add(userId)
      
      console.log(`用户 [${userId}] 加入群聊 [${roomId}]`)
      
      // 通知其他成员
      socket.to(roomId).emit("member-joined", {
        userId: userId,
        timestamp: new Date()
      })
      
      // 返回当前在线成员数（按 userId 去重）
      const onlineCount = roomUsers.get(roomId).size
      io.to(roomId).emit("online-count", { roomId: roomId, count: onlineCount })
      
      // 同时广播给所有客户端（用于更新聊天室列表）
      io.emit("chatroom-online-update", { roomId: roomId, count: onlineCount })
      
    } catch (err) {
      console.error("加入群聊失败:", err)
      socket.emit("error", { message: "加入群聊失败" })
    }
  })
  
  // 离开群聊房间
  socket.on("leave-group", ({ roomId, userId }) => {
    socket.leave(roomId)
    
    // 从房间用户列表中移除该用户
    if (roomUsers.has(roomId)) {
      roomUsers.get(roomId).delete(userId)
      if (roomUsers.get(roomId).size === 0) {
        roomUsers.delete(roomId)
      }
    }
    
    console.log(`用户 [${userId}] 离开群聊 [${roomId}]`)
    
    // 通知其他成员
    socket.to(roomId).emit("member-left", {
      userId: userId,
      timestamp: new Date()
    })
    
    // 更新在线人数
    const onlineCount = roomUsers.has(roomId) ? roomUsers.get(roomId).size : 0
    io.to(roomId).emit("online-count", { roomId: roomId, count: onlineCount })
    
    // 同时广播给所有客户端（用于更新聊天室列表）
    io.emit("chatroom-online-update", { roomId: roomId, count: onlineCount })
  })
  
  // 发送群消息
  socket.on("group-message", async (data) => {
    try {
      // 如果消息中没有头像信息，从数据库获取
      let fromAvatar = data.fromAvatar
      if (!fromAvatar && data.from && data.from !== 'system') {
        try {
          const Users = require('../models/Users')
          const user = await Users.findOne({ uID: data.from })
          if (user) {
            fromAvatar = user.uAvatar
          }
        } catch (err) {
          console.error('获取用户头像失败:', err)
        }
      }

      // 广播数据，确保包含头像
      const broadcastData = {
        ...data,
        fromAvatar: fromAvatar || '/images/avatar/default-avatar.webp',
        timestamp: new Date()
      }
      
      io.to(data.roomId).emit("group-message", broadcastData)
      
      // 异步索引消息（不阻塞消息发送）
      if (data.messageType === 'text' && data.content) {
        messageIndexer.addToQueue({
          content: data.content,
          senderName: data.senderName,
          from: data.senderId,
          roomId: data.roomId,
          time: broadcastData.timestamp,
          messageType: 'text'
        });
      }
      
    } catch (err) {
      console.error("发送群消息失败:", err)
      socket.emit("error", { message: "发送消息失败" })
    }
  })
  
  // 群消息已读
  socket.on("group-message-read", ({ roomId, messageId, userId }) => {
    socket.to(roomId).emit("group-message-read", {
      messageId,
      userId,
      timestamp: new Date()
    })
  })
  
  // 有人正在输入
  socket.on("group-typing", ({ roomId, userId, userName }) => {
    socket.to(roomId).emit("group-typing", {
      userId,
      userName,
      timestamp: new Date()
    })
  })
  
  // 停止输入
  socket.on("group-stop-typing", ({ roomId, userId }) => {
    socket.to(roomId).emit("group-stop-typing", {
      userId,
      timestamp: new Date()
    })
  })
  
  // 群消息撤回
  socket.on("group-message-recall", async ({ roomId, messageId }) => {
    try {
      // 删除消息
      await GroupMessage.deleteOne({ _id: messageId })
      
      // 通知所有成员
      io.to(roomId).emit("group-message-recalled", {
        messageId,
        timestamp: new Date()
      })
      
    } catch (err) {
      console.error("撤回消息失败:", err)
      socket.emit("error", { message: "撤回消息失败" })
    }
  })
  
  // 断开连接
  socket.on("disconnect", () => {
    console.log("用户断开连接 ->", socket.id)
    
    // 清理房间用户记录 - 使用 userId
    const roomId = socket.currentRoom
    const userId = socket.userId
    
    if (roomId && userId && roomUsers.has(roomId)) {
      roomUsers.get(roomId).delete(userId)
      
      if (roomUsers.get(roomId).size === 0) {
        roomUsers.delete(roomId)
      } else {
        // 更新在线人数
        const onlineCount = roomUsers.get(roomId).size
        io.to(roomId).emit("online-count", { roomId: roomId, count: onlineCount })
        
        // 同时广播给所有客户端（用于更新聊天室列表）
        io.emit("chatroom-online-update", { roomId: roomId, count: onlineCount })
      }
    }
  })
}

// 导出主函数和 roomUsers
module.exports = roomSocketHandler
module.exports.roomUsers = roomUsers
