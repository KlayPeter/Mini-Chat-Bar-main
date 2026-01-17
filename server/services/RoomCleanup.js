const Room = require('../models/Room')
const GroupMessage = require('../models/GroupMessage')

// 清理过期的聊天室
async function cleanupExpiredRooms() {
  try {
    const now = new Date()
    
    // 查找所有过期的聊天室
    const expiredRooms = await Room.find({
      type: 'chatroom',
      expiresAt: { $lte: now }
    })
    
    if (expiredRooms.length > 0) {
      console.log(`🗑️ 发现 ${expiredRooms.length} 个过期聊天室，开始清理...`)
      
      for (const room of expiredRooms) {
        // 删除聊天室消息
        await GroupMessage.deleteMany({ roomId: room.RoomID })
        
        // 删除聊天室
        await Room.deleteOne({ RoomID: room.RoomID })
        
        console.log(`✅ 已清理过期聊天室: ${room.RoomName} (${room.RoomID})`)
      }
    }
  } catch (err) {
    console.error('❌ 清理过期聊天室失败:', err)
  }
}

// 启动定时清理任务（每10分钟检查一次）
function startCleanupTask() {
  console.log('🚀 启动聊天室过期清理任务...')
  
  // 立即执行一次
  cleanupExpiredRooms()
  
  // 每10分钟执行一次
  setInterval(cleanupExpiredRooms, 10 * 60 * 1000)
}

module.exports = {
  startCleanupTask,
  cleanupExpiredRooms
}
