const Msg = require("../models/Messages");
const Users = require("../models/Users");

class ChatController {
  // 搜索用户
  static async searchUsers(req, res) {
    const { keyword, page = 1, limit = 20 } = req.query;
    
    try {
      if (!keyword || keyword.trim() === '') {
        return res.status(400).json({ 
          success: false,
          message: "搜索关键词不能为空" 
        });
      }

      const skip = (page - 1) * limit;
      
      const userQuery = {
        $or: [
          { uName: { $regex: keyword, $options: 'i' } },
          { email: { $regex: keyword, $options: 'i' } }
        ]
      };
      
      const users = await Users.find(userQuery)
        .select('uName email uAvatar')
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await Users.countDocuments(userQuery);

      const userResults = users.map(user => {
        if (user.uName && user.uName.toLowerCase().includes(keyword.toLowerCase())) {
          const regex = new RegExp(`(${keyword})`, 'gi');
          user.highlightedName = user.uName.replace(regex, '<mark>$1</mark>');
        }
        user.resultType = 'user';
        return user;
      });

      res.json({
        success: true,
        data: {
          results: userResults,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(total / limit),
            count: total,
            limit: parseInt(limit)
          }
        }
      });
    } catch (err) {
      console.error("搜索用户失败", err);
      res.status(500).json({ 
        success: false,
        message: "服务器内部错误" 
      });
    }
  }

  // 搜索聊天记录
  static async searchMessages(req, res) {
    const { keyword, page = 1, limit = 20, targetUser } = req.query;
    const currentUserId = req.user.userId;
    
    try {
      if (!keyword || keyword.trim() === '') {
        return res.status(400).json({ 
          success: false,
          message: "搜索关键词不能为空" 
        });
      }

      const skip = (page - 1) * limit;
      
      let searchQuery = {
        $and: [
          {
            $or: [
              { from: currentUserId },
              { to: currentUserId }
            ]
          },
          {
            $or: [
              { content: { $regex: keyword, $options: 'i' } },
              { 'fileInfo.fileName': { $regex: keyword, $options: 'i' } }
            ]
          }
        ]
      };

      if (targetUser) {
        searchQuery.$and.push({
          $or: [
            { from: targetUser, to: currentUserId },
            { from: currentUserId, to: targetUser }
          ]
        });
      }

      const messages = await Msg.find(searchQuery)
        .sort({ time: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const total = await Msg.countDocuments(searchQuery);

      const messageResults = await Promise.all(messages.map(async (message) => {
        const senderInfo = await Users.findOne({ uID: message.from }, { uName: 1, uAvatar: 1 });
        const receiverInfo = await Users.findOne({ uID: message.to }, { uName: 1, uAvatar: 1 });

        if (message.content && message.content.toLowerCase().includes(keyword.toLowerCase())) {
          const regex = new RegExp(`(${keyword})`, 'gi');
          message.highlightedContent = message.content.replace(regex, '<mark>$1</mark>');
        }

        if (message.fileInfo && message.fileInfo.fileName && 
            message.fileInfo.fileName.toLowerCase().includes(keyword.toLowerCase())) {
          const regex = new RegExp(`(${keyword})`, 'gi');
          message.fileInfo.highlightedFileName = message.fileInfo.fileName.replace(regex, '<mark>$1</mark>');
        }

        return {
          ...message,
          senderName: senderInfo ? senderInfo.uName : '未知用户',
          senderAvatar: senderInfo ? senderInfo.uAvatar : '',
          receiverName: receiverInfo ? receiverInfo.uName : '未知用户',
          resultType: 'message'
        };
      }));

      res.json({
        success: true,
        data: {
          results: messageResults,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(total / limit),
            count: total,
            limit: parseInt(limit)
          }
        }
      });
    } catch (err) {
      console.error("搜索聊天记录失败", err);
      res.status(500).json({ 
        success: false,
        message: "服务器内部错误" 
      });
    }
  }

  // 获取最后一条消息
  static async getLastMessage(req, res) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.userId;

      const lastMessage = await Msg.findOne({
        $or: [
          { from: currentUserId, to: id },
          { from: id, to: currentUserId }
        ]
      }).sort({ time: -1 });

      res.status(200).json(lastMessage);
    } catch (err) {
      console.error("获取最后一条消息失败", err);
      res.status(500).json({ message: "服务器内部错误" });
    }
  }

  // 获取聊天消息列表
  static async getMessages(req, res) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.userId;

      const messages = await Msg.find({
        $or: [
          { from: currentUserId, to: id },
          { from: id, to: currentUserId }
        ]
      }).sort({ time: 1 });

      res.status(200).json(messages);
    } catch (err) {
      console.error("获取聊天消息失败", err);
      res.status(500).json({ message: "服务器内部错误" });
    }
  }

  // 发送消息
  static async sendMessage(req, res) {
    try {
      const { id } = req.params;
      const { content, messageType = 'text', fileInfo, isForwarded = false, forwardedFrom } = req.body;
      const currentUserId = req.user.userId;

      const newMessage = new Msg({
        from: currentUserId,
        to: id,
        content: content,
        messageType: messageType,
        time: new Date(),
        fileInfo: fileInfo,
        isForwarded: isForwarded,
        forwardedFrom: forwardedFrom
      });

      const savedMessage = await newMessage.save();
      res.status(200).json({
        message: "消息发送成功",
        data: savedMessage
      });
    } catch (err) {
      console.error("发送消息失败", err);
      res.status(500).json({ message: "服务器内部错误" });
    }
  }

  // 删除单条消息
  static async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      const currentUserId = req.user.userId;

      const message = await Msg.findById(messageId);
      if (!message) {
        return res.status(404).json({ message: "消息不存在" });
      }

      if (message.from !== currentUserId && message.to !== currentUserId) {
        return res.status(403).json({ message: "无权删除此消息" });
      }

      await Msg.findByIdAndDelete(messageId);
      res.status(200).json({ message: "消息删除成功" });
    } catch (err) {
      console.error("删除消息失败", err);
      res.status(500).json({ message: "服务器内部错误" });
    }
  }

  // 删除与特定用户的所有消息
  static async deleteMessagesWithUser(req, res) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.userId;

      await Msg.deleteMany({
        $or: [
          { from: currentUserId, to: id },
          { from: id, to: currentUserId }
        ]
      });

      res.status(200).json({ message: "聊天记录删除成功" });
    } catch (err) {
      console.error("删除聊天记录失败", err);
      res.status(500).json({ message: "服务器内部错误" });
    }
  }

  // 批量删除消息
  static async deleteMultipleMessages(req, res) {
    try {
      const { messageIds } = req.body;
      const currentUserId = req.user.userId;

      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({ message: "请提供有效的消息ID列表" });
      }

      const messages = await Msg.find({ _id: { $in: messageIds } });
      
      for (const message of messages) {
        if (message.from !== currentUserId && message.to !== currentUserId) {
          return res.status(403).json({ message: "无权删除某些消息" });
        }
      }

      await Msg.deleteMany({ _id: { $in: messageIds } });
      res.status(200).json({ message: "消息批量删除成功" });
    } catch (err) {
      console.error("批量删除消息失败", err);
      res.status(500).json({ message: "服务器内部错误" });
    }
  }
}

module.exports = ChatController;