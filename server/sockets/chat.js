// 改为支持一个用户多个连接的数据结构
const users = new Map() // userId -> Set of socket.id
const onlineUsers = new Set() // 在线用户ID集合

module.exports = function(socket, io) {
  socket.on("login", (userId) => {
    socket.userId = userId
    console.log(`收到登录请求:${userId}`)
    
    // 支持一个用户多个连接
    if (!users.has(userId)) {
      users.set(userId, new Set())
    }
    users.get(userId).add(socket.id)
    
    // 标记用户在线
    const wasOffline = !onlineUsers.has(userId)
    onlineUsers.add(userId)
    
    // 如果用户之前离线，现在上线，通知所有人
    if (wasOffline) {
      console.log(`用户 ${userId} 上线`)
      io.emit('user-online-notification', userId)
    }
    
    // 发送当前在线用户列表给新登录的用户
    socket.emit('online-users-update', Array.from(onlineUsers))
  })
  
  // 用户主动上线
  socket.on('user-online', (userId) => {
    if (userId && !onlineUsers.has(userId)) {
      onlineUsers.add(userId)
      console.log(`用户 ${userId} 上线`)
      io.emit('user-online-notification', userId)
    }
  })
  
  // 用户主动离线
  socket.on('user-offline', (userId) => {
    if (userId && onlineUsers.has(userId)) {
      onlineUsers.delete(userId)
      console.log(`用户 ${userId} 离线`)
      io.emit('user-offline-notification', userId)
    }
  })

  socket.on("private-message", (data) => {
    const { to, from, content, messageType, timestamp } = data;
    const senderId = from || socket.userId;
    
    const messageData = {
      from: senderId,
      to: to,
      content: content,
      messageType: messageType,
      timestamp: timestamp
    };
    
    console.log(`转发消息通知: ${senderId} -> ${to}`, messageData);
    
    const targetSockets = users.get(to);
    if (targetSockets && targetSockets.size > 0) {
      // 向接收者的所有连接发送消息
      targetSockets.forEach(socketId => {
        io.to(socketId).emit('private-message', messageData);
      });
    }
    
    // 同时通知发送者自己的所有连接（包括当前连接，用于更新LastChats）
    const senderSockets = users.get(senderId);
    if (senderSockets && senderSockets.size > 0) {
      senderSockets.forEach(socketId => {
        io.to(socketId).emit('private-message', messageData);
      });
    }
  })

  socket.on("private-file-message", async ({ to, fileUrl, fileName, fileType, messageType }) => {
    const targetSockets = users.get(to);
    if (targetSockets && targetSockets.size > 0) {
      console.log(`用户 ${socket.userId} 发送${messageType === 'image' ? '图片' : '文件'}: ${fileName} (${fileUrl}) 给用户 ID: ${to}`);
      // 向该用户的所有连接发送消息
      targetSockets.forEach(socketId => {
        io.to(socketId).emit("private-file-message", {
          from: socket.userId,
          fileUrl,
          fileName,
          fileType,
          messageType
        });
      })
    } else {
      console.log(`用户 ${to} 不在线或未登录，无法发送文件消息。`);
    }
  });

  // 处理单条消息删除事件
  socket.on("message-deleted", ({ messageId, chatWith }) => {
    const targetSockets = users.get(chatWith);
    if (targetSockets && targetSockets.size > 0) {
      console.log(`用户 ${socket.userId} 删除了消息 ${messageId}`);
      targetSockets.forEach(socketId => {
        io.to(socketId).emit("message-deleted", {
          messageId,
          chatWith: socket.userId
        });
      })
    }
  });

  // 处理批量消息删除事件
  socket.on("messages-deleted", ({ messageIds, chatWith }) => {
    const targetSockets = users.get(chatWith);
    if (targetSockets && targetSockets.size > 0) {
      console.log(`用户 ${socket.userId} 删除了 ${messageIds.length} 条消息`);
      targetSockets.forEach(socketId => {
        io.to(socketId).emit("messages-deleted", {
          messageIds,
          chatWith: socket.userId
        });
      })
    }
  });

  // 处理头像更新事件
  socket.on('avatar-updated', (data) => {
    const { userId: updatedUserId, newAvatarUrl } = data;
    
    // 广播给所有在线用户（除了发送者自己）
    socket.broadcast.emit('avatar-updated', {
      userId: updatedUserId,
      newAvatarUrl: newAvatarUrl
    });
  });

  // 处理刷新好友列表事件（转发消息后触发）
  socket.on('refresh-friend-list', () => {
    // 广播给所有在线用户刷新好友列表
    io.emit('refresh-friend-list');
  });



  socket.on("disconnect", async () => {
    console.log("用户断开 ->", socket.id);

    //用户下线之后及时清理出去
    for (const [userId, socketIds] of users) {
      if (socketIds.has(socket.id)) {
        socketIds.delete(socket.id)
        // 如果该用户没有其他连接了，删除整个用户记录并标记离线
        if (socketIds.size === 0) {
          users.delete(userId)
          
          // 标记用户离线
          if (onlineUsers.has(userId)) {
            onlineUsers.delete(userId)
            console.log(`用户 ${userId} 离线（所有连接断开）`)
            io.emit('user-offline-notification', userId)
          }
        }
        break
      }
    }
  });
};