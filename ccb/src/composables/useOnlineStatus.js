import { ref } from 'vue'
import { socket } from '../utils/socket'

// 在线用户集合（全局状态）
const onlineUsers = ref(new Set())
let isInitialized = false // 防止重复初始化
let visibilityTimeout = null // 防抖定时器

export function useOnlineStatus() {
  const currentUserId = ref(localStorage.getItem('userId') || '')

  // 初始化在线状态
  function initOnlineStatus() {
    // 更新当前用户ID（可能登录后有变化）
    currentUserId.value = localStorage.getItem('userId') || ''
    
    if (!currentUserId.value) {
      return
    }

    // 如果已经初始化过，只更新在线状态
    if (isInitialized) {
      socket.emit('user-online', currentUserId.value)
      onlineUsers.value.add(currentUserId.value)
      onlineUsers.value = new Set(onlineUsers.value)
      return
    }
    isInitialized = true

    // 先清理旧的监听器，避免重复注册
    cleanup()

    // 用户上线
    socket.emit('user-online', currentUserId.value)

    // 立即将当前用户添加到在线列表（乐观更新）
    onlineUsers.value.add(currentUserId.value)
    onlineUsers.value = new Set(onlineUsers.value)

    // 监听在线用户列表更新
    socket.on('online-users-update', (users) => {
      onlineUsers.value = new Set(users)
    })

    // 监听用户上线
    socket.on('user-online-notification', (userId) => {
      onlineUsers.value.add(userId)
      onlineUsers.value = new Set(onlineUsers.value)
    })

    // 监听用户离线
    socket.on('user-offline-notification', (userId) => {
      onlineUsers.value.delete(userId)
      onlineUsers.value = new Set(onlineUsers.value)
    })

    // 页面可见性变化（添加防抖）
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 页面关闭前
    window.addEventListener('beforeunload', handleBeforeUnload)
  }

  // 处理页面可见性变化（防抖处理）
  function handleVisibilityChange() {
    // 清除之前的定时器
    if (visibilityTimeout) {
      clearTimeout(visibilityTimeout)
    }

    if (document.hidden) {
      // 页面隐藏，不做任何操作（保持在线状态）
      // console.log('页面隐藏')
    } else {
      // 页面显示，延迟500ms后确认是否需要重新上线（防抖）
      visibilityTimeout = setTimeout(() => {
        const userId = localStorage.getItem('userId') || currentUserId.value
        if (userId && userId !== 'null' && userId !== '' && isInitialized) {
          socket.emit('user-online', userId)
        }
      }, 500)
    }
  }

  // 页面关闭前处理
  function handleBeforeUnload() {
    const userId = localStorage.getItem('userId') || currentUserId.value
    if (userId && userId !== 'null' && userId !== '') {
      socket.emit('user-offline', userId)
    }
  }

  // 清理（只清理监听器，不改变初始化状态）
  function cleanup() {
    socket.off('online-users-update')
    socket.off('user-online-notification')
    socket.off('user-offline-notification')
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('beforeunload', handleBeforeUnload)
    
    if (visibilityTimeout) {
      clearTimeout(visibilityTimeout)
    }
  }
  
  // 真正的用户离线清理（退出应用时调用）
  function fullCleanup() {
    cleanup()
    isInitialized = false
    
    // 用户离线
    if (currentUserId.value) {
      socket.emit('user-offline', currentUserId.value)
    }
  }

  // 检查用户是否在线
  function isUserOnline(userId) {
    if (!userId) return false
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
