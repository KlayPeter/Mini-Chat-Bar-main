const mongoose = require("mongoose");

// AI对话历史模型
const conversationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['default', 'assistant', 'teacher', 'friend', 'programmer', 'writer', 'psychologist', 'custom'],
    default: 'default'
  },
  rolePrompt: {
    type: String,
    default: ''
  },
  messages: [{
    role: {
      type: String,
      enum: ['system', 'user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时间中间件
conversationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 限制消息历史长度（保留最近30条）
conversationSchema.methods.trimMessages = function(maxLength = 30) {
  if (this.messages.length > maxLength) {
    // 保留系统提示词 + 最近的消息
    const systemMessages = this.messages.filter(m => m.role === 'system');
    const otherMessages = this.messages.filter(m => m.role !== 'system');
    this.messages = [
      ...systemMessages,
      ...otherMessages.slice(-maxLength)
    ];
  }
};

module.exports = mongoose.model('AIConversation', conversationSchema);

