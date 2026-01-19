<template>
  <div class="container mobile" ref="container" v-if="isMobile">
    <div class="main-content">
      <div class="section2 mobile" v-if="showlastchats && !showcontent">
        <LastChats
          @hidechat="handlehidechat"
          @changecolor="setcolor"
          @todetail="showdetail"
        />
      </div>
      <div class="section2 mobile" v-if="showcontacts && !showcontent">
        <Contacts @hidecontacts="handlehidecontacts" @todetail="showdetail" />
      </div>
      <div class="section2 mobile" v-if="showchatrooms && !showcontent">
        <ChatRoomListPanel />
      </div>
      <Transition name="slide-fade" mode="out-in">
        <router-view
          v-if="showcontent"
          class="section3"
          :key="$route.path"
          @closemessage="hidecontent"
        />
      </Transition>
    </div>
    <!-- 移动端底部导航栏 -->
    <BottomNavbar
      @showchat="handleshowchat"
      @showcontacts="handleshowcontacts"
      @todetail="showAI"
    />
  </div>
  <div class="container" ref="container" v-else>
    <div class="section1">
      <Sidebar
        @showchat="handleshowchat"
        @showcontacts="handleshowcontacts"
        @todetail="showAI"
        @toggleAI="toggleAIPanel"
      />
    </div>
    <div class="section2-wrapper" :class="{ collapsed: isSection2Collapsed }">
      <div class="section2" v-if="showlastchats">
        <LastChats
          @hidechat="handlehidechat"
          @changecolor="setcolor"
          @todetail="showdetail"
        />
      </div>
      <div class="section2" v-if="showcontacts">
        <Contacts @hidecontacts="handlehidecontacts" @todetail="showdetail" />
      </div>
      <div class="section2" v-if="showchatrooms">
        <ChatRoomListPanel />
      </div>
      <!-- AI 助手面板 - 覆盖在 section2 上 -->
      <AIAssistantPanel 
        :visible="showAIPanel" 
        :chatContext="privateChatContext"
        @close="showAIPanel = false" 
      />
    </div>
    <!-- <div class="section3" v-if="show3"><Content @closemessage="handleclosemessage"/></div> -->
    <!-- 隐藏聊天内容的叉叉要到其它地方不上 -->
    <div class="section3-wrapper" :class="{ expanded: isSection2Collapsed }">
      <!-- 折叠/展开按钮 - 始终显示 -->
      <button 
        @click="toggleSection2" 
        class="toggle-section2-btn"
        :title="isSection2Collapsed ? '展开列表' : '折叠列表'"
      >
        <ChevronRight v-if="isSection2Collapsed" :size="20" />
        <ChevronLeft v-else :size="20" />
      </button>
      
      <Transition name="slide-fade" mode="out-in">
        <router-view
          v-if="showcontent"
          class="section3"
          :key="$route.path"
          @closemessage="hidecontent"
        />
        <WelcomeDashboard v-else class="section3" key="welcome" />
      </Transition>
    </div>
  </div>
</template>

<script setup>
import Sidebar from './Sidebar.vue'
import LastChats from './LastChats.vue'
import Contacts from './Contacts.vue'
import ChatRoomListPanel from './ChatRoomListPanel.vue'
import BottomNavbar from './BottomNavbar.vue'
import WelcomeDashboard from './WelcomeDashboard.vue'
import AIAssistantPanel from './AIAssistantPanel.vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { onMounted, ref, watch, computed } from 'vue'
import { nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useChatStore } from '../stores/useChatStore'

const theme = ref('beige')
const container = ref(null)
const router = useRouter()
const route = useRoute()
const chatStore = useChatStore()

const showlastchats = ref(true)
const showcontacts = ref(false)
const showchatrooms = ref(false)
const showcontent = ref(false)
const showAIPanel = ref(false)
const isSection2Collapsed = ref(false)

const isMobile = ref(false)

// 当前私聊上下文（供 AI 助手使用）
const privateChatContext = computed(() => {
  if (route.path.includes('/chatdetail') && route.query.userId) {
    return {
      chatType: 'private',
      targetId: route.query.userId,
      targetName: route.query.uname || '好友'
    }
  }
  return null
})

// 切换 AI 面板
function toggleAIPanel() {
  showAIPanel.value = !showAIPanel.value
}

// 切换 section2 折叠状态
function toggleSection2() {
  isSection2Collapsed.value = !isSection2Collapsed.value
}

//这里处理contacts板块的显示和隐藏
function handlehidechat(message) {
  showlastchats.value = false
}
function handleshowchat(message) {
  router.push('/chats')
}

//这里处理contacts板块的显示和隐藏
function handleshowcontacts(message) {
  router.push('/contacts')
}

function handlehidecontacts(message) {
  showcontacts.value = false
}

//这里处理chatrooms板块的显示和隐藏
function handleshowchatrooms(message) {
  router.push('/chatrooms')
}

function handlehidechatrooms(message) {
  showchatrooms.value = false
}

function setcolor(data) {
  theme.value = data.color
  container.value.setAttribute('data-theme', theme.value)
}

//显示聊天内容
function showdetail({ uname, img, userId }) {
  showcontent.value = true

  // 设置当前聊天用户
  if (userId) {
    chatStore.switchChatUser(userId)
  }

  router.push({
    path: '/chatdetail',
    query: { uname, img, userId },
  })
}

function showAI() {
  // 移动端点击 AI 按钮也打开面板
  showAIPanel.value = true
}

function hidecontent() {
  if (showcontent.value) {
    showcontent.value = false
    // Return to base route when closing content to show dashboard
    router.push('/')
  }
}

function checkScreen() {
  isMobile.value = window.innerWidth <= 768
}

// Check current route to set showcontent state
function checkRoute() {
  const path = router.currentRoute.value.path
  const meta = router.currentRoute.value.meta

  // 根据路由 meta 设置显示状态
  if (meta.showChats) {
    showlastchats.value = true
    showcontacts.value = false
    showchatrooms.value = false
    showcontent.value = false
  } else if (meta.showContacts) {
    showlastchats.value = false
    showcontacts.value = true
    showchatrooms.value = false
    showcontent.value = false
  } else if (meta.showChatRooms) {
    showlastchats.value = false
    showcontacts.value = false
    showchatrooms.value = true
    showcontent.value = true // 显示 router-view 中的 ChatRoomWelcome
  } else if (path.includes('/chatdetail') || path.includes('/chatroom-detail')) {
    showcontent.value = true
    // 自动折叠列表（仅在聊天室详情页）
    if (path.includes('/chatroom-detail')) {
      isSection2Collapsed.value = true
      // 保持聊天室列表显示
      showlastchats.value = false
      showcontacts.value = false
      showchatrooms.value = true
    }
  } else if (path === '/' || path === '/chatbox') {
    showcontent.value = false
    // 返回首页时默认显示聊天列表
    showlastchats.value = true
    showcontacts.value = false
    showchatrooms.value = false
  }
}

onMounted(() => {
  checkScreen()
  checkRoute()
  window.addEventListener('resize', checkScreen)
  nextTick(() => {
    container.value.setAttribute('data-theme', theme.value)
  })
})

// Watch route changes to update showcontent and sidebar state
watch(
  () => router.currentRoute.value.path,
  (newPath) => {
    const meta = router.currentRoute.value.meta

    if (meta.showChats) {
      showlastchats.value = true
      showcontacts.value = false
      showchatrooms.value = false
      showcontent.value = false
    } else if (meta.showContacts) {
      showlastchats.value = false
      showcontacts.value = true
      showchatrooms.value = false
      showcontent.value = false
    } else if (meta.showChatRooms) {
      showlastchats.value = false
      showcontacts.value = false
      showchatrooms.value = true
      showcontent.value = true // 显示 router-view 中的 ChatRoomWelcome
      isSection2Collapsed.value = false // 返回聊天室列表时展开
    } else if (newPath.includes('/chatdetail') || newPath.includes('/chatroom-detail')) {
      showcontent.value = true
      // 自动折叠列表（仅在聊天室详情页）
      if (newPath.includes('/chatroom-detail')) {
        isSection2Collapsed.value = true
        // 显示聊天室列表
        showlastchats.value = false
        showcontacts.value = false
        showchatrooms.value = true
      }
    } else if (newPath === '/' || newPath === '/chatbox') {
      showcontent.value = false
      // 返回首页时默认显示聊天列表
      if (!showcontacts.value && !showchatrooms.value) {
        showlastchats.value = true
      }
    }
  }
)
</script>

<style scoped lang="scss">
/* 换肤的颜色库 */
[data-theme='beige'] {
  --bg-color: #f9f9f9;
  --text-color: #444444;
}

/* 晴空蓝白 */
[data-theme='mist'] {
  --bg-color: rgba(220, 225, 230, 1);
  --text-color: #2c3e50;
}

/* 杏仁橙色，或者说是杏黄色 */
[data-theme='apricot'] {
  --bg-color: rgba(255, 235, 215, 1);
  --text-color: #5c4033;
}

.container {
  /* margin: 5vh 10vw; */
  border-radius: 1rem;
  flex: 1;
  display: flex;
  box-shadow: 0 0 5px 1px rgba(0, 0, 0, 0.5);
  -webkit-app-region: drag;
  max-height: 100vh;
  background: var(--bg-color);
  color: var(--text-color);
  transition: all 1.5s ease-in;
}

.section1,
.section2,
.section3 {
  max-height: 100%;
  border-radius: 1rem;
  background-color: transparent;
}
.section1 {
  flex: 0 0 8%;
}

.section2-wrapper {
  flex: 0 0 30%;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &.collapsed {
    flex: 0 0 0%;
    width: 0;
    min-width: 0;
  }
}

.section2 {
  width: 100%;
  height: 100%;
  border: 1px solid gray;
  border-top: none;
  border-bottom: none;
  overflow: hidden;
  box-sizing: border-box;
  /* display: flex; */
}

.section3-wrapper {
  flex: 1 1 62%;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  transition: all 0.3s ease;
  
  &.expanded {
    flex: 1 1 92%;
  }
}

.toggle-section2-btn {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  width: 28px;
  height: 56px;
  border: none;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 0 8px 8px 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  
  &:hover {
    background: white;
    color: rgb(165, 42, 42);
    width: 32px;
    box-shadow: 2px 0 12px rgba(0, 0, 0, 0.15);
  }
  
  &:active {
    transform: translateY(-50%) scale(0.95);
  }
}

.section3 {
  flex: 1;
  height: 100%;
}

.mobile {
  flex: 1;
  transition: all 0s;
  border: none;
  border-radius: 0;
}

/* 响应式布局 - 大屏幕 */
@media (min-width: 1300px) {
  .container {
    margin: 5vh 10vw;
    border-radius: 1rem;
  }
}

/* 响应式布局 - 中等屏幕 */
@media (max-width: 1299px) and (min-width: 1025px) {
  .container {
    margin: 2vh 5vw;
    border-radius: 0.8rem;
  }
}

/* 响应式布局 - 平板设备 */
@media (max-width: 1024px) and (min-width: 769px) {
  .container {
    border-radius: 0.5rem;
    margin: 1vh 2vw;
  }

  .section1 {
    flex: 0 0 10%;
  }

  .section2-wrapper {
    flex: 0 0 35%;
  }

  .section3-wrapper {
    flex: 1 1 55%;
  }
}

/* 响应式布局 - 移动设备 */
@media (max-width: 768px) {
  .container:not(.mobile) {
    border-radius: 0;
    margin: 0;
    height: 100vh;
  }

  .container:not(.mobile) .section1 {
    display: none;
  }

  .container:not(.mobile) .section2-wrapper {
    flex: 1;
  }

  .container:not(.mobile) .section2 {
    border: none;
    border-radius: 0;
  }

  .container:not(.mobile) .section3-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    z-index: 100; /* 降低 z-index，低于底部导航栏 */
    background: var(--bg-tertiary, white);
    border-radius: 0;
    pointer-events: auto;
  }
}

/* 移动端专用样式 */
.mobile {
  flex: 1;
  transition: all 0s;
  border: none;
  border-radius: 0;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.mobile .main-content {
  flex: 1;
  overflow: hidden;
  padding-bottom: 75px; /* 为底部导航栏留出空间 */
}

.mobile .section2 {
  height: calc(100vh - 75px); /* 减去底部导航栏高度 */
  border: none;
  overflow-y: auto;
}

.mobile .section3 {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  z-index: 100; /* 降低 z-index，低于底部导航栏 */
  background: var(--bg-tertiary, white);
}

/* 小屏移动设备 */
@media (max-width: 480px) {
  .container {
    font-size: 14px;
  }

  .section2,
  .section3 {
    padding: 0;
  }
}

/* 横屏适配 */
@media (orientation: landscape) and (max-height: 500px) {
  .container {
    height: 100vh;
  }

  .mobile .section2,
  .mobile .section3 {
    height: 100vh;
  }
}

/* 页面切换过渡动画 */
.slide-fade-enter-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 1, 1);
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* 移动端滑动动画更明显 */
@media (max-width: 768px) {
  .slide-fade-enter-from {
    transform: translateX(100%);
  }

  .slide-fade-leave-to {
    transform: translateX(-30%);
  }
}
</style>
