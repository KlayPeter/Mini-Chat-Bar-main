const mongoose = require('mongoose')

const favoriteSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  messageId: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    enum: ['private', 'group', 'chatroom'],
    required: true
  },
  chatId: {
    type: String,
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  contentType: {
    type: String,
    enum: ['text', 'code', 'image', 'file', 'video', 'audio'],
    default: 'text'
  },
  codeInfo: {
    language: String,
    code: String,
    fileName: String
  },
  fileInfo: {
    fileName: String,
    fileUrl: String,
    fileSize: Number,
    fileType: String
  },
  sender: {
    id: String,
    name: String,
    avatar: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  tags: [{
    type: String
  }],
  note: {
    type: String,
    default: ''
  }
})

// 复合索引：用户ID + 消息ID（确保唯一性）
favoriteSchema.index({ userId: 1, messageId: 1 }, { unique: true })

// 索引：用户ID + 消息类型
favoriteSchema.index({ userId: 1, messageType: 1 })

// 索引：用户ID + 内容类型
favoriteSchema.index({ userId: 1, contentType: 1 })

module.exports = mongoose.model('Favorite', favoriteSchema)
