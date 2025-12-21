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
