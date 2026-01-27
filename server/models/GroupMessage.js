const mongoose = require('mongoose')

const groupMessageSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  from: { type: String, required: true }, // 发送者 userID
  fromName: { type: String, required: true }, // 发送者昵称
  fromAvatar: { type: String }, // 发送者头像
  content: { type: String },
  messageType: { 
    type: String, 
    enum: ['text', 'image', 'file', 'video', 'audio', 'system', 'code', 'chatroom_invite'],
    default: 'text' 
  },
  fileInfo: {
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number,
    duration: Number // 语音/视频时长（秒）
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
  // 问题标记
  isQuestion: { type: Boolean, default: false },
  questionStatus: { 
    type: String, 
    enum: ['open', 'solved', 'closed'],
    default: 'open'
  },
  // 解决方案标记
  isSolution: { type: Boolean, default: false },
  solutionTo: { type: String }, // 关联的问题消息ID
  // 最佳答案
  bestAnswer: { type: String }, // 最佳答案消息ID
  // 点赞/投票
  upvotes: [{ type: String }], // 点赞用户ID列表
  upvoteCount: { type: Number, default: 0 },
  // Emoji 反应
  reactions: [{
    emoji: { type: String, required: true }, // emoji 类型：thumbsup, heart, party, bulb, question
    userId: { type: String, required: true }, // 反应的用户ID
    userName: { type: String }, // 用户名
    createdAt: { type: Date, default: Date.now }
  }],
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
