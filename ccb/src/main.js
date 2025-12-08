import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import axios from 'axios'

import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import {
  faComment,
  faEye,
  faUsers,
  faStar,
  faGear,
  faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons'

library.add(faComment, faEye, faUsers, faStar, faGear, faMagnifyingGlass)

// 配置 axios 全局默认设置
axios.defaults.withCredentials = true
axios.defaults.baseURL = import.meta.env.VITE_BASE_URL
axios.defaults.headers.common['Content-Type'] = 'application/json'

const app = createApp(App)
app.component('font-awesome-icon', FontAwesomeIcon)

const pinia = createPinia()

app.use(router).use(pinia).mount('#app')
