import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import axios from 'axios'

// FontAwesome 配置
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { fas } from '@fortawesome/free-solid-svg-icons'

// 图片懒加载指令
import lazyLoadDirective from './directives/lazyLoad'

// 添加所有 solid 图标到库中
library.add(fas)

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

// 注册 FontAwesome 组件
app.component('font-awesome-icon', FontAwesomeIcon)

// 注册懒加载指令
app.use(lazyLoadDirective)

app.use(router).use(pinia).mount('#app')
