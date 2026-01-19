<template>
  <div class="sidebar">
    <div class="logo">
      <!-- AI 数字人助手 -->
      <AIDigitalAssistant
        ref="aiAssistantRef"
        :mode="currentMode"
        :insights="aiInsights"
        :aiSpeech="aiSpeech"
        @click="handleAIClick"
        @refresh="handleAIRefresh"
        @action="handleAIAction"
      />
    </div>
    <div class="toolbar">
      <ul>
        <li :class="{ active: activeTab === 'chat' }">
          <i title="聊天" @click="chat">
            <ChatBubble class="icon" />
          </i>
        </li>
        <li :class="{ active: activeTab === 'contacts' }">
          <i title="通讯录" @click="contacts">
            <User class="icon" />
          </i>
        </li>
        <li :class="{ active: activeTab === 'group' }">
          <i title="群聊" @click="toGroupChat">
            <Group class="icon" />
          </i>
        </li>
        <li :class="{ active: activeTab === 'chatroom' }">
          <i title="技术聊天室" @click="toChatRoom">
            <Code class="icon" />
          </i>
        </li>
        <li :class="{ active: activeTab === 'favorites' }">
          <i title="收藏夹" @click="togithub">
            <Star class="icon" />
          </i>
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
import { ref, watch, computed } from 'vue'
import { onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { socket } from '../../utils/socket'
import { useRouter, useRoute } from 'vue-router'
import { ChatBubble, User, Group, Star, Code } from '@iconoir/vue'
import AIDigitalAssistant from './AIDigitalAssistant.vue'

const emit = defineEmits(['showchat', 'showcontacts', 'todetail', 'toggleAI', 'showchatrooms', 'refreshInsights', 'aiAction'])
const router = useRouter()
const route = useRoute()

const avatar = ref('')
const activeTab = ref('chat')
const aiInsights = ref({ suggestions: [] })
const aiSpeech = ref('') // AI 播报文本
const aiAssistantRef = ref(null) // AI 数字人引用

// 根据当前路由判断 AI 助手模式
const currentMode = computed(() => {
  const path = route.path
  if (path === '/chatrooms' || path.includes('/chatroom-detail')) {
    return 'chatroom' // 聊天室模式
  } else if (path === '/group-chat') {
    return 'group' // 群聊模式
  } else {
    return 'chat' // 私聊模式
  }
})

// 处理 AI 点击
function handleAIClick() {
  if (currentMode.value === 'chatroom') {
    // 聊天室模式：刷新智能提示
    emit('refreshInsights')
  } else {
    // 其他模式：打开 AI 对话框
    emit('toggleAI')
  }
}

// 处理 AI 刷新
function handleAIRefresh() {
  console.log('🔄 handleAIRefresh 被调用')
  // 先让 AI 说"正在刷新"
  if (aiAssistantRef.value) {
    console.log('🎤 调用 speakRefreshing')
    aiAssistantRef.value.speakRefreshing()
  } else {
    console.log('⚠️ aiAssistantRef 为空')
  }
  emit('refreshInsights')
}

// 处理 AI 操作
function handleAIAction(action) {
  emit('aiAction', action)
}

// 根据当前路由设置activeTab
function updateActiveTab() {
  const path = route.path
  if (path === '/group-chat') {
    activeTab.value = 'group'
  } else if (path === '/chatrooms' || path.includes('/chatroom-detail')) {
    activeTab.value = 'chatroom'
  } else if (path === '/moments') {
    activeTab.value = 'moments'
  } else if (path === '/favorites') {
    activeTab.value = 'favorites'
  } else if (path === '/contacts') {
    activeTab.value = 'contacts'
  } else if (path === '/chats' || path === '/' || path.includes('/chatdetail')) {
    activeTab.value = 'chat'
  }
}

// 监听路由变化
watch(() => route.path, (newPath, oldPath) => {
  updateActiveTab()
  
  // 路由切换到聊天室时，AI 说欢迎语
  if (newPath === '/chatrooms' && oldPath !== '/chatrooms') {
    if (aiAssistantRef.value) {
      aiAssistantRef.value.speak('欢迎来到技术聊天室！选择一个房间开始交流吧', 4000)
    }
  } else if (newPath === '/group-chat' && oldPath !== '/group-chat') {
    if (aiAssistantRef.value) {
      aiAssistantRef.value.speak('进入群聊模式，点击我可以打开 AI 对话框', 3000)
    }
  } else if (newPath === '/chats' && oldPath !== '/chats') {
    if (aiAssistantRef.value) {
      aiAssistantRef.value.speak('私聊模式，有问题可以问我', 3000)
    }
  }
})

// 监听 aiSpeech 的变化，自动播报
watch(() => aiSpeech.value, (newSpeech, oldSpeech) => {
  if (newSpeech && newSpeech !== oldSpeech && aiAssistantRef.value) {
    console.log('🔔 检测到 aiSpeech 变化，立即播报:', newSpeech)
    aiAssistantRef.value.speak(newSpeech, 8000)
  }
})

// 暴露方法供父组件调用
defineExpose({
  updateAIInsights: (insights, speech = '') => {
    console.log('📊 updateAIInsights 被调用:', { insights, speech })
    aiInsights.value = insights
    aiSpeech.value = speech
    
    // 刷新完成后，让 AI 说话
    if (aiAssistantRef.value && speech) {
      console.log('🎤 调用 speakRefreshComplete')
      aiAssistantRef.value.speakRefreshComplete(speech)
    } else {
      console.log('⚠️ aiAssistantRef 或 speech 为空:', { 
        hasRef: !!aiAssistantRef.value, 
        speech 
      })
    }
  },
  speakWelcome: (roomName) => {
    console.log('👋 speakWelcome 被调用:', roomName)
    console.log('📍 aiAssistantRef.value:', aiAssistantRef.value)
    
    if (aiAssistantRef.value) {
      console.log('🎤 调用 speak')
      aiAssistantRef.value.speak(`欢迎来到 ${roomName}！`, 3000)
    } else {
      console.log('⚠️ aiAssistantRef 为空')
    }
  }
})

function toAI() {
  emit('toggleAI')
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

function toChatRoom() {
  activeTab.value = 'chatroom'
  router.push('/chatrooms')
}

function togithub() {
  activeTab.value = 'favorites'
  router.push('/favorites')
}

function logout() {
  localStorage.clear()
  location.reload()
}
// 获取用户头像
async function fetchUserAvatar() {
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
    // 后端返回的数据结构是 { user: { uID, uName, uAvatar } }
    if (res.data && res.data.user) {
      avatar.value = res.data.user.uAvatar
    } else {
      console.error('用户信息格式不正确:', res.data)
    }
  } catch (err) {
    console.error('用户头像获取失败：', err)
  }
}

onMounted(async () => {
  // 初始化时设置activeTab
  updateActiveTab()
  
  // 获取用户头像
  await fetchUserAvatar()

  // 监听头像更新事件
  socket.on('avatar-updated', async (data) => {
    // 如果是当前用户的头像更新，重新获取头像
    const token = localStorage.getItem('token')
    const currentUserId = JSON.parse(atob(token.split('.')[1])).uid
    if (data.userId.toString() === currentUserId.toString()) {
      await fetchUserAvatar()
    }
  })
  
  // 监听全局 AI 播报事件
  window.addEventListener('ai-speak', (event) => {
    console.log('🔔 收到全局 AI 播报事件:', event.detail)
    if (aiAssistantRef.value && event.detail.text) {
      // 构建消息对象
      const message = {
        text: event.detail.text,
        duration: event.detail.duration || 6000,
        immediate: event.detail.immediate || false
      }
      
      // 调用 speak 方法（内部会处理 immediate 逻辑）
      if (event.detail.immediate) {
        // 立即模式：直接传递 immediate 标志
        aiAssistantRef.value.speak(message.text, message.duration, null, true)
      } else {
        aiAssistantRef.value.speak(message.text, message.duration)
      }
    }
  })
})

onBeforeUnmount(() => {
  socket.off('avatar-updated')
  // 移除全局事件监听
  window.removeEventListener('ai-speak', () => {})
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
  background: var(--bg-tertiary, #ffffff);
  border-radius: 24px;
  padding: 0px 2px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  -webkit-app-region: no-drag;
  position: relative;
  z-index: 100;
  pointer-events: auto;
  overflow: visible !important; /* 允许气泡溢出 */
}

.logo {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
  overflow: visible !important; /* 允许气泡溢出 */
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

    i {
      font-style: normal;
      font-size: 24px;
      cursor: pointer;
      color: var(--text-secondary);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      -webkit-app-region: no-drag;
      pointer-events: auto;

      .icon {
        width: 24px;
        height: 24px;
        stroke-width: 1.5;
      }
    }

    &.active {
      background: var(--active-bg);

      svg {
        color: var(--primary-color);
      }
    }

    &:hover:not(.active) {
      background: var(--hover-bg, rgba(165, 42, 42, 0.05));
      
      svg {
        color: var(--primary-color, rgb(165, 42, 42));
      }
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
