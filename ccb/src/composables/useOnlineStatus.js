import { ref, onMounted, onUnmounted } from 'vue'
import { socket } from '../../utils/socket'

// 在线用户集合（全局状态）
const onlineUsers = ref(new Set())

export function useOnlineStatus() {
  const currentUserId = ref(localStorage.getItem('userId') || '')

  // 初始化在线状态
  function initOnlineStatus() {
    // 更新当前用户ID（可能登录后有变化）
    currentUserId.value = localStorage.getItem('userId') || ''
    
    if (!currentUserId.value) return

    // 先清理旧的监听器，避免重复注册
    cleanup()

    // 用户上线
    socket.emit('user-online', currentUserId.value)

    // 立即将当前用户添加到在线列表（乐观更新）
    onlineUsers.value.add(currentUserId.value)
    
    // 强制触发响应式更新
    onlineUsers.value = new Set(onlineUsers.value)
    console.log('乐观更新：当前用户已标记为在线:', currentUserId.value)

    // 监听在线用户列表更新
    socket.on('online-users-update', (users) => {
      onlineUsers.value = new Set(users)
      console.log('在线用户更新:', users)
    })

    // 监听用户上线
    socket.on('user-online-notification', (userId) => {
      onlineUsers.value.add(userId)
      console.log('用户上线:', userId)
    })

    // 监听用户离线
    socket.on('user-offline-notification', (userId) => {
      onlineUsers.value.delete(userId)
      console.log('用户离线:', userId)
    })

    // 页面可见性变化
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 页面关闭前
    window.addEventListener('beforeunload', handleBeforeUnload)
  }

  // 处理页面可见性变化
  function handleVisibilityChange() {
    if (document.hidden) {
      // 页面隐藏，但不立即设为离线（可能只是切换标签页）
      console.log('页面隐藏')
    } else {
      // 页面显示，确保在线状态
      socket.emit('user-online', currentUserId.value)
      console.log('页面显示，重新上线')
    }
  }

  // 页面关闭前处理
  function handleBeforeUnload() {
    socket.emit('user-offline', currentUserId.value)
  }

  // 清理
  function cleanup() {
    // 只清理事件监听器，但不发送离线事件（除非真正退出）
    socket.off('online-users-update')
    socket.off('user-online-notification')
    socket.off('user-offline-notification')
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }
  
  // 真正的用户离线清理（退出应用时调用）
  function fullCleanup() {
    cleanup()
    
    // 用户离线
    if (currentUserId.value) {
      socket.emit('user-offline', currentUserId.value)
    }
  }

  // 检查用户是否在线
  function isUserOnline(userId) {
    return onlineUsers.value.has(String(userId))
  }

  // 获取在线用户数量
  function getOnlineCount() {
    return onlineUsers.value.size
  }

  return {
    onlineUsers,
    currentUserId,
    initOnlineStatus,
    cleanup,
    fullCleanup,
    isUserOnline,
    getOnlineCount
  }
}
