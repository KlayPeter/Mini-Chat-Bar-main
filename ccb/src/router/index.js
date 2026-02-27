import { createRouter, createWebHistory } from 'vue-router'
import Login from '../components/layout/Login.vue'
import ChatView from '../components/chat/ChatView.vue'
import Content from '../views/Content.vue'
import Assistant from '../views/Assistant.vue'
import Moments from '../views/Moments.vue'
import Favorites from '../views/Favorites.vue'
import GroupChat from '../views/GroupChat.vue'
import ChatRoom from '../views/ChatRoom.vue'
import ChatRoomDetail from '../views/ChatRoomDetail.vue'
import ChatRoomWelcome from '../components/chatroom/ChatRoomWelcome.vue'

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
        path: '/chatrooms',
        name: 'chatrooms',
        component: ChatRoomWelcome,
        meta: { showChatRooms: true }
      },
      {
        path: '/chatdetail',
        name: 'chatdetail',
        component: Content
      },
      {
        path: '/chatroom-detail',
        name: 'chatroom-detail',
        component: ChatRoomDetail
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
    path: "/chatroom",
    component: ChatRoom,
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

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const userId = localStorage.getItem('userId')

  // 检查当前路由及其父路由是否需要认证
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  // 如果访问需要认证的页面但没有有效的登录信息,跳转到登录页
  if (requiresAuth && (!token || !userId)) {
    // 清除可能存在的不完整数据
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
    localStorage.removeItem('username')
    localStorage.removeItem('avatar')
    next("/login")
  }
  // 如果已登录但访问登录页,跳转到首页
  else if (to.path === '/login' && token && userId) {
    next("/")
  }
  else {
    next()
  }
})

export default router