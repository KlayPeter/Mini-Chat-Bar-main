/**
 * DatabaseTool - 数据库查询工具
 * 
 * 提供消息查询、用户查询等数据库操作
 */

const Message = require('../models/Message');
const GroupMessage = require('../models/GroupMessage');
const User = require('../models/User');
const Room = require('../models/Room');

class DatabaseTool {
  /**
   * 获取私聊消息
   * @param {Object} params
   * @param {string} params.userId - 当前用户 ID
   * @param {string} params.targetId - 对方用户 ID
   * @param {Object} params.timeRange - 时间范围 { start, end }
   * @param {number} params.limit - 限制数量
   */
  static async getPrivateMessages({ userId, targetId, timeRange, limit = 100 }) {
    const query = {
      $or: [
        { from: userId, to: targetId },
        { from: targetId, to: userId }
      ]
    };

    // 添加时间范围
    if (timeRange) {
      query.time = {};
      if (timeRange.start) {
        query.time.$gte = new Date(timeRange.start);
      }
      if (timeRange.end) {
        query.time.$lte = new Date(timeRange.end);
      }
    }

    const messages = await Message.find(query)
      .sort({ time: 1 })
      .limit(limit)
      .lean();

    return messages;
  }

  /**
   * 获取群聊消息
   * @param {Object} params
   * @param {string} params.roomId - 群 ID
   * @param {Object} params.timeRange - 时间范围
   * @param {number} params.limit - 限制数量
   */
  static async getGroupMessages({ roomId, timeRange, limit = 100 }) {
    const query = { roomId };

    if (timeRange) {
      query.time = {};
      if (timeRange.start) {
        query.time.$gte = new Date(timeRange.start);
      }
      if (timeRange.end) {
        query.time.$lte = new Date(timeRange.end);
      }
    }

    const messages = await GroupMessage.find(query)
      .sort({ time: 1 })
      .limit(limit)
      .lean();

    return messages;
  }

  /**
   * 获取用户信息
   * @param {string} userId - 用户 ID
   */
  static async getUserInfo(userId) {
    const user = await User.findOne({ uID: userId }).lean();
    return user;
  }

  /**
   * 获取多个用户信息
   * @param {Array} userIds - 用户 ID 数组
   */
  static async getUsersInfo(userIds) {
    const users = await User.find({ uID: { $in: userIds } }).lean();
    return users;
  }

  /**
   * 获取群信息
   * @param {string} roomId - 群 ID
   */
  static async getRoomInfo(roomId) {
    const room = await Room.findOne({ RoomID: roomId }).lean();
    return room;
  }

  /**
   * 统计消息数据
   * @param {Array} messages - 消息数组
   */
  static analyzeMessages(messages) {
    if (!messages || messages.length === 0) {
      return {
        totalCount: 0,
        participants: [],
        timeRange: null,
        messageTypes: {}
      };
    }

    // 统计参与者
    const participantSet = new Set();
    messages.forEach(m => {
      participantSet.add(m.from);
      if (m.senderName) participantSet.add(m.senderName);
    });

    // 统计消息类型
    const messageTypes = {};
    messages.forEach(m => {
      const type = m.messageType || 'text';
      messageTypes[type] = (messageTypes[type] || 0) + 1;
    });

    // 时间范围
    const times = messages.map(m => new Date(m.time).getTime());
    const timeRange = {
      start: new Date(Math.min(...times)),
      end: new Date(Math.max(...times))
    };

    return {
      totalCount: messages.length,
      participants: Array.from(participantSet),
      participantCount: participantSet.size,
      timeRange,
      messageTypes
    };
  }
}

module.exports = DatabaseTool;
