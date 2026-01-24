import { io } from 'socket.io-client'

const socket = io(`${import.meta.env.VITE_BASE_URL}`, {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  
  // 断线重连配置
  reconnection: true,              // 启用自动重连
  reconnectionAttempts: Infinity,  // 无限重试
  reconnectionDelay: 1000,         // 初始重连延迟 1 秒
  reconnectionDelayMax: 5000,      // 最大重连延迟 5 秒
  timeout: 20000,                  // 连接超时 20 秒
  
  // 其他配置
  autoConnect: true,
  upgrade: true,                   // 允许协议升级
  rememberUpgrade: true,           // 记住升级
})

// 连接状态管理
let isReconnecting = false
let reconnectAttempts = 0

// 监听连接事件
socket.on('connect', () => {
  console.log('✅ Socket 连接成功:', socket.id)
  
  if (isReconnecting) {
    console.log('🔄 重连成功，尝试次数:', reconnectAttempts)
    // 触发重连成功事件
    window.dispatchEvent(new CustomEvent('socket-reconnected', {
      detail: { attempts: reconnectAttempts }
    }))
  }
  
  isReconnecting = false
  reconnectAttempts = 0
})

// 监听断开连接
socket.on('disconnect', (reason) => {
  console.warn('⚠️ Socket 断开连接:', reason)
  
  // 触发断线事件
  window.dispatchEvent(new CustomEvent('socket-disconnected', {
    detail: { reason }
  }))
})

// 监听重连尝试
socket.io.on('reconnect_attempt', (attempt) => {
  isReconnecting = true
  reconnectAttempts = attempt
  console.log(`🔄 尝试重连... (第 ${attempt} 次)`)
  
  // 触发重连尝试事件
  window.dispatchEvent(new CustomEvent('socket-reconnecting', {
    detail: { attempt }
  }))
})

// 监听重连错误
socket.io.on('reconnect_error', (error) => {
  console.error('❌ 重连失败:', error.message)
})

// 监听重连失败（达到最大尝试次数）
socket.io.on('reconnect_failed', () => {
  console.error('❌ 重连失败，已达到最大尝试次数')
  
  // 触发重连失败事件
  window.dispatchEvent(new CustomEvent('socket-reconnect-failed'))
})

// 监听连接错误
socket.on('connect_error', (error) => {
  console.error('❌ Socket 连接错误:', error.message)
})

// 心跳检测
let heartbeatInterval = null

function startHeartbeat() {
  if (heartbeatInterval) return
  
  heartbeatInterval = setInterval(() => {
    if (socket.connected) {
      socket.emit('heartbeat', { timestamp: Date.now() })
    }
  }, 30000) // 每 30 秒发送一次心跳
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }
}

// 连接成功后启动心跳
socket.on('connect', startHeartbeat)
socket.on('disconnect', stopHeartbeat)

function waitForSocketConnection(callback) {
  // 如果有回调函数，使用原有逻辑
  if (typeof callback === 'function') {
    if (socket.connected) {
      callback()
    } else {
      socket.on('connect', () => {
        callback()
      })
    }
    return
  }
  
  // 如果没有回调函数，返回Promise（支持async/await）
  return new Promise((resolve) => {
    if (socket.connected) {
      resolve()
    } else {
      socket.on('connect', () => {
        resolve()
      })
    }
  })
}

export { socket, waitForSocketConnection }
