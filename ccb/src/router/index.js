import { createRouter, createWebHistory } from 'vue-router'
import Login from '../components/Login.vue'
import ChatView from '../components/ChatView.vue'
import Content from '../views/Content.vue'
import Assistant from '../views/Assistant.vue'
import Moments from '../views/Moments.vue'
import Favorites from '../views/Favorites.vue'
import GroupChat from '../views/GroupChat.vue'

const routes = [
  {
    path: '/',
    component: ChatView,
    redirect: '/chats',  // 默认重定向到聊天列表
    children: [
      {
        path: '/chats',
        name: 'chats',
        component: { template: '<router-view />' },  // 占位组件，由 ChatView 控制显示
        meta: { showChats: true }
      },
      {
        path: '/contacts',
        name: 'contacts',
        component: { template: '<router-view />' },
        meta: { showContacts: true }
      },
      {
        path: '/chatdetail',
        name: 'chatdetail',
        component: Content
      },
      {
        path: '/chat-ai',
        name: 'chat-ai',
        component: Assistant
      }
    ],
    meta: { requiresAuth: true }
  },
  {
    path: "/login",
    component: Login
  },
  {
    path: "/moments",
    component: Moments,
    meta: { requiresAuth: true }
  },
  {
    path: "/favorites",
    component: Favorites,
    meta: { requiresAuth: true }
  },
  {
    path: "/group-chat",
    component: GroupChat,
    meta: { requiresAuth: true }
  },
  {
    path: '/:catchAll(.*)',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to,from,next)=>{
  const isLoggedIn = localStorage.getItem('token')
  
  // 如果访问需要认证的页面但没有token,跳转到登录页
  if(to.meta.requiresAuth && !isLoggedIn){
    console.log('未登录,跳转到登录页')
    next("/login")
  }
  // 如果已登录但访问登录页,跳转到首页
  else if(to.path === '/login' && isLoggedIn){
    next("/")
  }
  else{
    next()
  }
})

export default router