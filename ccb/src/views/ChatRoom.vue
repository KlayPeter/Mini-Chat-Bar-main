<template>
  <div class="group-chat-container">
    <div class="container">
      <!-- 侧边栏 -->
      <div class="section1">
        <Sidebar 
          ref="sidebarRef"
          @toggleAI="toggleAIPanel" 
          @refreshInsights="refreshAIInsights"
          @aiAction="handleAIAction"
        />
      </div>

      <!-- 聊天室列表 -->
      <div class="section2">
        <ChatRoomList @select-room="handleSelectRoom" ref="roomListRef" />

        <!-- AI 助手面板 - 覆盖在列表上 -->
        <AIAssistantPanel 
          :visible="showAIPanel" 
          :chatContext="aiChatContext"
          @close="showAIPanel = false" 
        />
      </div>

      <!-- 聊天区域 -->
      <div class="section3-wrapper" :class="{ active: showChatArea }">
        <div v-if="!currentRoom" class="section3">
          <div class="welcome-state">
            <i class="icon"><Code class="welcome-icon" /></i>
            <p>选择一个技术聊天室开始交流</p>
          </div>
        </div>

        <div v-else class="section3 group-chat-content">
          <!-- 聊天室头部 -->
          <div class="chat-header">
            <!-- 移动端返回按钮 -->
            <button class="back-btn mobile-only" @click="backToList">
              <i>←</i>
            </button>
            
            <div class="group-info">
              <div class="group-avatar-wrapper">
                <div class="room-icon-header">
                  <Code :size="24" />
                </div>
              </div>
              <div class="info">
                <h3>{{ currentRoom.RoomName }}</h3>
                <span v-if="currentRoom.techDirection" class="tech-tag">
                  {{ currentRoom.techDirection }}
                </span>
                <span v-else>{{ currentRoom.Members?.length || 0 }} 人</span>
              </div>
            </div>
            <div class="header-actions">
              <button @click="showSummaryDialog = true" class="summary-btn" title="AI 生成总结">
                <FileText class="action-icon" />
              </button>
              <button @click="showRoomDetail = true" class="detail-btn" title="聊天室详情">
                <i>ⓘ</i>
              </button>
            </div>
          </div>

          <!-- 消息列表 -->
          <div class="message-list-wrapper">
            <div class="messages-container" ref="messageListRef">
              <div 
                v-for="(message, index) in messages" 
                :key="message._id || index" 
                class="message-wrapper"
                :data-message-id="message._id"
              >
                <!-- 引用的消息 -->
                <QuotedMessage
                  v-if="message.quotedMessage"
                  :quotedMessage="message.quotedMessage"
                  @jump-to="scrollToMessage"
                />
                
                <!-- 问题/答案标记 -->
                <QuestionBadge
                  v-if="message.isQuestion || message.isSolution"
                  :message="message"
                  :isBestAnswer="isMessageBestAnswer(message)"
                />
                
                <!-- 代码消息 -->
                <CodeMessage 
                  v-if="message.messageType === 'code'"
                  :message="message"
                  :isMyMessage="message.from === currentUserId"
                  :myAvatar="myAvatar"
                />
                <!-- 普通消息 -->
                <div v-else class="message-item" :class="{ 'my-message': message.from === currentUserId }">
                  <div class="message-avatar" v-if="message.from !== currentUserId && message.messageType !== 'system'">
                    <img :src="baseUrl + message.fromAvatar" alt="avatar" />
                  </div>
                  <div class="message-content-wrapper">
                    <div class="message-sender" v-if="message.from !== currentUserId && message.messageType !== 'system'">
                      {{ message.fromName }}
                    </div>
                    <div class="message-bubble" :class="{ 'system-message': message.messageType === 'system' }">
                      {{ message.content }}
                    </div>
                  </div>
                  <div class="message-avatar" v-if="message.from === currentUserId && message.messageType !== 'system'">
                    <img :src="baseUrl + myAvatar" alt="avatar" />
                  </div>
                </div>
                
                <!-- 消息操作按钮 - 移到消息外面 -->
                <div style="background: #f0f0f0; padding: 8px; margin: 4px 0; border-radius: 4px;">
                  <MessageActions
                    v-if="message.messageType !== 'system' && message.messageType !== 'code'"
                    :message="message"
                    :isMyMessage="message.from === currentUserId"
                    :currentUserId="currentUserId"
                    :replyingToQuestion="replyingToQuestion"
                    @reply="handleReply(message)"
                    @upvote="handleUpvote(message)"
                    @mark-question="handleMarkQuestion(message)"
                    @mark-solution="handleMarkSolution(message)"
                    @mark-best-answer="handleMarkBestAnswer(message)"
                    @quote="handleQuote(message)"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 输入区域 -->
          <div class="input-container">
            <!-- 工具栏 -->
            <div class="input-toolbar" v-if="!showCodeInput">
              <button @click="showCodeInput = true" class="toolbar-btn" title="发送代码">
                <Code :size="20" />
              </button>
              <button @click="insertQuestionTemplate" class="toolbar-btn" title="技术提问模板">
                <HelpCircle :size="20" />
              </button>
            </div>
            
            <!-- 代码输入面板 -->
            <CodeInput 
              v-if="showCodeInput"
              @send="handleSendCode"
              @cancel="showCodeInput = false"
            />
            
            <!-- 普通输入框 -->
            <div v-else class="text-input-area">
              <textarea 
                v-model="messageInput"
                @keydown.enter.exact.prevent="handleSendMessage"
                placeholder="输入消息..."
                class="message-input"
                rows="3"
              ></textarea>
              <button @click="handleSendMessage" class="send-btn" :disabled="!messageInput.trim()">
                <Send :size="20" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 聊天室详情侧边栏 -->
      <ChatRoomDetail
        v-if="showRoomDetail && currentRoom"
        :room="currentRoom"
        @close="showRoomDetail = false"
        @update="handleRoomUpdate"
      />
    </div>

    <!-- AI 总结对话框 -->
    <SummaryDialog
      v-if="showSummaryDialog && currentRoom"
      chatType="chatroom"
      :targetId="currentRoom.RoomID"
      :targetName="currentRoom.RoomName"
      @close="showSummaryDialog = false"
    />

    <!-- 移动端底部导航栏 -->
    <BottomNavbar class="mobile-only" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Code, FileText, HelpCircle, Send } from 'lucide-vue-next'
import axios from 'axios'
import Sidebar from '../components/Sidebar.vue'
import AIAssistantPanel from '../components/AIAssistantPanel.vue'
import ChatRoomList from '../components/ChatRoomList.vue'
import ChatRoomDetail from '../components/ChatRoomDetail.vue'
import CodeMessage from '../components/CodeMessage.vue'
import CodeInput from '../components/CodeInput.vue'
import BottomNavbar from '../components/BottomNavbar.vue'
import SummaryDialog from '../components/SummaryDialog.vue'
import QuestionBadge from '../components/QuestionBadge.vue'
import MessageActions from '../components/MessageActions.vue'
import QuotedMessage from '../components/QuotedMessage.vue'
import { useToast } from '../composables/useToast'

const route = useRoute()
const baseUrl = import.meta.env.VITE_BASE_URL
const toast = useToast()

const currentRoom = ref(null)
const messages = ref([])
const currentUserId = ref('')
const myAvatar = ref('')
const showRoomDetail = ref(false)
const showSummaryDialog = ref(false)
const showChatArea = ref(false)
const showAIPanel = ref(false)
const showCodeInput = ref(false)
const messageInput = ref('')
const messageListRef = ref(null)
const roomListRef = ref(null)
const sidebarRef = ref(null)
const replyingToQuestion = ref(null)
const quotingMessage = ref(null)

// AI 助手上下文
const aiChatContext = computed(() => {
  if (currentRoom.value) {
    return {
      chatType: 'chatroom',
      roomId: currentRoom.value.RoomID,
      roomName: currentRoom.value.RoomName
    }
  }
  return null
})

function toggleAIPanel() {
  showAIPanel.value = !showAIPanel.value
}

// 刷新 AI 智能提示
async function refreshAIInsights() {
  if (!currentRoom.value) return
  
  try {
    console.log('🔄 刷新 AI 智能提示...')
    const token = localStorage.getItem('token')
    const res = await axios.get(
      `${baseUrl}/api/chatroom-ai/insights/${currentRoom.value.RoomID}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    console.log('✅ AI 智能提示响应:', res.data)
    
    if (res.data.success && sidebarRef.value) {
      // 更新侧边栏的 AI 助手数据，包括 AI 播报文本
      sidebarRef.value.updateAIInsights(
        {
          suggestions: res.data.suggestions || [],
          ...res.data.insights
        },
        res.data.aiSpeech || ''
      )
    }
  } catch (err) {
    console.error('❌ 刷新 AI 智能提示失败:', err)
  }
}

// 处理 AI 操作
function handleAIAction(action) {
  console.log('AI 操作:', action)
  // 根据不同的操作类型执行相应的逻辑
  switch (action.type) {
    case 'view_questions':
    case 'show_all':
      // 滚动到第一个未解决的问题
      const firstQuestion = messages.value.find(m => m.isQuestion && m.questionStatus === 'open')
      if (firstQuestion) {
        scrollToMessage(firstQuestion._id)
      }
      break
    case 'ai_help':
    case 'ai_answer':
      // 触发 AI 回答
      if (action.questions && action.questions.length > 0) {
        handleAIProactiveAnswer(action.questions[0].id)
      }
      break
  }
}

async function handleSelectRoom(room) {
  console.log('🏠 handleSelectRoom 被调用:', room.RoomName)
  console.log('📍 sidebarRef.value:', sidebarRef.value)
  
  currentRoom.value = room
  showChatArea.value = true
  
  // AI 说欢迎语
  if (sidebarRef.value) {
    console.log('👋 调用 speakWelcome')
    sidebarRef.value.speakWelcome(room.RoomName)
  } else {
    console.log('⚠️ sidebarRef 为空')
  }
  
  // 立即刷新 AI 智能提示（不延迟）
  await refreshAIInsights()
  
  localStorage.setItem('lastChatContext', JSON.stringify({
    chatType: 'chatroom',
    roomId: room.RoomID,
    roomName: room.RoomName
  }))
  
  await loadMessages()
  scrollToBottom()
}

function backToList() {
  showChatArea.value = false
}

async function loadMessages() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(
      `${baseUrl}/room/${currentRoom.value.RoomID}/messages?limit=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (res.data.success) {
      messages.value = res.data.messages
    }
  } catch (err) {
    console.error('加载消息失败:', err)
    toast.error('加载消息失败')
  }
}

function handleSendMessage() {
  if (!messageInput.value.trim()) return
  sendMessage(messageInput.value.trim())
  messageInput.value = ''
}

async function handleSendCode(codeData) {
  try {
    const token = localStorage.getItem('token')
    await axios.post(
      `${baseUrl}/room/${currentRoom.value.RoomID}/messages`,
      {
        content: codeData.description || '发送了一段代码',
        messageType: 'code',
        codeInfo: {
          language: codeData.language,
          code: codeData.code,
          fileName: codeData.fileName
        }
      },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    showCodeInput.value = false
    await loadMessages()
    scrollToBottom()
    toast.success('代码发送成功')
  } catch (err) {
    console.error('发送代码失败:', err)
    toast.error('发送代码失败')
  }
}

async function sendMessage(content) {
  try {
    const token = localStorage.getItem('token')
    await axios.post(
      `${baseUrl}/room/${currentRoom.value.RoomID}/messages`,
      {
        content: content,
        messageType: 'text'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    await loadMessages()
    scrollToBottom()
  } catch (err) {
    console.error('发送消息失败:', err)
    toast.error('发送消息失败')
  }
}

function insertQuestionTemplate() {
  messageInput.value = `【问题描述】\n\n【相关代码】\n\n【报错信息】\n\n【已尝试方案】\n`
}

// 判断消息是否为最佳答案
function isMessageBestAnswer(message) {
  if (!message.solutionTo) return false
  const question = messages.value.find(m => m._id === message.solutionTo)
  return question?.bestAnswer === message._id
}

// 处理回复
function handleReply(message) {
  if (message.isQuestion) {
    replyingToQuestion.value = message._id
    toast.info('回复问题模式，发送的消息将标记为答案')
  }
  messageInput.value = `@${message.fromName} `
}

// 处理点赞
async function handleUpvote(message) {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.post(
      `${baseUrl}/api/question/${message._id}/upvote`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    // 更新本地消息
    const msg = messages.value.find(m => m._id === message._id)
    if (msg) {
      msg.upvoteCount = res.data.upvoteCount
      msg.upvotes = msg.upvotes || []
      if (res.data.upvoted) {
        msg.upvotes.push(currentUserId.value)
      } else {
        msg.upvotes = msg.upvotes.filter(id => id !== currentUserId.value)
      }
    }
  } catch (err) {
    console.error('点赞失败:', err)
    toast.error('操作失败')
  }
}

// 标记为问题
async function handleMarkQuestion(message) {
  try {
    const token = localStorage.getItem('token')
    await axios.post(
      `${baseUrl}/api/question/${message._id}/mark-question`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    // 更新本地消息
    const msg = messages.value.find(m => m._id === message._id)
    if (msg) {
      msg.isQuestion = true
      msg.questionStatus = 'open'
    }
    
    toast.success('已标记为问题')
  } catch (err) {
    console.error('标记失败:', err)
    toast.error(err.response?.data?.message || '标记失败')
  }
}

// 标记为答案
async function handleMarkSolution(message) {
  if (!replyingToQuestion.value) {
    toast.error('请先回复一个问题')
    return
  }
  
  try {
    const token = localStorage.getItem('token')
    await axios.post(
      `${baseUrl}/api/question/${message._id}/mark-solution`,
      { questionId: replyingToQuestion.value },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    // 更新本地消息
    const msg = messages.value.find(m => m._id === message._id)
    if (msg) {
      msg.isSolution = true
      msg.solutionTo = replyingToQuestion.value
    }
    
    replyingToQuestion.value = null
    toast.success('已标记为答案')
  } catch (err) {
    console.error('标记失败:', err)
    toast.error(err.response?.data?.message || '标记失败')
  }
}

// 标记最佳答案
async function handleMarkBestAnswer(message) {
  if (!message.solutionTo) return
  
  try {
    const token = localStorage.getItem('token')
    await axios.post(
      `${baseUrl}/api/question/${message.solutionTo}/best-answer`,
      { answerId: message._id },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    // 更新本地消息
    const question = messages.value.find(m => m._id === message.solutionTo)
    if (question) {
      question.bestAnswer = message._id
      question.questionStatus = 'solved'
    }
    
    toast.success('已标记为最佳答案')
  } catch (err) {
    console.error('标记失败:', err)
    toast.error(err.response?.data?.message || '标记失败')
  }
}

// 引用消息
function handleQuote(message) {
  quotingMessage.value = {
    id: message._id,
    content: message.content,
    fromName: message.fromName,
    messageType: message.messageType
  }
  messageInput.value = `> ${message.fromName}: ${message.content.substring(0, 50)}...\n\n`
}

// 复制消息
async function handleCopy(message) {
  try {
    await navigator.clipboard.writeText(message.content)
    toast.success('已复制')
  } catch (err) {
    toast.error('复制失败')
  }
}

// 滚动到指定消息
function scrollToMessage(messageId) {
  const element = document.querySelector(`[data-message-id="${messageId}"]`)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    element.classList.add('highlight')
    setTimeout(() => element.classList.remove('highlight'), 2000)
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

function handleRoomUpdate() {
  loadMessages()
}

onMounted(async () => {
  console.log('🎬 ChatRoom 组件挂载')
  console.log('📍 当前路由:', route.path, '查询参数:', route.query)
  
  const token = localStorage.getItem('token')
  const res = await axios.get(`${baseUrl}/api/user/info`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  currentUserId.value = String(res.data.user?.uID || res.data.id || res.data.uID)
  myAvatar.value = res.data.user?.uAvatar || '/images/avatar/default-avatar.webp'
  
  console.log('👤 当前用户ID:', currentUserId.value)
  
  // 检查是否有 roomId 参数（从邀请卡片跳转）
  if (route.query.roomId) {
    console.log('🎯 检测到 roomId 参数:', route.query.roomId)
    await handleInviteNavigation(route.query.roomId)
  } else {
    console.log('ℹ️ 没有 roomId 参数')
  }
})

// 监听路由变化，处理从其他页面跳转过来的情况
watch(() => route.query.roomId, async (newRoomId, oldRoomId) => {
  console.log('🔄 路由 roomId 变化:', oldRoomId, '->', newRoomId)
  if (newRoomId && newRoomId !== oldRoomId) {
    console.log('🎯 处理新的 roomId:', newRoomId)
    await handleInviteNavigation(newRoomId)
  }
})

async function handleInviteNavigation(roomId) {
  try {
    console.log('🔍 开始处理邀请导航，房间ID:', roomId)
    const token = localStorage.getItem('token')
    
    // 获取聊天室详情（公开聊天室会自动加入）
    console.log('📡 请求聊天室详情:', `${baseUrl}/room/${roomId}`)
    const res = await axios.get(`${baseUrl}/room/${roomId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    console.log('📦 聊天室详情响应:', res.data)
    
    if (res.data.success && res.data.room) {
      const room = res.data.room
      console.log('🏠 聊天室信息:', room.RoomName, '类型:', room.joinType)
      
      // 如果需要加入（密码或邀请码）
      if (res.data.needJoin) {
        console.log('⚠️ 需要加入验证')
        if (room.joinType === 'password') {
          toast.info('该聊天室需要密码，请输入密码加入')
          // 不自动选择房间，等待用户输入密码
          return
        }
        // invite 类型的已经在 ChatRoomInviteCard 中处理过了
        return
      }
      
      console.log('✅ 开始选择并显示聊天室')
      // 选择并显示聊天室
      await handleSelectRoom(room)
      
      // 通知 ChatRoomList 刷新并更新选中状态
      if (roomListRef.value) {
        console.log('🔄 刷新聊天室列表')
        await roomListRef.value.loadRooms()
        if (roomListRef.value.selectRoomById) {
          console.log('🎯 选中聊天室:', room.RoomID)
          roomListRef.value.selectRoomById(room.RoomID)
        }
      } else {
        console.warn('⚠️ roomListRef 不存在')
      }
      
      console.log('🎉 邀请导航处理完成')
    } else {
      console.error('❌ 聊天室数据无效')
    }
  } catch (err) {
    console.error('❌ 加载聊天室失败:', err)
    console.error('错误详情:', err.response?.data)
    toast.error(err.response?.data?.message || '加载聊天室失败')
  }
}
</script>

<style scoped lang="scss">
.group-chat-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.container {
  border-radius: 1rem;
  flex: 1;
  display: flex;
  box-shadow: 0 0 5px 1px rgba(0, 0, 0, 0.5);
  -webkit-app-region: drag;
  max-height: 100vh;
  height: 100vh;
  background: #f9f9f9;
  transition: all 1.5s ease-in;
  overflow: hidden;
  position: relative;
}

.mobile-only {
  display: none;
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
  position: relative;
  z-index: 10;
}

.section2 {
  flex: 0 0 30%;
  border: 1px solid gray;
  border-top: none;
  border-bottom: none;
  overflow: hidden;
  box-sizing: border-box;
  position: relative;
  display: flex;
}

.section3-wrapper {
  flex: 1;
  display: flex;
  min-width: 0;
  position: relative;
}

.section3 {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-tertiary);
  position: relative;
}

.welcome-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-tertiary);
  
  .icon {
    margin-bottom: 20px;
  }
  
  .welcome-icon {
    width: 80px;
    height: 80px;
    color: var(--primary-color);
  }
  
  p {
    font-size: 16px;
    margin: 0;
  }
}

.group-chat-content {
  display: flex;
  flex-direction: column;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  flex-shrink: 0;
  
  .back-btn {
    display: none;
  }
  
  .group-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    
    .group-avatar-wrapper {
      .room-icon-header {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: var(--primary-gradient);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }
    }
    
    .info {
      h3 {
        margin: 0 0 4px 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
      }
      
      .tech-tag {
        font-size: 12px;
        padding: 2px 8px;
        background: var(--primary-color);
        color: white;
        border-radius: 4px;
        font-weight: 500;
      }
      
      span {
        font-size: 13px;
        color: var(--text-secondary);
      }
    }
  }
  
  .header-actions {
    display: flex;
    gap: 8px;
    
    button {
      width: 36px;
      height: 36px;
      border: none;
      background: transparent;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      transition: all 0.2s;
      
      &:hover {
        background: var(--hover-bg);
        color: var(--primary-color);
      }
      
      .action-icon {
        width: 20px;
        height: 20px;
      }
      
      i {
        font-style: normal;
        font-size: 18px;
      }
    }
  }
}

.message-list-wrapper {
  flex: 1;
  overflow-y: auto;
  background: var(--bg-chat);
  padding: 20px;
}

.messages-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-wrapper {
  width: 100%;
}

.message-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  
  &.my-message {
    flex-direction: row-reverse;
    
    .message-content-wrapper {
      align-items: flex-end;
    }
    
    .message-bubble {
      background: var(--message-bg-user);
      color: var(--message-text-user);
      border-radius: 18px 18px 4px 18px;
    }
  }
  
  .message-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
  
  .message-content-wrapper {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 60%;
    
    .message-sender {
      font-size: 12px;
      color: var(--text-tertiary);
      padding: 0 12px;
    }
    
    .message-bubble {
      padding: 12px 16px;
      background: var(--message-bg-other);
      color: var(--message-text-other);
      border-radius: 18px 18px 18px 4px;
      word-wrap: break-word;
      word-break: break-word;
      line-height: 1.5;
      box-shadow: var(--shadow-sm);
      
      &.system-message {
        background: var(--bg-secondary);
        color: var(--text-tertiary);
        text-align: center;
        font-size: 13px;
        border-radius: 12px;
      }
    }
  }
}

.input-container {
  border-top: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  padding: 16px 20px;
  flex-shrink: 0;
  
  .input-toolbar {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    
    .toolbar-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: 1px solid var(--border-color);
      background: var(--bg-secondary);
      border-radius: 8px;
      cursor: pointer;
      color: var(--text-primary);
      transition: all 0.2s;
      
      &:hover {
        background: var(--hover-bg);
        border-color: var(--primary-color);
        color: var(--primary-color);
      }
    }
  }
  
  .text-input-area {
    display: flex;
    gap: 12px;
    align-items: flex-end;
    
    .message-input {
      flex: 1;
      min-height: 44px;
      max-height: 120px;
      padding: 12px 16px;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      font-size: 14px;
      resize: vertical;
      font-family: inherit;
      background: var(--bg-secondary);
      color: var(--text-primary);
      line-height: 1.5;
      
      &:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(165, 42, 42, 0.1);
      }
      
      &::placeholder {
        color: var(--text-tertiary);
      }
    }
    
    .send-btn {
      width: 44px;
      height: 44px;
      border: none;
      background: var(--primary-gradient);
      color: white;
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
      
      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: var(--shadow-primary);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .mobile-only {
    display: block;
  }
  
  .section1 {
    display: none;
  }
  
  .section2 {
    width: 100%;
  }
  
  .section3-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    
    &.active {
      transform: translateX(0);
    }
  }
  
  .chat-header {
    .back-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      background: transparent;
      border-radius: 50%;
      cursor: pointer;
      color: var(--text-primary);
      font-size: 20px;
      margin-right: 8px;
      
      &:hover {
        background: var(--hover-bg);
      }
      
      i {
        font-style: normal;
      }
    }
  }
}
</style>


/* 消息高亮动画 */
.message-wrapper {
  margin-bottom: 16px;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.3s;
  
  &.highlight {
    animation: highlight-flash 2s ease-in-out;
  }
}

@keyframes highlight-flash {
  0%, 100% {
    background: transparent;
  }
  50% {
    background: rgba(165, 42, 42, 0.1);
  }
}
