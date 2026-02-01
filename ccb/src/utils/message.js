/**
 * 消息相关工具函数
 */
import { MESSAGE_TYPES } from '../constants'

/**
 * 格式化时间显示
 * @param {Date|string} time - 时间
 * @returns {string} 格式化后的时间字符串
 */
export function formatMessageTime(time) {
  if (!time) return ''
  
  const date = new Date(time)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (messageDate.getTime() === today.getTime()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return '昨天 ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
}

/**
 * 格式化文件大小
 * @param {number} size - 文件大小（字节）
 * @returns {string} 格式化后的文件大小
 */
export function formatFileSize(size) {
  if (!size) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB']
  let index = 0
  let fileSize = size
  
  while (fileSize >= 1024 && index < units.length - 1) {
    fileSize /= 1024
    index++
  }
  
  return `${fileSize.toFixed(1)} ${units[index]}`
}

/**
 * 格式化录音时间
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时间 (mm:ss)
 */
export function formatRecordingTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * 检查消息是否可转发
 * @param {Object} message - 消息对象
 * @returns {boolean}
 */
export function isMessageForwardable(message) {
  return message.messageType !== MESSAGE_TYPES.SYSTEM && message.content
}

/**
 * 检查消息是否可撤回
 * @param {Object} message - 消息对象
 * @param {string} currentUserId - 当前用户ID
 * @param {number} timeLimitMinutes - 时间限制（分钟）
 * @returns {Object} {canRecall: boolean, reason: string}
 */
export function canRecallMessage(message, currentUserId, timeLimitMinutes = 2) {
  // 检查是否是自己的消息
  if (String(message.from) !== String(currentUserId)) {
    return { canRecall: false, reason: '只能撤回自己的消息' }
  }

  // 检查时间限制
  const messageTime = new Date(message.time)
  const now = new Date()
  const diffMinutes = (now - messageTime) / (1000 * 60)
  
  if (diffMinutes > timeLimitMinutes) {
    return { canRecall: false, reason: `消息发送超过${timeLimitMinutes}分钟，无法撤回` }
  }

  return { canRecall: true, reason: '' }
}

/**
 * 检查是否为视频文件
 * @param {string} fileType - 文件类型
 * @returns {boolean}
 */
export function isVideoFile(fileType) {
  return fileType && fileType.startsWith('video/')
}

/**
 * 检查是否为图片文件
 * @param {string} fileType - 文件类型
 * @returns {boolean}
 */
export function isImageFile(fileType) {
  return fileType && fileType.startsWith('image/')
}

/**
 * 检查是否为音频文件
 * @param {string} fileType - 文件类型
 * @returns {boolean}
 */
export function isAudioFile(fileType) {
  return fileType && fileType.startsWith('audio/')
}

/**
 * 去重消息列表
 * @param {Array} messages - 消息数组
 * @returns {Array} 去重后的消息数组
 */
export function deduplicateMessages(messages) {
  const messageMap = new Map()
  messages.forEach(msg => {
    const msgId = msg._id || msg.id
    if (msgId && !messageMap.has(msgId)) {
      messageMap.set(msgId, msg)
    }
  })
  return Array.from(messageMap.values())
}

/**
 * 检查消息是否重复
 * @param {Array} messages - 现有消息列表
 * @param {Object} newMessage - 新消息
 * @returns {boolean}
 */
export function isDuplicateMessage(messages, newMessage) {
  return messages.some(msg => {
    const msgId = msg._id || msg.id
    const newMsgId = newMessage._id || newMessage.id
    
    // 如果两个消息都有ID，用ID判断
    if (msgId && newMsgId) {
      return msgId === newMsgId
    }
    
    // 如果没有ID，用内容+发送者+时间判断（防止短时间内的重复）
    if (msg.content === newMessage.content && 
        msg.from === newMessage.from &&
        msg.messageType === newMessage.messageType) {
      const msgTime = new Date(msg.time || msg.createdAt).getTime()
      const newMsgTime = new Date(newMessage.time || newMessage.createdAt).getTime()
      // 5秒内的相同内容认为是重复
      return Math.abs(msgTime - newMsgTime) < 5000
    }
    
    return false
  })
}
