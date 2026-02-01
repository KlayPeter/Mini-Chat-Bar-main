/**
 * Socket服务 - 统一管理Socket连接和事件
 */
import { io } from 'socket.io-client'
import { SOCKET_EVENTS, STORAGE_KEYS } from '../constants'
import { baseURL } from '../api'

class SocketService {
  constructor() {
    this.socket = null
    this.eventHandlers = new Map()
  }

  /**
   * 初始化Socket连接
   */
  connect() {
    if (this.socket?.connected) {
      return this.socket
    }

    this.socket = io(baseURL, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true
    })

    // 连接成功
    this.socket.on(SOCKET_EVENTS.CONNECT, () => {
      const userId = localStorage.getItem(STORAGE_KEYS.USER_ID)
      if (userId) {
        this.emit(SOCKET_EVENTS.LOGIN, userId)
      }
    })

    // 连接断开
    this.socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      console.warn('Socket连接断开')
    })

    // 连接错误
    this.socket.on('connect_error', (error) => {
      console.error('Socket连接错误:', error)
    })

    return this.socket
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.eventHandlers.clear()
  }

  /**
   * 发送事件
   * @param {string} event - 事件名
   * @param {*} data - 数据
   */
  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    }
  }

  /**
   * 监听事件
   * @param {string} event - 事件名
   * @param {Function} handler - 处理函数
   */
  on(event, handler) {
    if (!this.socket) return

    this.socket.on(event, handler)
    
    // 保存处理函数引用，用于后续移除
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event).push(handler)
  }

  /**
   * 移除事件监听
   * @param {string} event - 事件名
   * @param {Function} handler - 处理函数（可选）
   */
  off(event, handler) {
    if (!this.socket) return

    if (handler) {
      this.socket.off(event, handler)
      
      // 从保存的处理函数列表中移除
      const handlers = this.eventHandlers.get(event)
      if (handlers) {
        const index = handlers.indexOf(handler)
        if (index > -1) {
          handlers.splice(index, 1)
        }
      }
    } else {
      this.socket.off(event)
      this.eventHandlers.delete(event)
    }
  }

  /**
   * 加入群聊房间
   * @param {string} roomId - 群聊ID
   * @param {string} userId - 用户ID
   */
  joinGroup(roomId, userId) {
    this.emit(SOCKET_EVENTS.JOIN_GROUP, { roomId, userId })
    this.emit(SOCKET_EVENTS.JOIN_ROOM, roomId)
    this.emit('join', roomId)
  }

  /**
   * 离开群聊房间
   * @param {string} roomId - 群聊ID
   * @param {string} userId - 用户ID
   */
  leaveGroup(roomId, userId) {
    this.emit(SOCKET_EVENTS.LEAVE_GROUP, { roomId, userId })
  }

  /**
   * 发送私聊消息
   * @param {Object} data - 消息数据
   */
  sendPrivateMessage(data) {
    this.emit(SOCKET_EVENTS.PRIVATE_MESSAGE, data)
  }

  /**
   * 发送群聊消息
   * @param {Object} data - 消息数据
   */
  sendGroupMessage(data) {
    this.emit(SOCKET_EVENTS.GROUP_MESSAGE, data)
  }

  /**
   * 撤回私聊消息
   * @param {Object} data - 撤回数据
   */
  recallPrivateMessage(data) {
    this.emit(SOCKET_EVENTS.PRIVATE_MESSAGE_RECALLED, data)
  }

  /**
   * 撤回群聊消息
   * @param {Object} data - 撤回数据
   */
  recallGroupMessage(data) {
    this.emit(SOCKET_EVENTS.RECALL_GROUP_MESSAGE, data)
  }

  /**
   * 发送正在输入状态
   * @param {Object} data - 输入状态数据
   */
  sendTypingStart(data) {
    this.emit(SOCKET_EVENTS.TYPING_START, data)
  }

  /**
   * 发送停止输入状态
   * @param {Object} data - 输入状态数据
   */
  sendTypingStop(data) {
    this.emit(SOCKET_EVENTS.TYPING_STOP, data)
  }

  /**
   * 检查连接状态
   * @returns {boolean}
   */
  isConnected() {
    return this.socket?.connected || false
  }
}

// 导出单例
export const socketService = new SocketService()
export default socketService
