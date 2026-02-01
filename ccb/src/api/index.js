/**
 * API 服务层 - 统一管理所有API调用
 */
import axios from 'axios'
import { STORAGE_KEYS } from '../constants'

const baseURL = import.meta.env.VITE_BASE_URL

// 创建axios实例
const apiClient = axios.create({
  baseURL,
  timeout: 30000
})

// 请求拦截器 - 自动添加token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 统一错误处理
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token过期，跳转到登录页
      localStorage.removeItem(STORAGE_KEYS.TOKEN)
      localStorage.removeItem(STORAGE_KEYS.USER_ID)
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
export { baseURL }
