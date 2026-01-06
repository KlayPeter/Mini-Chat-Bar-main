const mongoose = require('mongoose')

const groupMessageSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  from: { type: String, required: true }, // 发送者 userID
  fromName: { type: String, required: true }, // 发送者昵称
  fromAvatar: { type: String }, // 发送者头像
  content: { type: String },
  messageType: { 
    type: String, 
    enum: ['text', 'image', 'file', 'video', 'system'],
    default: 'text' 
  },
  fileInfo: {
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number
  },
  // 引用消息信息
  quotedMessage: {
    id: { type: String }, // 被引用消息的ID
    content: { type: String }, // 被引用消息的内容
    fromName: { type: String }, // 被引用消息发送者名称
    messageType: { 
      type: String,
      enum: ['text', 'image', 'file', 'video', 'audio'],
      default: 'text'
    }
  },
  time: { type: Date, default: Date.now, index: true },
  status: { 
    type: String, 
    enum: ['sent', 'delivered'],
    default: 'sent' 
  }
})

// 复合索引，用于查询群聊消息
groupMessageSchema.index({ roomId: 1, time: -1 })

module.exports = mongoose.model('GroupMessage', groupMessageSchema)
