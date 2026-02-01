/**
 * 应用常量配置
 */

// 消息类型
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  FILE: 'file',
  AUDIO: 'audio',
  VOICE: 'voice',
  SYSTEM: 'system',
  CHATROOM_INVITE: 'chatroom_invite'
}

// 聊天类型
export const CHAT_TYPES = {
  PRIVATE: 'private',
  GROUP: 'group',
  AI: 'ai'
}

// 用户角色
export const USER_ROLES = {
  CREATOR: 'creator',
  ADMIN: 'admin',
  MEMBER: 'member'
}

// 文件类型图标映射
export const FILE_ICONS = {
  pdf: '/images/icon/other.png',
  word: '/images/icon/doc.png',
  doc: '/images/icon/doc.png',
  docx: '/images/icon/doc.png',
  excel: '/images/icon/excel.png',
  xls: '/images/icon/excel.png',
  xlsx: '/images/icon/excel.png',
  powerpoint: '/images/icon/ppt.png',
  ppt: '/images/icon/ppt.png',
  pptx: '/images/icon/ppt.png',
  text: '/images/icon/txt.png',
  txt: '/images/icon/txt.png',
  html: '/images/icon/html.png',
  markdown: '/images/icon/md.png',
  md: '/images/icon/md.png',
  zip: '/images/icon/folder.png',
  rar: '/images/icon/folder.png',
  default: '/images/icon/other.png'
}

// 默认头像
export const DEFAULT_AVATAR = '/images/avatar/default-avatar.webp'

// 消息限制
export const MESSAGE_LIMITS = {
  FORWARD_MAX: 30, // 最多转发30条消息
  RECALL_TIME_LIMIT: 2, // 撤回时间限制（分钟）
  LOAD_MORE_LIMIT: 50 // 每次加载消息数量
}

// Socket事件名称
export const SOCKET_EVENTS = {
  // 连接相关
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  LOGIN: 'login',
  
  // 私聊相关
  PRIVATE_MESSAGE: 'private-message',
  PRIVATE_FILE_MESSAGE: 'private-file-message',
  PRIVATE_MESSAGE_RECALLED: 'private-message-recalled',
  PRIVATE_MESSAGES_DELETED: 'private-messages-deleted',
  
  // 群聊相关
  GROUP_MESSAGE: 'group-message',
  JOIN_GROUP: 'join-group',
  LEAVE_GROUP: 'leave-group',
  JOIN_ROOM: 'join-room',
  RECALL_GROUP_MESSAGE: 'recall-group-message',
  MENTION_NOTIFICATION: 'mention-notification',
  
  // 其他
  AVATAR_UPDATED: 'avatar-updated',
  MESSAGE_DELETED: 'message-deleted',
  MESSAGES_DELETED: 'messages-deleted',
  TYPING_START: 'typing-start',
  TYPING_STOP: 'typing-stop'
}

// 本地存储键名
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER_ID: 'userId',
  THEME: 'theme',
  LAST_CHAT_CONTEXT: 'lastChatContext'
}

// Toast配置
export const TOAST_CONFIG = {
  DURATION: 3000,
  POSITION: 'top-right'
}
