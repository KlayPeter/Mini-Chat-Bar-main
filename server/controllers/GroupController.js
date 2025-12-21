const Room = require('../models/Room')
const GroupMessage = require('../models/GroupMessage')
const Users = require('../models/Users')

// 创建群聊
exports.createGroup = async (req, res) => {
  try {
    const { groupName, memberIds } = req.body
    const creator = req.user.userId

    // 获取创建者信息
    const creatorInfo = await Users.findOne({ uID: creator })
    if (!creatorInfo) {
      return res.status(404).json({ message: '用户不存在' })
    }

    // 生成唯一的群ID
    const roomId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

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

    // 创建群聊
    const newRoom = new Room({
      RoomID: roomId,
      RoomName: groupName,
      Creator: creator,
      Admins: [creator],
      Members: members
    })

    await newRoom.save()

    // 创建系统消息
    const systemMessage = new GroupMessage({
      roomId: roomId,
      from: 'system',
      fromName: '系统消息',
      content: `${creatorInfo.uName} 创建了群聊`,
      messageType: 'system'
    })
    await systemMessage.save()

    res.json({
      success: true,
      message: '群聊创建成功',
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
      'Members.userID': userId
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

// 获取群聊详情
exports.getGroupDetail = async (req, res) => {
  try {
    const { roomId } = req.params
    const userId = req.user.userId

    const room = await Room.findOne({ RoomID: roomId })
    if (!room) {
      return res.status(404).json({ message: '群聊不存在' })
    }

    // 检查用户是否是群成员
    const isMember = room.Members.some(m => m.userID === userId)
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
      content: `${userInfo.uName} 退出了群聊`,
      messageType: 'system'
    })
    await systemMessage.save()

    res.json({
      success: true,
      message: '已退出群聊'
    })
  } catch (err) {
    console.error('退出群聊失败:', err)
    res.status(500).json({ message: '退出群聊失败' })
  }
}

// 发送群消息
exports.sendGroupMessage = async (req, res) => {
  try {
    const { roomId } = req.params
    const { content, messageType, fileInfo } = req.body
    const userId = req.user.userId

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
    const message = new GroupMessage({
      roomId: roomId,
      from: userId,
      fromName: userInfo.uName,
      fromAvatar: userInfo.uAvatar,
      content: content,
      messageType: messageType || 'text',
      fileInfo: fileInfo
    })

    await message.save()

    // 更新群聊的最后更新时间
    room.updatedAt = new Date()
    await room.save()

    res.json({
      success: true,
      message: message
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
    if (!isMember) {
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

    res.json({
      success: true,
      messages: messages.reverse()
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
