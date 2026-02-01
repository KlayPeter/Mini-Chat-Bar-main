/**
 * 用户相关API
 */
import apiClient from './index'

export const userApi = {
  /**
   * 获取用户信息
   */
  getUserInfo() {
    return apiClient.get('/api/user/info')
  },

  /**
   * 获取好友头像
   * @param {string} userId - 用户ID
   */
  getFriendAvatar(userId) {
    return apiClient.get(`/api/user/friend_avatar/${userId}`)
  },

  /**
   * 更新用户头像
   * @param {FormData} formData - 包含头像文件的FormData
   */
  updateAvatar(formData) {
    return apiClient.post('/api/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  /**
   * 更新用户信息
   * @param {Object} data - 用户信息
   */
  updateUserInfo(data) {
    return apiClient.put('/api/user/info', data)
  }
}
