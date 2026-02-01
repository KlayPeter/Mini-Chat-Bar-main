/**
 * 文件上传相关API
 */
import apiClient from './index'

export const uploadApi = {
  /**
   * 上传文件
   * @param {File} file - 文件对象
   * @param {Function} onProgress - 上传进度回调
   */
  uploadFile(file, onProgress) {
    const formData = new FormData()
    formData.append('file', file)

    return apiClient.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          onProgress(percentCompleted)
        }
      }
    })
  },

  /**
   * 下载文件
   * @param {string} fileUrl - 文件URL
   */
  async downloadFile(fileUrl) {
    const response = await apiClient.get(fileUrl, {
      responseType: 'blob'
    })
    return response.data
  }
}
