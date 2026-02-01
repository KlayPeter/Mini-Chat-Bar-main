/**
 * 消息相关API
 */
import apiClient from './index'

export const messageApi = {
  /**
   * 获取私聊消息列表
   * @param {string} userId - 对方用户ID
   */
  getPrivateMessages(userId) {
    return apiClient.get(`/api/chat/messages/${userId}`)
  },

  /**
   * 发送私聊消息
   * @param {string} userId - 对方用户ID
   * @param {Object} data - 消息数据
   */
  sendPrivateMessage(userId, data) {
    return apiClient.post(`/api/chat/messages/${userId}`, data)
  },

  /**
   * 删除私聊记录
   * @param {string} userId - 对方用户ID
   */
  deletePrivateChat(userId) {
    return apiClient.delete(`/api/chat/delete/${userId}`)
  },

  /**
   * 批量删除私聊消息
   * @param {string} userId - 对方用户ID
   * @param {Array} messageIds - 消息ID数组
   */
  deletePrivateMessages(userId, messageIds) {
    return apiClient.delete('/api/chat/messages/batch', {
      data: { messageIds, chatUserId: userId }
    })
  },

  /**
   * 获取群聊消息列表
   * @param {string} roomId - 群聊ID
   * @param {Object} params - 查询参数 {limit, before}
   */
  getGroupMessages(roomId, params = {}) {
    return apiClient.get(`/room/${roomId}/messages`, { params })
  },

  /**
   * 发送群聊消息
   * @param {string} roomId - 群聊ID
   * @param {Object} data - 消息数据
   */
  sendGroupMessage(roomId, data) {
    return apiClient.post(`/room/${roomId}/messages`, data)
  },

  /**
   * 删除群聊消息
   * @param {string} roomId - 群聊ID
   * @param {Array} messageIds - 消息ID数组
   */
  deleteGroupMessages(roomId, messageIds) {
    return apiClient.delete(`/room/${roomId}/messages`, {
      data: { messageIds }
    })
  },

  /**
   * 添加收藏
   * @param {Object} data - 收藏数据
   */
  addFavorite(data) {
    return apiClient.post('/api/favorites', data)
  }
}
