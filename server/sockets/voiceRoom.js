// 语音聊天室 Socket.io 事件处理
const User = require('../models/Users')

// 存储每个房间的参与者信息
const voiceRooms = new Map()

module.exports = (socket, io) => {
  // 加入语音房间
  socket.on('join-voice-room', async (data) => {
    const { roomId, userId } = data

    try {
      // 获取用户信息
      const user = await User.findOne({ uID: userId })
      if (!user) {
        console.error('用户不存在:', userId)
        return
      }

      // 加入 Socket.io 房间
      socket.join(`voice-${roomId}`)

      // 初始化房间参与者列表
      if (!voiceRooms.has(roomId)) {
        voiceRooms.set(roomId, new Map())
      }

      const roomParticipants = voiceRooms.get(roomId)

      // 添加参与者
      roomParticipants.set(userId, {
        userId: userId,
        userName: user.uName,
        socketId: socket.id,
        audioEnabled: false,
        isSpeaking: false
      })

      // 通知房间内所有人更新参与者列表
      const participants = Array.from(roomParticipants.values())
      io.to(`voice-${roomId}`).emit('voice-room-participants', {
        participants
      })

      // 通知其他人有新用户加入
      socket.to(`voice-${roomId}`).emit('voice-user-joined', {
        userId: userId,
        userName: user.uName
      })
    } catch (error) {
      console.error('加入语音房间失败:', error)
    }
  })

  // 离开语音房间
  socket.on('leave-voice-room', (data) => {
    const { roomId, userId } = data

    try {
      // 离开 Socket.io 房间
      socket.leave(`voice-${roomId}`)

      // 从参与者列表中移除
      if (voiceRooms.has(roomId)) {
        const roomParticipants = voiceRooms.get(roomId)
        roomParticipants.delete(userId)

        // 如果房间为空，删除房间
        if (roomParticipants.size === 0) {
          voiceRooms.delete(roomId)
        } else {
          // 通知房间内其他人更新参与者列表
          const participants = Array.from(roomParticipants.values())
          io.to(`voice-${roomId}`).emit('voice-room-participants', {
            participants
          })
        }

        // 通知其他人有用户离开
        socket.to(`voice-${roomId}`).emit('voice-user-left', {
          userId: userId
        })
      }
    } catch (error) {
      console.error('离开语音房间失败:', error)
    }
  })

  // WebRTC Offer
  socket.on('voice-offer', (data) => {
    const { roomId, from, to, offer } = data

    // 转发 offer 给目标用户
    const roomParticipants = voiceRooms.get(roomId)
    if (roomParticipants && roomParticipants.has(to)) {
      const targetSocketId = roomParticipants.get(to).socketId
      io.to(targetSocketId).emit('voice-offer', {
        from,
        offer
      })
    }
  })

  // WebRTC Answer
  socket.on('voice-answer', (data) => {
    const { roomId, from, to, answer } = data

    // 转发 answer 给目标用户
    const roomParticipants = voiceRooms.get(roomId)
    if (roomParticipants && roomParticipants.has(to)) {
      const targetSocketId = roomParticipants.get(to).socketId
      io.to(targetSocketId).emit('voice-answer', {
        from,
        answer
      })
    }
  })

  // ICE Candidate
  socket.on('voice-ice-candidate', (data) => {
    const { roomId, from, to, candidate } = data

    // 转发 ICE candidate 给目标用户
    const roomParticipants = voiceRooms.get(roomId)
    if (roomParticipants && roomParticipants.has(to)) {
      const targetSocketId = roomParticipants.get(to).socketId
      io.to(targetSocketId).emit('voice-ice-candidate', {
        from,
        candidate
      })
    }
  })

  // 请求房间内其他用户列表
  socket.on('voice-request-peers', (data) => {
    const { roomId, userId } = data

    try {
      if (voiceRooms.has(roomId)) {
        const roomParticipants = voiceRooms.get(roomId)
        const peers = Array.from(roomParticipants.keys()).filter(id => id !== userId)

        // 返回房间内其他用户列表
        socket.emit('voice-peer-list', {
          peers
        })
      }
    } catch (error) {
      console.error('获取对等列表失败:', error)
    }
  })

  // 音频状态变化
  socket.on('voice-audio-status', (data) => {
    const { roomId, userId, audioEnabled } = data

    try {
      // 更新参与者的音频状态
      if (voiceRooms.has(roomId)) {
        const roomParticipants = voiceRooms.get(roomId)
        if (roomParticipants.has(userId)) {
          const participant = roomParticipants.get(userId)
          participant.audioEnabled = audioEnabled

          // 通知房间内所有人
          io.to(`voice-${roomId}`).emit('voice-audio-status', {
            userId,
            audioEnabled
          })
        }
      }
    } catch (error) {
      console.error('更新音频状态失败:', error)
    }
  })

  // 断开连接时清理
  socket.on('disconnect', () => {
    // 遍历所有房间，找到并移除该用户
    voiceRooms.forEach((roomParticipants, roomId) => {
      roomParticipants.forEach((participant, userId) => {
        if (participant.socketId === socket.id) {
          roomParticipants.delete(userId)

          // 如果房间为空，删除房间
          if (roomParticipants.size === 0) {
            voiceRooms.delete(roomId)
          } else {
            // 通知房间内其他人
            const participants = Array.from(roomParticipants.values())
            io.to(`voice-${roomId}`).emit('voice-room-participants', {
              participants
            })

            socket.to(`voice-${roomId}`).emit('voice-user-left', {
              userId: userId
            })
          }
        }
      })
    })
  })
}
