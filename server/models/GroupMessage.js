const mongoose = require('mongoose')

const groupMessageSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  from: { type: String, required: true }, // 发送者 userID
  fromName: { type: String, required: true }, // 发送者昵称
  fromAvatar: { type: String }, // 发送者头像
  content: { type: String },
  messageType: { 
    type: String, 
    enum: ['text', 'image', 'file', 'video', 'system', 'code', 'chatroom_invite'],
    default: 'text' 
  },
  fileInfo: {
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number
  },
  // 新增：代码消息信息
  codeInfo: {
    language: { type: String, default: 'javascript' },
    code: { type: String },
    fileName: { type: String }
  },
  // 引用消息信息
  quotedMessage: {
    id: { type: String }, // 被引用消息的ID
    content: { type: String }, // 被引用消息的内容
    fromName: { type: String }, // 被引用消息发送者名称
    messageType: { 
      type: String,
      enum: ['text', 'image', 'file', 'video', 'audio', 'code'],
      default: 'text'
    }
  },
  // 新增：问题标记
  isQuestion: { type: Boolean, default: false },
  // 新增：解决方案标记
  isSolution: { type: Boolean, default: false },
  // 新增：关联的问题ID
  solutionTo: { type: String },
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
