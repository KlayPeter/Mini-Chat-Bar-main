import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import axios from 'axios'

// 配置 axios 全局默认设置
axios.defaults.withCredentials = true
axios.defaults.baseURL = import.meta.env.VITE_BASE_URL
axios.defaults.headers.common['Content-Type'] = 'application/json'

// 添加响应拦截器处理 token 过期
axios.interceptors.response.use(
  response => response,
  error => {
    // 如果返回 401 未授权错误，清除 token 并跳转到登录页
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('userId')
      localStorage.removeItem('username')
      localStorage.removeItem('avatar')
      
      // 只有当前不在登录页时才跳转
      if (router.currentRoute.value.path !== '/login') {
        router.push('/login')
      }
    }
    return Promise.reject(error)
  }
)

const app = createApp(App)

const pinia = createPinia()

app.use(router).use(pinia).mount('#app')
