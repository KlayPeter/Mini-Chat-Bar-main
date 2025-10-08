// 改为支持一个用户多个连接的数据结构
const users = new Map() // userId -> Set of socket.id

module.exports = function(socket, io) {
  socket.on("login", (userId) => {
    socket.userId = userId
    console.log(`收到登录请求:${userId}`)
    
    // 支持一个用户多个连接
    if (!users.has(userId)) {
      users.set(userId, new Set())
    }
    users.get(userId).add(socket.id)
  })

  socket.on("private-message", ({to}) => {
    const targetSockets = users.get(to)
    if (targetSockets && targetSockets.size > 0) {
      // 向该用户的所有连接发送消息
      targetSockets.forEach(socketId => {
        io.to(socketId).emit('private-message',{from:socket.userId})
      })
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
        // 如果该用户没有其他连接了，删除整个用户记录
        if (socketIds.size === 0) {
          users.delete(userId)
        }
        break
      }
    }
  });
};