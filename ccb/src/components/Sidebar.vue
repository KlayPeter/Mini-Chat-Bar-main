<template>
  <div class="sidebar">
    <div class="logo">
      <div class="logo-container" @click="toAI">
        <span class="ai-text">AI</span>
      </div>
    </div>
    <div class="toolbar">
      <ul>
        <li :class="{ active: activeTab === 'chat' }">
          <font-awesome-icon icon="comment" title="聊天" @click="chat" />
        </li>
        <li :class="{ active: activeTab === 'contacts' }">
          <font-awesome-icon icon="users" title="通讯录" @click="contacts" />
        </li>
        <li :class="{ active: activeTab === 'group' }">
          <font-awesome-icon
            :icon="['fas', 'users']"
            title="群聊"
            @click="toGroupChat"
          />
        </li>
        <li :class="{ active: activeTab === 'favorites' }">
          <font-awesome-icon icon="star" title="收藏夹" @click="togithub" />
        </li>
      </ul>
    </div>
    <div class="privacy">
      <div class="avatar" @click="logout">
        <img :src="avatar || '/images/avatar/out.webp'" alt="" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { socket } from '../../utils/socket'
import { useRouter, useRoute } from 'vue-router'
const emit = defineEmits(['showchat', 'showcontacts', 'todetail'])
const router = useRouter()
const route = useRoute()

const avatar = ref('')
const activeTab = ref('chat')

// 根据当前路由设置activeTab
function updateActiveTab() {
  const path = route.path
  if (path === '/group-chat') {
    activeTab.value = 'group'
  } else if (path === '/moments') {
    activeTab.value = 'moments'
  } else if (path === '/favorites') {
    activeTab.value = 'favorites'
  } else if (path === '/contacts') {
    activeTab.value = 'contacts'
  } else if (path === '/chats' || path === '/' || path.includes('/chatdetail') || path.includes('/chat-ai')) {
    activeTab.value = 'chat'
  }
}

// 监听路由变化
watch(() => route.path, () => {
  updateActiveTab()
})

function toAI() {
  activeTab.value = 'chat'
  router.push('/chat-ai')
}

function chat() {
  activeTab.value = 'chat'
  router.push('/chats')
}

function contacts() {
  activeTab.value = 'contacts'
  router.push('/contacts')
}

function tocsdn() {
  activeTab.value = 'moments'
  router.push('/moments')
}

function toGroupChat() {
  activeTab.value = 'group'
  router.push('/group-chat')
}

function togithub() {
  activeTab.value = 'favorites'
  router.push('/favorites')
}

function logout() {
  localStorage.clear()
  location.reload()
}
onMounted(async () => {
  // 初始化时设置activeTab
  updateActiveTab()
  
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(
      `${import.meta.env.VITE_BASE_URL}/api/user/info`,
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    )
    avatar.value = res.data.ava

    // 监听头像更新事件
    socket.on('avatar-updated', (data) => {
      // 如果是当前用户的头像更新，则更新本地头像
      const currentUserId = JSON.parse(atob(token.split('.')[1])).uid
      if (data.userId.toString() === currentUserId.toString()) {
        avatar.value = data.newAvatarUrl
      }
    })
  } catch (err) {
    console.error('用户头像获取失败：', err)
  }
})

onBeforeUnmount(() => {
  socket.off('avatar-updated')
})
</script>

<style scoped lang="scss">
* {
  padding: 0;
  margin: 0;
}

.sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 24px;
  padding: 0px 2px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  -webkit-app-region: no-drag;
  position: relative;
  z-index: 100;
  pointer-events: auto;
}

.logo {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
  margin-bottom: 40px;
  -webkit-app-region: no-drag;

  .logo-container {
    width: 48px;
    height: 48px;
    background: var(--primary-gradient);
    border-radius: 14px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    box-shadow: var(--shadow-primary);
    transition: all 0.3s ease;
    -webkit-app-region: no-drag;
    pointer-events: auto;

    &:hover {
      transform: scale(1.05);
      box-shadow: var(--shadow-md);
    }

    .ai-text {
      color: white;
      font-weight: 800;
      font-size: 20px;
      font-family: 'Arial', sans-serif;
    }
  }
}

.toolbar {
  flex: 1;
  -webkit-app-region: no-drag;
}

.privacy {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  padding-bottom: 10px;
  -webkit-app-region: no-drag;
}

img {
  width: 100%;
  aspect-ratio: 1/1;
  object-fit: cover;
}

ul {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  -webkit-app-region: no-drag;

  li {
    width: 48px;
    height: 48px;
    list-style-type: none;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    transition: all 0.3s ease;
    cursor: pointer;
    color: #a0a0a0;
    -webkit-app-region: no-drag;
    pointer-events: auto;

    &.active {
      background: var(--active-bg);

      svg {
        color: var(--primary-color);
      }
    }

    &:hover:not(.active) {
      background: #f5f5f5;
      color: #666;
    }

    svg {
      font-size: 22px;
      transition: all 0.3s ease;
    }
  }
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  cursor: pointer;
  -webkit-app-region: no-drag;
  pointer-events: auto;

  &:hover {
    transform: scale(1.05);
    border-color: var(--primary-color);
    cursor: pointer;

    &::after {
      opacity: 1;
    }
  }

  &::after {
    content: '退出';
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    white-space: nowrap;
    font-size: 10px;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
}

/* 响应式设计 */

/* 移动设备 - 隐藏侧边栏 */
@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
}
</style>
