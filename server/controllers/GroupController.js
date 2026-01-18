const Room = require('../models/Room')
const GroupMessage = require('../models/GroupMessage')
const Users = require('../models/Users')

// 创建群聊
exports.createGroup = async (req, res) => {
  try {
    const { groupName, memberIds, type, techDirection, joinType, password, announcement, duration } = req.body
    const creator = req.user.userId

    // 获取创建者信息
    const creatorInfo = await Users.findOne({ uID: creator })
    if (!creatorInfo) {
      return res.status(404).json({ message: '用户不存在' })
    }

    // 生成唯一的群ID
    const prefix = type === 'chatroom' ? 'chatroom' : 'group'
    const roomId = `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 构建成员列表（包含创建者）
    const members = [{
      userID: creator,
      Nickname: creatorInfo.uName,
      Avatar: creatorInfo.uAvatar,
      joinedAt: new Date()
    }]

    // 添加其他成员
    if (memberIds && memberIds.length > 0) {
      for (const memberId of memberIds) {
        if (memberId !== creator) {
          const memberInfo = await Users.findOne({ uID: memberId })
          if (memberInfo) {
            members.push({
              userID: memberId,
              Nickname: memberInfo.uName,
              Avatar: memberInfo.uAvatar,
              joinedAt: new Date()
            })
          }
        }
      }
    }

    // 生成邀请码（如果需要）
    let inviteCode = ''
    if (joinType === 'invite') {
      inviteCode = Math.random().toString(36).substr(2, 8).toUpperCase()
    }

    // 计算过期时间（仅聊天室有时间限制）
    let expiresAt = null
    const roomDuration = duration || 24 // 默认24小时
    if (type === 'chatroom') {
      expiresAt = new Date(Date.now() + roomDuration * 60 * 60 * 1000)
    }

    // 创建群聊/聊天室
    const newRoom = new Room({
      RoomID: roomId,
      RoomName: groupName,
      Creator: creator,
      Admins: [creator],
      Members: members,
      type: type || 'normal',
      techDirection: techDirection || '',
      joinType: joinType || 'public',
      inviteCode: inviteCode,
      password: password || '',
      Announcement: announcement || '',
      duration: type === 'chatroom' ? roomDuration : undefined,
      expiresAt: expiresAt
    })

    await newRoom.save()

    // 创建系统消息
    const systemMessage = new GroupMessage({
      roomId: roomId,
      from: 'system',
      fromName: '系统消息',
      content: type === 'chatroom' 
        ? `${creatorInfo.uName} 创建了技术聊天室，将在 ${roomDuration} 小时后自动解散` 
        : `${creatorInfo.uName} 创建了群聊`,
      messageType: 'system'
    })
    await systemMessage.save()

    res.json({
      success: true,
      message: type === 'chatroom' ? '聊天室创建成功' : '群聊创建成功',
      room: newRoom
    })
  } catch (err) {
    console.error('创建群聊失败:', err)
    res.status(500).json({ message: '创建群聊失败', error: err.message })
  }
}

// 获取用户的所有群聊
exports.getUserGroups = async (req, res) => {
  try {
    const userId = req.user.userId

    const groups = await Room.find({
      'Members.userID': userId,
      type: { $ne: 'chatroom' } // 排除聊天室
    }).sort({ updatedAt: -1 })

    res.json({
      success: true,
      groups: groups
    })
  } catch (err) {
    console.error('获取群聊列表失败:', err)
    res.status(500).json({ message: '获取群聊列表失败' })
  }
}

// 获取用户的所有技术聊天室
exports.getChatRooms = async (req, res) => {
  try {
    const userId = req.user.userId

    const rooms = await Room.find({
      $or: [
        { 'Members.userID': userId, type: 'chatroom' },
        { type: 'chatroom', joinType: 'public' },
        { type: 'chatroom', joinType: 'password' } // 密码方式的聊天室也显示在列表中
      ]
    }).sort({ updatedAt: -1 })

    // 获取在线人数（从 roomUsers Map）
    const roomSocketModule = require('../sockets/room')
    const roomUsers = roomSocketModule.roomUsers
    
    const roomsWithOnlineCount = rooms.map(room => {
      const roomObj = room.toObject()
      // 获取该房间的在线用户数（按 userId 去重）
      roomObj.onlineCount = roomUsers.has(room.RoomID) ? roomUsers.get(room.RoomID).size : 0
      return roomObj
    })

    res.json({
      success: true,
      rooms: roomsWithOnlineCount
    })
  } catch (err) {
    console.error('获取聊天室列表失败:', err)
    res.status(500).json({ message: '获取聊天室列表失败' })
  }
}

// 获取群聊详情
exports.getGroupDetail = async (req, res) => {
  try {
    const { roomId } = req.params
    const userId = req.user.userId
    const { preview } = req.query // 新增：preview 参数，用于预览不自动加入

    const room = await Room.findOne({ RoomID: roomId })
    if (!room) {
      return res.status(404).json({ message: '群聊不存在' })
    }

    // 检查用户是否是群成员
    const isMember = room.Members.some(m => m.userID === userId)
    
    // 如果是聊天室类型，允许非成员查看（但需要根据 joinType 判断是否可以加入）
    if (room.type === 'chatroom') {
      // 获取在线人数（从 roomUsers Map）
      const roomSocketModule = require('../sockets/room')
      const roomUsers = roomSocketModule.roomUsers
      const roomObj = room.toObject()
      roomObj.onlineCount = roomUsers.has(room.RoomID) ? roomUsers.get(room.RoomID).size : 0
      
      // 如果不是成员
      if (!isMember) {
        // 如果是预览模式，不自动加入，返回需要加入的标记
        if (preview === 'true') {
          return res.json({
            success: true,
            room: roomObj,
            needJoin: true,
            isMember: false,
            joinType: room.joinType
          })
        }
        
        // 非预览模式，根据 joinType 判断
        if (room.joinType === 'public') {
          // 公开聊天室，自动加入
          const userInfo = await Users.findOne({ uID: userId })
          if (userInfo) {
            room.Members.push({
              userID: userId,
              Nickname: userInfo.uName,
              Avatar: userInfo.uAvatar,
              joinedAt: new Date()
            })
            await room.save()
            // 更新 roomObj
            roomObj.Members = room.Members
          }
        } else if (room.joinType === 'invite' || room.joinType === 'password') {
          // 需要邀请码或密码的聊天室，返回聊天室信息但标记为未加入
          return res.json({
            success: true,
            room: roomObj,
            needJoin: true,
            isMember: false,
            joinType: room.joinType
          })
        }
      }
      
      // 返回聊天室信息
      return res.json({
        success: true,
        room: roomObj,
        isMember: isMember || room.joinType === 'public'
      })
    }
    
    // 普通群聊必须是成员才能查看
    if (!isMember) {
      return res.status(403).json({ message: '您不是该群成员' })
    }

    res.json({
      success: true,
      room: room
    })
  } catch (err) {
    console.error('获取群聊详情失败:', err)
    res.status(500).json({ message: '获取群聊详情失败' })
  }
}

// 通过邀请码加入聊天室
exports.joinRoomByInviteCode = async (req, res) => {
  try {
    const { inviteCode, password } = req.body
    const userId = req.user.userId

    // 查找聊天室
    const room = await Room.findOne({ inviteCode: inviteCode })
    if (!room) {
      return res.status(404).json({ message: '邀请码无效' })
    }

    // 检查是否已经是成员
    const isMember = room.Members.some(m => m.userID === userId)
    if (isMember) {
      return res.json({
        success: true,
        message: '您已经是该聊天室成员',
        room: room
      })
    }

    // 检查加入类型
    if (room.joinType === 'password' || (room.joinType === 'invite' && room.password)) {
      if (!password || password !== room.password) {
        return res.status(401).json({ message: '密码错误' })
      }
    }

    // 获取用户信息
    const userInfo = await Users.findOne({ uID: userId })
    if (!userInfo) {
      return res.status(404).json({ message: '用户不存在' })
    }

    // 添加成员
    room.Members.push({
      userID: userId,
      Nickname: userInfo.uName,
      Avatar: userInfo.uAvatar,
      joinedAt: new Date()
    })

    await room.save()

    // 创建系统消息
    const systemMessage = new GroupMessage({
      roomId: room.RoomID,
      from: 'system',
      fromName: '系统消息',
      content: `${userInfo.uName} 加入了聊天室`,
      messageType: 'system'
    })
    await systemMessage.save()

    res.json({
      success: true,
      message: '成功加入聊天室',
      room: room
    })
  } catch (err) {
    console.error('加入聊天室失败:', err)
    res.status(500).json({ message: '加入聊天室失败' })
  }
}

// 通过密码直接加入聊天室（用于密码方式的聊天室）
exports.joinRoomByPassword = async (req, res) => {
  try {
    const { roomId, password } = req.body
    const userId = req.user.userId

    // 查找聊天室
    const room = await Room.findOne({ RoomID: roomId })
    if (!room) {
      return res.status(404).json({ message: '聊天室不存在' })
    }

    // 检查是否已经是成员
    const isMember = room.Members.some(m => m.userID === userId)
    if (isMember) {
      return res.json({
        success: true,
        message: '您已经是该聊天室成员',
        room: room
      })
    }

    // 验证密码
    if (room.joinType === 'password') {
      if (!password || password !== room.password) {
        return res.status(401).json({ message: '密码错误' })
      }
    } else {
      return res.status(400).json({ message: '该聊天室不是密码方式' })
    }

    // 获取用户信息
    const userInfo = await Users.findOne({ uID: userId })
    if (!userInfo) {
      return res.status(404).json({ message: '用户不存在' })
    }

    // 添加成员
    room.Members.push({
      userID: userId,
      Nickname: userInfo.uName,
      Avatar: userInfo.uAvatar,
      joinedAt: new Date()
    })

    await room.save()

    // 创建系统消息
    const systemMessage = new GroupMessage({
      roomId: room.RoomID,
      from: 'system',
      fromName: '系统消息',
      content: `${userInfo.uName} 加入了聊天室`,
      messageType: 'system'
    })
    await systemMessage.save()

    res.json({
      success: true,
      message: '成功加入聊天室',
      room: room
    })
  } catch (err) {
    console.error('加入聊天室失败:', err)
    res.status(500).json({ message: '加入聊天室失败' })
  }
}

// 邀请成员加入群聊
exports.inviteMembers = async (req, res) => {
  try {
    const { roomId } = req.params
    const { memberIds } = req.body
    const userId = req.user.userId

    const room = await Room.findOne({ RoomID: roomId })
    if (!room) {
      return res.status(404).json({ message: '群聊不存在' })
    }

    // 检查是否是群成员
    const isMember = room.Members.some(m => m.userID === userId)
    if (!isMember) {
      return res.status(403).json({ message: '您不是该群成员' })
    }

    // 检查群人数限制
    if (room.Members.length + memberIds.length > room.MaxMembers) {
      return res.status(400).json({ message: '群成员已达上限' })
    }

    // 获取邀请者信息
    const inviter = await Users.findOne({ uID: userId })

    // 添加新成员
    const newMembers = []
    for (const memberId of memberIds) {
      // 检查是否已经是成员
      const alreadyMember = room.Members.some(m => m.userID === memberId)
      if (!alreadyMember) {
        const memberInfo = await Users.findOne({ uID: memberId })
        if (memberInfo) {
          room.Members.push({
            userID: memberId,
            Nickname: memberInfo.uName,
            Avatar: memberInfo.uAvatar,
            joinedAt: new Date()
          })
          newMembers.push(memberInfo.uName)
        }
      }
    }

    room.updatedAt = new Date()
    await room.save()

    // 创建系统消息
    if (newMembers.length > 0) {
      const systemMessage = new GroupMessage({
        roomId: roomId,
        from: 'system',
        fromName: '系统消息',
        content: `${inviter.uName} 邀请 ${newMembers.join('、')} 加入群聊`,
        messageType: 'system'
      })
      await systemMessage.save()
    }

    res.json({
      success: true,
      message: '邀请成功',
      room: room
    })
  } catch (err) {
    console.error('邀请成员失败:', err)
    res.status(500).json({ message: '邀请成员失败' })
  }
}

// 退出群聊
exports.leaveGroup = async (req, res) => {
  try {
    const { roomId } = req.params
    const userId = req.user.userId

    const room = await Room.findOne({ RoomID: roomId })
    if (!room) {
      return res.status(404).json({ message: '群聊不存在' })
    }

    // 获取用户信息
    const userInfo = await Users.findOne({ uID: userId })

    // 如果是群主，需要转让群主或解散群
    if (room.Creator === userId) {
      if (room.Members.length === 1) {
        // 只剩群主，直接删除群
        await Room.deleteOne({ RoomID: roomId })
        await GroupMessage.deleteMany({ roomId: roomId })
        return res.json({ success: true, message: '群聊已解散' })
      } else {
        // 转让给第一个管理员或第一个成员
        const newCreator = room.Admins.find(a => a !== userId) || 
                          room.Members.find(m => m.userID !== userId).userID
        room.Creator = newCreator
        if (!room.Admins.includes(newCreator)) {
          room.Admins.push(newCreator)
        }
      }
    }

    // 移除成员
    room.Members = room.Members.filter(m => m.userID !== userId)
    room.Admins = room.Admins.filter(a => a !== userId)
    room.updatedAt = new Date()
    await room.save()

    // 创建系统消息
    const systemMessage = new GroupMessage({
      roomId: roomId,
      from: 'system',
      fromName: '系统消息',
      content: `${userInfo.uName} 退出了${room.type === 'chatroom' ? '聊天室' : '群聊'}`,
      messageType: 'system'
    })
    await systemMessage.save()

    res.json({
      success: true,
      message: room.type === 'chatroom' ? '已退出聊天室' : '已退出群聊'
    })
  } catch (err) {
    console.error('退出群聊失败:', err)
    res.status(500).json({ message: '退出群聊失败' })
  }
}

// 解散聊天室（仅创建者可用）
exports.dissolveRoom = async (req, res) => {
  try {
    const { roomId } = req.params
    const userId = req.user.userId

    const room = await Room.findOne({ RoomID: roomId })
    if (!room) {
      return res.status(404).json({ message: '聊天室不存在' })
    }

    // 检查是否是创建者
    if (room.Creator !== userId) {
      return res.status(403).json({ message: '只有创建者可以解散聊天室' })
    }

    // 删除聊天室和所有消息
    await Room.deleteOne({ RoomID: roomId })
    await GroupMessage.deleteMany({ roomId: roomId })

    res.json({
      success: true,
      message: '聊天室已解散'
    })
  } catch (err) {
    console.error('解散聊天室失败:', err)
    res.status(500).json({ message: '解散聊天室失败' })
  }
}

// 发送群消息
exports.sendGroupMessage = async (req, res) => {
  try {
    const { roomId } = req.params
    const { content, messageType, fileInfo, quotedMessage, codeInfo, isQuestion } = req.body
    const userId = req.user.userId
    
    console.log('🔍 服务器接收到的消息数据:', { content, messageType, fileInfo, quotedMessage, codeInfo, isQuestion })

    const room = await Room.findOne({ RoomID: roomId })
    if (!room) {
      return res.status(404).json({ message: '群聊不存在' })
    }

    // 检查是否是群成员
    const member = room.Members.find(m => m.userID === userId)
    if (!member) {
      return res.status(403).json({ message: '您不是该群成员' })
    }

    // 获取发送者信息
    const userInfo = await Users.findOne({ uID: userId })

    // 创建消息
    const messageData = {
      roomId: roomId,
      from: userId,
      fromName: userInfo.uName,
      fromAvatar: userInfo.uAvatar,
      content: content,
      messageType: messageType || 'text',
      fileInfo: fileInfo,
      codeInfo: codeInfo,
      isQuestion: isQuestion || false
    }

    // 如果有引用消息，添加引用信息
    if (quotedMessage) {
      messageData.quotedMessage = quotedMessage
      console.log('🔍 服务器添加引用消息到messageData:', quotedMessage)
    } else {
      console.log('🔍 服务器没有引用消息需要处理')
    }

    console.log('🔍 服务器最终保存的messageData:', messageData)
    
    const message = new GroupMessage(messageData)

    await message.save()
    
    console.log('🔍 服务器保存后的message对象:', message.toObject())

    // 更新群聊的最后更新时间
    room.updatedAt = new Date()
    await room.save()

    // 确保返回完整的消息对象，包括引用信息和代码信息
    const responseMessage = {
      _id: message._id,
      roomId: message.roomId,
      from: message.from,
      fromName: message.fromName || userInfo.uName,
      fromAvatar: message.fromAvatar || userInfo.uAvatar,
      content: message.content,
      messageType: message.messageType,
      fileInfo: message.fileInfo,
      codeInfo: message.codeInfo,
      quotedMessage: message.quotedMessage || null,
      isQuestion: message.isQuestion || false,
      isSolution: message.isSolution || false,
      solutionTo: message.solutionTo || null,
      questionStatus: message.questionStatus || null,
      time: message.time,
      createdAt: message.time,
      status: message.status
    }
    
    console.log('🔍 服务器最终返回的消息:', JSON.stringify(responseMessage, null, 2))
    
    // 通过 Socket.IO 广播消息给房间内的所有用户
    const io = req.app.get('io')
    if (io) {
      console.log(`📡 广播消息到房间: ${roomId}`)
      io.to(roomId).emit('group-message', responseMessage)
    } else {
      console.warn('⚠️ Socket.IO 实例未找到')
    }
    
    res.json({
      success: true,
      message: responseMessage
    })
  } catch (err) {
    console.error('发送群消息失败:', err)
    res.status(500).json({ message: '发送群消息失败' })
  }
}

// 获取群消息列表
exports.getGroupMessages = async (req, res) => {
  try {
    const { roomId } = req.params
    const { limit = 50, before } = req.query
    const userId = req.user.userId

    const room = await Room.findOne({ RoomID: roomId })
    if (!room) {
      return res.status(404).json({ message: '群聊不存在' })
    }

    // 检查是否是群成员
    const isMember = room.Members.some(m => m.userID === userId)
    
    // 如果是聊天室类型，允许非成员查看消息（公开聊天室）
    if (room.type !== 'chatroom' && !isMember) {
      return res.status(403).json({ message: '您不是该群成员' })
    }

    // 构建查询条件
    const query = { roomId: roomId }
    if (before) {
      query.time = { $lt: new Date(before) }
    }

    // 查询消息
    const messages = await GroupMessage.find(query)
      .sort({ time: -1 })
      .limit(parseInt(limit))

    // 补充缺失的头像信息
    const messagesWithAvatar = await Promise.all(messages.map(async (msg) => {
      const msgObj = msg.toObject()
      // 如果消息没有头像且不是系统消息，尝试从群成员或用户表获取
      if (!msgObj.fromAvatar && msgObj.from !== 'system' && msgObj.from !== 'AI') {
        // 先从群成员中查找
        const member = room.Members.find(m => m.userID === msgObj.from)
        if (member && member.Avatar) {
          msgObj.fromAvatar = member.Avatar
          msgObj.fromName = msgObj.fromName || member.Nickname
        } else {
          // 从用户表查找
          const user = await Users.findOne({ uID: msgObj.from })
          if (user) {
            msgObj.fromAvatar = user.uAvatar
            msgObj.fromName = msgObj.fromName || user.uName
          }
        }
      }
      
      // 确保返回所有必要字段
      return {
        _id: msgObj._id,
        roomId: msgObj.roomId,
        from: msgObj.from,
        fromName: msgObj.fromName || '未知用户',
        fromAvatar: msgObj.fromAvatar || '',
        content: msgObj.content,
        messageType: msgObj.messageType,
        fileInfo: msgObj.fileInfo,
        codeInfo: msgObj.codeInfo,
        quotedMessage: msgObj.quotedMessage || null,
        isQuestion: msgObj.isQuestion || false,
        isSolution: msgObj.isSolution || false,
        solutionTo: msgObj.solutionTo || null,
        questionStatus: msgObj.questionStatus || null,
        time: msgObj.time,
        createdAt: msgObj.time,
        status: msgObj.status
      }
    }))

    console.log('📤 返回的消息数量:', messagesWithAvatar.length)
    if (messagesWithAvatar.length > 0) {
      console.log('📤 第一条消息示例:', JSON.stringify(messagesWithAvatar[0], null, 2))
    }

    res.json({
      success: true,
      messages: messagesWithAvatar.reverse()
    })
  } catch (err) {
    console.error('获取群消息失败:', err)
    res.status(500).json({ message: '获取群消息失败' })
  }
}

// 更新群信息
exports.updateGroupInfo = async (req, res) => {
  try {
    const { roomId } = req.params
    const { groupName, announcement } = req.body
    const userId = req.user.userId

    const room = await Room.findOne({ RoomID: roomId })
    if (!room) {
      return res.status(404).json({ message: '群聊不存在' })
    }

    // 检查是否是管理员
    const isAdmin = room.Admins.includes(userId)
    if (!isAdmin) {
      return res.status(403).json({ message: '只有管理员可以修改群信息' })
    }

    // 更新信息
    if (groupName) room.RoomName = groupName
    if (announcement !== undefined) room.Announcement = announcement
    room.updatedAt = new Date()

    await room.save()

    res.json({
      success: true,
      message: '群信息更新成功',
      room: room
    })
  } catch (err) {
    console.error('更新群信息失败:', err)
    res.status(500).json({ message: '更新群信息失败' })
  }
}

// 删除群消息
exports.deleteGroupMessage = async (req, res) => {
  try {
    const { messageId } = req.params
    const userId = req.user.userId

    const message = await GroupMessage.findById(messageId)
    if (!message) {
      return res.status(404).json({ message: '消息不存在' })
    }

    // 只能删除自己的消息
    if (message.from !== userId) {
      return res.status(403).json({ message: '只能删除自己的消息' })
    }

    await GroupMessage.deleteOne({ _id: messageId })

    res.json({
      success: true,
      message: '消息已删除'
    })
  } catch (err) {
    console.error('删除群消息失败:', err)
    res.status(500).json({ message: '删除群消息失败' })
  }
}

// 搜索用户所有群的历史消息
exports.searchAllMessages = async (req, res) => {
  try {
    console.log('=== 搜索历史消息 API 被调用 ===')
    console.log('用户ID:', req.user.userId)
    
    const userId = req.user.userId

    // 获取用户所有群聊
    const userGroups = await Room.find({
      'Members.userID': userId
    })
    
    console.log('用户群聊数量:', userGroups.length)

    if (userGroups.length === 0) {
      console.log('用户没有加入任何群聊')
      return res.json({
        success: true,
        messages: []
      })
    }

    // 获取所有群的 roomId
    const roomIds = userGroups.map(g => g.RoomID)
    console.log('群聊IDs:', roomIds)

    // 查询这些群的所有消息（限制数量）
    const messages = await GroupMessage.find({
      roomId: { $in: roomIds },
      messageType: 'text' // 只搜索文本消息
    })
      .sort({ time: -1 })
      .limit(500) // 限制最多返回500条
    
    console.log('查询到的消息数量:', messages.length)

    // 为每条消息添加群名称
    const messagesWithGroupName = messages.map(msg => {
      const group = userGroups.find(g => g.RoomID === msg.roomId)
      return {
        ...msg.toObject(),
        groupName: group ? group.RoomName : '未知群聊'
      }
    })

    console.log('返回消息数量:', messagesWithGroupName.length)
    res.json({
      success: true,
      messages: messagesWithGroupName
    })
  } catch (err) {
    console.error('搜索历史消息失败:', err)
    res.status(500).json({ message: '搜索历史消息失败', error: err.message })
  }
}
