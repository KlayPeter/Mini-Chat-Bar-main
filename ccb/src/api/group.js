/**
 * 群聊相关API
 */
import apiClient from './index'

export const groupApi = {
  /**
   * 获取群聊列表
   */
  getGroupList() {
    return apiClient.get('/room/list')
  },

  /**
   * 获取群聊详情
   * @param {string} roomId - 群聊ID
   */
  getGroupDetail(roomId) {
    return apiClient.get(`/room/${roomId}`)
  },

  /**
   * 创建群聊
   * @param {Object} data - 群聊数据
   */
  createGroup(data) {
    return apiClient.post('/room/create', data)
  },

  /**
   * 更新群聊信息
   * @param {string} roomId - 群聊ID
   * @param {Object} data - 更新数据
   */
  updateGroup(roomId, data) {
    return apiClient.put(`/room/${roomId}`, data)
  },

  /**
   * 邀请成员
   * @param {string} roomId - 群聊ID
   * @param {Array} userIds - 用户ID数组
   */
  inviteMembers(roomId, userIds) {
    return apiClient.post(`/room/${roomId}/invite`, { userIds })
  },

  /**
   * 移除成员
   * @param {string} roomId - 群聊ID
   * @param {string} userId - 用户ID
   */
  removeMember(roomId, userId) {
    return apiClient.delete(`/room/${roomId}/members/${userId}`)
  },

  /**
   * 退出群聊
   * @param {string} roomId - 群聊ID
   */
  leaveGroup(roomId) {
    return apiClient.post(`/room/${roomId}/leave`)
  }
}
