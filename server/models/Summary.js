/**
 * Summary - 聊天总结数据模型
 */

const mongoose = require('mongoose');

const SummarySchema = new mongoose.Schema({
  // 创建者
  userId: {
    type: String,
    required: true,
    index: true
  },

  // 聊天类型
  chatType: {
    type: String,
    enum: ['private', 'group'],
    required: true
  },

  // 目标 ID（私聊为对方用户 ID，群聊为群 ID）
  targetId: {
    type: String,
    required: true,
    index: true
  },

  // 总结内容
  summary: {
    title: String,
    overview: String,
    keyPoints: [String],
    conclusions: [String],
    actionItems: [{
      task: String,
      assignee: String,
      deadline: String
    }],
    technicalTerms: [{
      term: String,
      context: String
    }]
  },

  // 统计信息
  statistics: {
    totalCount: Number,
    participantCount: Number,
    participants: [String],
    timeRange: {
      start: Date,
      end: Date
    },
    messageTypes: mongoose.Schema.Types.Mixed
  },

  // 消息数量
  messageCount: {
    type: Number,
    default: 0
  },

  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// 复合索引
SummarySchema.index({ userId: 1, chatType: 1, targetId: 1 });
SummarySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Summary', SummarySchema);
