<template>
  <div class="chatroom-detail-container">
    <div v-if="!currentRoom" class="welcome-state">
      <div class="welcome-icon-wrapper">
        <Code class="welcome-icon" :size="100" />
      </div>
      <p class="welcome-text">选择一个技术聊天室开始交流</p>
    </div>

    <div v-else class="chatroom-content">
      <!-- 聊天室头部 -->
      <div class="chat-header">
        <!-- 移动端返回按钮 -->
        <button class="back-btn mobile-only" @click="backToList">
          <i>←</i>
        </button>
        
        <div class="room-info">
          <div class="room-avatar-wrapper">
            <div class="room-icon-header">
              <Code :size="24" />
            </div>
          </div>
          <div class="info">
            <h3>{{ currentRoom.RoomName }}</h3>
            <div class="room-stats">
              <span v-if="currentRoom.techDirection" class="tech-tag">
                {{ currentRoom.techDirection }}
              </span>
              <span class="online-count">
                <span class="online-dot"></span>
                {{ onlineCount }} 在线
              </span>
              <span class="member-count">{{ currentRoom.Members?.length || 0 }} 参与过</span>
            </div>
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

      <!-- 消息列表 - 双栏布局 -->
      <div class="message-area">
        <!-- 左侧：代码和问题讨论区 -->
        <div class="main-discussion">
          <div class="discussion-header">
            <h4>技术讨论</h4>
            <span class="message-count">{{ codeMessages.length }} 条</span>
          </div>
          <div class="discussion-list" ref="discussionListRef">
            <!-- AI 思考状态 -->
            <div v-if="isAIThinking" class="ai-thinking">
              <div class="thinking-avatar">
                <img src="/images/ds.jpg" alt="AI" />
              </div>
              <div class="thinking-text">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
                AI 正在思考...
              </div>
            </div>
            
            <div 
              v-for="(message, index) in codeMessages" 
              :key="message._id || index" 
              :data-message-id="message._id"
              class="discussion-item"
            >
              <!-- AI 消息 -->
              <ChatRoomAIMessage 
                v-if="message.from === 'AI' || message.isAI"
                :message="message"
                @copy="copyToClipboard"
              />
              
              <!-- 代码消息 -->
              <CodeMessage 
                v-else-if="message.messageType === 'code'"
                :message="message"
                :isMyMessage="message.from === currentUserId"
                :myAvatar="myAvatar"
                @reply="handleReply(message)"
                @favorite="handleFavorite"
                @contextmenu.prevent="showContextMenu($event, message)"
              />
              <!-- 技术问题消息 -->
              <div 
                v-else 
                class="question-message" 
                :class="{ 'is-mine': message.from === currentUserId }"
                @contextmenu.prevent="showContextMenu($event, message)"
              >
                <div class="message-header">
                  <img 
                    v-if="message.fromAvatar"
                    :src="message.fromAvatar.startsWith('http') ? message.fromAvatar : baseUrl + message.fromAvatar" 
                    class="user-avatar" 
                    @error="e => e.target.style.display = 'none'"
                  />
                  <div v-else class="user-avatar-placeholder">
                    {{ (message.fromName || '?')[0].toUpperCase() }}
                  </div>
                  <div class="message-info">
                    <span class="user-name" :class="{ 'is-me': message.from === currentUserId }">
                      {{ message.fromName || '未知用户' }}
                    </span>
                    <span class="message-time">{{ formatTime(message.time || message.createdAt) }}</span>
                  </div>
                  <button @click="handleReply(message)" class="reply-btn" title="回复">
                    <MessageCircle :size="16" />
                  </button>
                </div>
                <div class="message-content">
                  {{ message.content }}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 右侧：快速讨论区（弹幕式） -->
        <div class="quick-chat">
          <div class="chat-header-mini">
            <h4>快速讨论</h4>
          </div>
          <div class="chat-messages" ref="messageListRef">
            <div 
              v-for="(message, index) in textMessages" 
              :key="message._id || index" 
              class="chat-message" 
              :class="{ 'is-mine': message.from === currentUserId }"
              @contextmenu.prevent="showContextMenu($event, message)"
            >
              <!-- 引用的消息 -->
              <div 
                v-if="message.quotedMessage && message.quotedMessage.content" 
                class="quoted-message"
                @click="scrollToMessage(message.quotedMessage.id)"
              >
                <MessageCircle :size="12" />
                <span class="quoted-text">
                  {{ message.quotedMessage.fromName }}: 
                  {{ (message.quotedMessage.content || '').substring(0, 30) }}{{ (message.quotedMessage.content || '').length > 30 ? '...' : '' }}
                </span>
              </div>
              
              <!-- 消息内容 -->
              <div class="message-main">
                <div class="message-header-line">
                  <span class="msg-time">{{ formatTime(message.time || message.createdAt) }}</span>
                  <span class="msg-user" :class="{ 'is-me': message.from === currentUserId }">
                    {{ message.fromName || '未知用户' }}
                  </span>
                </div>
                <div class="msg-text">{{ message.content }}</div>
              </div>
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
          <button @click="insertAIMention" class="toolbar-btn ai-btn" title="询问 AI">
            <Sparkles :size="18" />
            <span class="ai-text">AI</span>
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
          <!-- 引用提示 -->
          <div v-if="replyingTo" class="reply-preview">
            <div class="reply-content">
              <MessageCircle :size="14" />
              <div class="reply-info">
                <span class="reply-to">回复 {{ replyingTo.fromName }}</span>
                <span class="reply-text">
                  {{ (replyingTo.content || '').substring(0, 50) }}{{ (replyingTo.content || '').length > 50 ? '...' : '' }}
                </span>
              </div>
            </div>
            <button @click="cancelReply" class="cancel-reply-btn" title="取消回复">×</button>
          </div>
          
          <div class="input-row">
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

    <!-- AI 总结对话框 -->
    <SummaryDialog
      v-if="showSummaryDialog && currentRoom"
      chatType="chatroom"
      :targetId="currentRoom.RoomID"
      :targetName="currentRoom.RoomName"
      @close="showSummaryDialog = false"
    />

    <!-- 右键菜单 -->
    <MessageContextMenu
      :visible="contextMenu.visible"
      :position="contextMenu.position"
      :canDelete="contextMenu.message?.from === currentUserId"
      :isFavorited="checkIfFavorited(contextMenu.message)"
      @close="closeContextMenu"
      @action="handleContextMenuAction"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Code, FileText, HelpCircle, Send, MessageCircle, Sparkles } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { io } from 'socket.io-client'
import ChatRoomDetail from '../components/ChatRoomDetail.vue'
import CodeMessage from '../components/CodeMessage.vue'
import CodeInput from '../components/CodeInput.vue'
import SummaryDialog from '../components/SummaryDialog.vue'
import ChatRoomAIMessage from '../components/ChatRoomAIMessage.vue'
import MessageContextMenu from '../components/MessageContextMenu.vue'
import { useToast } from '../composables/useToast'

const route = useRoute()
const router = useRouter()
const baseUrl = import.meta.env.VITE_BASE_URL
const toast = useToast()

const emit = defineEmits(['closemessage'])

const currentRoom = ref(null)
const messages = ref([])
const currentUserId = ref('')
const myAvatar = ref('')
const showRoomDetail = ref(false)
const showSummaryDialog = ref(false)
const showCodeInput = ref(false)
const messageInput = ref('')
const messageListRef = ref(null)
const discussionListRef = ref(null)
const replyingTo = ref(null) // 正在回复的消息
const onlineCount = ref(0) // 在线人数
const isAIThinking = ref(false) // AI 思考状态

// 右键菜单状态
const contextMenu = ref({
  visible: false,
  position: { x: 0, y: 0 },
  message: null
})

let socket = null

// 分离代码/问题消息和普通文本消息
const codeMessages = computed(() => {
  const filtered = messages.value.filter(msg => 
    msg.messageType === 'code' || msg.isQuestion || msg.messageType === 'system'
  )
  console.log('🔍 代码消息列表:', filtered.map(m => ({
    type: m.messageType,
    from: m.from,
    fromName: m.fromName,
    fromAvatar: m.fromAvatar,
    isQuestion: m.isQuestion
  })))
  return filtered
})

const textMessages = computed(() => {
  const filtered = messages.value.filter(msg => 
    msg.messageType === 'text' && !msg.isQuestion
  )
  console.log('🔍 文本消息列表:', filtered.map(m => ({
    from: m.from,
    fromName: m.fromName,
    content: m.content
  })))
  return filtered
})

async function loadCurrentUser() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${baseUrl}/api/user/info`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    currentUserId.value = String(res.data.user?.uID || res.data.id || res.data.uID)
    myAvatar.value = res.data.user?.uAvatar || '/images/avatar/default-avatar.webp'
  } catch (err) {
    console.error('获取用户信息失败:', err)
  }
}

async function loadRoom() {
  const roomId = route.query.roomId
  if (!roomId) {
    toast.error('聊天室ID不存在')
    return
  }

  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${baseUrl}/room/${roomId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.data.success) {
      currentRoom.value = res.data.room
      await loadMessages()
    }
  } catch (err) {
    console.error('加载聊天室失败:', err)
    toast.error('加载聊天室失败')
  }
}

async function loadMessages() {
  if (!currentRoom.value) return
  
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(
      `${baseUrl}/room/${currentRoom.value.RoomID}/messages?limit=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (res.data.success) {
      messages.value = res.data.messages
      console.log('📨 加载的消息数量:', messages.value.length)
      console.log('📨 第一条消息详情:', messages.value[0])
      console.log('👤 当前用户ID:', currentUserId.value)
      
      // 检查消息分类
      const code = messages.value.filter(msg => msg.messageType === 'code' || msg.isQuestion || msg.messageType === 'system')
      const text = messages.value.filter(msg => msg.messageType === 'text' && !msg.isQuestion)
      console.log('💬 代码/问题消息数量:', code.length)
      console.log('💬 普通文本消息数量:', text.length)
      
      scrollToBottom()
    }
  } catch (err) {
    console.error('加载消息失败:', err)
    toast.error('加载消息失败')
  }
}

function handleSendMessage() {
  if (!messageInput.value.trim()) return
  
  const content = messageInput.value.trim()
  
  // 检测 @AI 标记
  if (content.startsWith('@AI ') || content.startsWith('@ai ')) {
    const question = content.replace(/^@AI /i, '').trim()
    if (question) {
      // 先发送用户的问题消息
      sendMessage(content)
      // 然后调用 AI
      askAI(question)
      messageInput.value = ''
      return
    }
  }
  
  // 如果有引用消息，发送时带上引用信息
  if (replyingTo.value) {
    sendMessageWithReply(content, replyingTo.value)
    replyingTo.value = null
  } else {
    sendMessage(content)
  }
  
  messageInput.value = ''
}

function handleReply(message) {
  replyingTo.value = {
    id: message._id,
    content: message.content || '代码片段',
    fromName: message.fromName,
    messageType: message.messageType
  }
  // 聚焦到输入框
  nextTick(() => {
    const input = document.querySelector('.message-input')
    if (input) input.focus()
  })
}

function cancelReply() {
  replyingTo.value = null
}

function scrollToMessage(messageId) {
  if (!messageId) return
  
  // 查找目标消息元素
  const targetElement = document.querySelector(`[data-message-id="${messageId}"]`)
  
  if (targetElement && discussionListRef.value) {
    // 滚动到目标消息
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    
    // 添加高亮效果
    targetElement.classList.add('highlight-message')
    setTimeout(() => {
      targetElement.classList.remove('highlight-message')
    }, 2000)
  } else {
    toast.info('原消息未找到')
  }
}

function initSocket() {
  socket = io(baseUrl, {
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: true
  })

  socket.on('connect', () => {
    console.log('✅ Socket 已连接')
    // 加入当前聊天室
    if (currentRoom.value) {
      socket.emit('join-room', currentRoom.value.RoomID)
      socket.emit('join-group', {
        roomId: currentRoom.value.RoomID,
        userId: currentUserId.value
      })
      console.log(`🏠 加入聊天室: ${currentRoom.value.RoomID}`)
    }
  })

  socket.on('disconnect', () => {
    console.log('❌ Socket 已断开')
  })

  // 监听在线人数更新
  socket.on('online-count', (data) => {
    console.log('👥 在线人数更新:', data.count)
    onlineCount.value = data.count
  })

  socket.on('group-message', (data) => {
    console.log('📨 收到新消息:', data)
    
    // 检查是否是当前聊天室的消息
    if (currentRoom.value && data.roomId === currentRoom.value.RoomID) {
      // 检查消息是否已存在（避免重复）
      const exists = messages.value.some(msg => msg._id === data._id)
      if (!exists) {
        messages.value.push(data)
        scrollToBottom()
      }
    }
  })

  socket.on('connect_error', (error) => {
    console.error('Socket 连接错误:', error)
  })
}

function cleanupSocket() {
  if (socket) {
    // 离开当前聊天室
    if (currentRoom.value) {
      socket.emit('leave-room', currentRoom.value.RoomID)
    }
    socket.disconnect()
    socket = null
  }
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
        messageType: 'text',
        isQuestion: content.includes('【问题描述】')
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

async function sendMessageWithReply(content, quotedMsg) {
  try {
    const token = localStorage.getItem('token')
    await axios.post(
      `${baseUrl}/room/${currentRoom.value.RoomID}/messages`,
      {
        content: content,
        messageType: 'text',
        quotedMessage: quotedMsg
      },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    await loadMessages()
    scrollToBottom()
    toast.success('回复发送成功')
  } catch (err) {
    console.error('发送回复失败:', err)
    toast.error('发送回复失败')
  }
}

function insertQuestionTemplate() {
  messageInput.value = `【问题描述】\n\n【相关代码】\n\n【报错信息】\n\n【已尝试方案】\n`
}

function insertAIMention() {
  messageInput.value = '@AI '
  // 聚焦输入框
  nextTick(() => {
    const textarea = document.querySelector('.message-input')
    if (textarea) textarea.focus()
  })
}

async function askAI(question) {
  try {
    isAIThinking.value = true
    const token = localStorage.getItem('token')
    
    console.log('🤖 向 AI 提问:', question)
    
    const res = await axios.post(
      `${baseUrl}/api/chatroom-ai/ask`,
      {
        roomId: currentRoom.value.RoomID,
        question: question,
        useRAG: true
      },
      { 
        headers: { Authorization: `Bearer ${token}` },
        timeout: 120000 // 2分钟超时
      }
    )
    
    if (res.data.success) {
      toast.success('AI 回答已生成')
      // AI 消息会通过 Socket.IO 实时推送，或者直接添加到消息列表
      if (res.data.messageId) {
        // 如果后端返回了消息ID，等待 Socket 推送
        console.log('✅ AI 消息ID:', res.data.messageId)
      }
    }
  } catch (err) {
    console.error('❌ AI 问答失败:', err)
    toast.error(err.response?.data?.message || 'AI 问答失败')
  } finally {
    isAIThinking.value = false
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    toast.success('已复制到剪贴板')
  }).catch(() => {
    toast.error('复制失败')
  })
}

async function handleFavorite(data) {
  try {
    const token = localStorage.getItem('token')
    
    if (data.isFavorited) {
      // 添加收藏
      await axios.post(
        `${baseUrl}/api/favorites`,
        {
          messageId: data.messageId,
          messageType: 'chatroom',
          chatId: currentRoom.value.RoomID
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('收藏成功')
    } else {
      // 取消收藏
      await axios.delete(
        `${baseUrl}/api/favorites/${data.messageId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success('取消收藏')
    }
  } catch (err) {
    console.error('收藏操作失败:', err)
    toast.error(err.response?.data?.message || '操作失败')
  }
}

// 右键菜单相关函数
function showContextMenu(event, message) {
  contextMenu.value = {
    visible: true,
    position: {
      x: event.clientX,
      y: event.clientY
    },
    message
  }
}

function closeContextMenu() {
  contextMenu.value.visible = false
}

function checkIfFavorited(message) {
  // TODO: 实现检查收藏状态的逻辑
  // 可以在加载消息时同时加载收藏状态，或者维护一个收藏ID的Set
  return false
}

async function handleContextMenuAction(action) {
  const message = contextMenu.value.message
  if (!message) return
  
  try {
    const token = localStorage.getItem('token')
    
    switch (action) {
      case 'favorite':
        // 切换收藏状态
        const isFavorited = checkIfFavorited(message)
        if (isFavorited) {
          // 取消收藏
          await axios.delete(
            `${baseUrl}/api/favorites/${message._id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          toast.success('取消收藏')
        } else {
          // 添加收藏
          await axios.post(
            `${baseUrl}/api/favorites`,
            {
              messageId: message._id,
              messageType: 'chatroom',
              chatId: currentRoom.value.RoomID
            },
            { headers: { Authorization: `Bearer ${token}` } }
          )
          toast.success('收藏成功')
        }
        break
        
      case 'copy':
        // 复制消息内容
        const textToCopy = message.codeInfo?.code || message.content || ''
        await navigator.clipboard.writeText(textToCopy)
        toast.success('已复制到剪贴板')
        break
        
      case 'reply':
        // 引用回复
        handleReply(message)
        break
        
      case 'forward':
        // TODO: 实现转发功能
        toast.info('转发功能开发中')
        break
        
      case 'delete':
        // 删除消息（仅自己的消息）
        if (message.from === currentUserId.value) {
          if (confirm('确定要删除这条消息吗？')) {
            await axios.delete(
              `${baseUrl}/room/${currentRoom.value.RoomID}/messages/${message._id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            toast.success('消息已删除')
            await loadMessages()
          }
        }
        break
    }
  } catch (err) {
    console.error('操作失败:', err)
    toast.error(err.response?.data?.message || '操作失败')
  }
}

function formatTime(time) {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  
  return date.toLocaleString('zh-CN', { 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

function scrollToBottom() {
  nextTick(() => {
    if (discussionListRef.value) {
      discussionListRef.value.scrollTop = discussionListRef.value.scrollHeight
    }
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

function handleRoomUpdate() {
  loadMessages()
}

function backToList() {
  emit('closemessage')
}

// 监听路由变化，重新加载聊天室
watch(() => route.query.roomId, (newRoomId, oldRoomId) => {
  if (newRoomId) {
    // 离开旧房间
    if (oldRoomId && socket) {
      socket.emit('leave-room', oldRoomId)
    }
    
    // 加载新房间
    loadRoom()
    
    // 加入新房间
    if (socket && socket.connected) {
      socket.emit('join-room', newRoomId)
      socket.emit('join-group', {
        roomId: newRoomId,
        userId: currentUserId.value
      })
    }
  }
})

onMounted(async () => {
  await loadCurrentUser()
  await loadRoom()
  initSocket()
})

onUnmounted(() => {
  cleanupSocket()
})
</script>

<style scoped lang="scss">
.chatroom-detail-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f7fa;
  position: relative;
}

.welcome-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: var(--bg-tertiary, #ffffff);
  
  .welcome-icon-wrapper {
    margin-bottom: 32px;
    
    .welcome-icon {
      color: rgb(165, 42, 42);
      opacity: 0.5;
      width: 100px;
      height: 100px;
    }
  }
  
  .welcome-text {
    font-size: 16px;
    color: #c0c0c0;
    margin: 0;
    font-weight: 400;
  }
}

.chatroom-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e8e8e8;
  background: #ffffff;
  flex-shrink: 0;
  
  .back-btn {
    display: none;
  }
  
  .room-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    
    .room-avatar-wrapper {
      .room-icon-header {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        background: linear-gradient(135deg, rgb(165, 42, 42) 0%, rgb(140, 30, 30) 100%);
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
        color: #333;
      }
      
      .room-stats {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 12px;
      }
      
      .tech-tag {
        font-size: 11px;
        padding: 2px 8px;
        background: rgb(165, 42, 42);
        color: white;
        border-radius: 3px;
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .online-count {
        color: #52c41a;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 4px;
        
        .online-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #52c41a;
          animation: pulse 2s infinite;
        }
      }
      
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
      
      .member-count {
        color: #999;
      }
      
      span {
        font-size: 12px;
        color: #999;
      }
    }
  }
  
  .header-actions {
    display: flex;
    gap: 8px;
    
    button {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
      transition: all 0.2s;
      
      &:hover {
        background: #f5f5f5;
        color: #333;
      }
      
      .action-icon {
        width: 18px;
        height: 18px;
      }
      
      i {
        font-style: normal;
        font-size: 16px;
      }
    }
  }
}

/* 双栏布局 */
.message-area {
  flex: 1;
  display: flex;
  gap: 1px;
  background: #e8e8e8;
  overflow: hidden;
}

/* 左侧：技术讨论区 */
.main-discussion {
  flex: 0 0 70%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  overflow: hidden;
  
  .discussion-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #e8e8e8;
    background: #fafafa;
    flex-shrink: 0;
    
    h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }
    
    .message-count {
      font-size: 12px;
      color: #999;
      background: #f0f0f0;
      padding: 2px 8px;
      border-radius: 10px;
    }
  }
  
  .discussion-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: #d0d0d0;
      border-radius: 3px;
      
      &:hover {
        background: #b0b0b0;
      }
    }
  }
  
  .discussion-item {
    animation: slideIn 0.2s ease-out;
    
    &.highlight-message {
      animation: highlight 2s ease-out;
    }
  }
  
  @keyframes highlight {
    0% {
      background: rgba(165, 42, 42, 0.2);
      transform: scale(1.02);
    }
    50% {
      background: rgba(165, 42, 42, 0.1);
    }
    100% {
      background: transparent;
      transform: scale(1);
    }
  }
  
  /* 技术问题消息样式（类似群聊） */
  .question-message {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 8px;
    border-left: 3px solid #e0e0e0;
    transition: all 0.2s;
    
    &.is-mine {
      border-left-color: rgb(165, 42, 42);
    }
    
    .message-header {
      display: flex;
      align-items: center;
      gap: 10px;
      
      .user-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        object-fit: cover;
      }
      
      .user-avatar-placeholder {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, rgb(165, 42, 42) 0%, rgb(140, 30, 30) 100%);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 600;
        flex-shrink: 0;
      }
      
      .message-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
        
        .user-name {
          font-size: 13px;
          font-weight: 600;
          color: #333;
          
          &.is-me {
            color: rgb(165, 42, 42);
          }
        }
        
        .message-time {
          font-size: 11px;
          color: #999;
        }
      }
      
      .reply-btn {
        margin-left: auto;
        padding: 4px 8px;
        border: none;
        background: transparent;
        color: #999;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        transition: all 0.2s;
        
        &:hover {
          background: #f0f0f0;
          color: rgb(165, 42, 42);
        }
      }
    }
    
    .message-content {
      font-size: 14px;
      color: #333;
      line-height: 1.6;
      padding-left: 42px;
      white-space: pre-wrap;
      word-break: break-word;
    }
  }
}

/* 右侧：快速讨论区（弹幕式） */
.quick-chat {
  flex: 0 0 30%;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  overflow: hidden;
  
  .chat-header-mini {
    padding: 12px 16px;
    border-bottom: 1px solid #e8e8e8;
    background: #ffffff;
    flex-shrink: 0;
    
    h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }
  }
  
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    
    &::-webkit-scrollbar {
      width: 4px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: #d0d0d0;
      border-radius: 2px;
      
      &:hover {
        background: #b0b0b0;
      }
    }
  }
  
  /* 弹幕式消息 */
  .chat-message {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 12px;
    background: #ffffff;
    border-radius: 6px;
    font-size: 13px;
    line-height: 1.5;
    animation: slideIn 0.2s ease-out;
    transition: background 0.2s;
    
    &:hover {
      background: #f0f2f5;
    }
    
    .quoted-message {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: #f8f9fa;
      border-left: 2px solid rgb(165, 42, 42);
      border-radius: 4px;
      font-size: 11px;
      color: #666;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        background: #e8e8e8;
        border-left-color: rgb(185, 62, 62);
        transform: translateX(2px);
      }
      
      .quoted-text {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    
    .message-main {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    
    .message-header-line {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .msg-time {
      font-size: 11px;
      color: #999;
      flex-shrink: 0;
    }
    
    .msg-user {
      font-weight: 600;
      font-size: 14px;
      color: #333;
      flex-shrink: 0;
      
      &.is-me {
        color: rgb(165, 42, 42);
      }
    }
    
    .msg-text {
      color: #333;
      font-size: 13px;
      line-height: 1.6;
      word-break: break-word;
      padding-left: 2px;
    }
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.input-container {
  border-top: 1px solid #e8e8e8;
  background: #ffffff;
  padding: 12px 16px;
  flex-shrink: 0;
  
  .input-toolbar {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
    
    .toolbar-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      height: 32px;
      padding: 0 12px;
      border: none;
      background: #f5f5f5;
      border-radius: 6px;
      cursor: pointer;
      color: #666;
      transition: all 0.2s;
      font-size: 13px;
      font-weight: 500;
      
      &:hover {
        background: #e8e8e8;
        color: #333;
      }
      
      &.ai-btn {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: white;
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        }
        
        .ai-text {
          font-weight: 600;
          font-size: 12px;
        }
      }
    }
  }
  
  .text-input-area {
    display: flex;
    flex-direction: column;
    gap: 8px;
    
    .reply-preview {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: #f8f9fa;
      border-left: 3px solid rgb(165, 42, 42);
      border-radius: 6px;
      
      .reply-content {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 0;
        
        svg {
          color: rgb(165, 42, 42);
          flex-shrink: 0;
        }
        
        .reply-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          
          .reply-to {
            font-size: 11px;
            font-weight: 600;
            color: rgb(165, 42, 42);
          }
          
          .reply-text {
            font-size: 12px;
            color: #666;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }
      
      .cancel-reply-btn {
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        color: #999;
        border-radius: 4px;
        cursor: pointer;
        font-size: 20px;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        
        &:hover {
          background: #e8e8e8;
          color: #333;
        }
      }
    }
    
    .input-row {
      display: flex;
      gap: 10px;
      align-items: flex-end;
    }
    
    .message-input {
      flex: 1;
      min-height: 40px;
      max-height: 100px;
      padding: 10px 14px;
      border: 1px solid #e8e8e8;
      border-radius: 20px;
      font-size: 14px;
      resize: none;
      font-family: inherit;
      background: #f5f7fa;
      color: #333;
      line-height: 1.5;
      
      &:focus {
        outline: none;
        border-color: rgb(165, 42, 42);
        background: #ffffff;
      }
      
      &::placeholder {
        color: #bbb;
      }
    }
    
    .send-btn {
      width: 40px;
      height: 40px;
      border: none;
      background: linear-gradient(135deg, rgb(165, 42, 42) 0%, rgb(140, 30, 30) 100%);
      color: white;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(165, 42, 42, 0.3);
      
      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(165, 42, 42, 0.4);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
}

/* AI 思考状态 */
.ai-thinking {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%);
  border-radius: 8px;
  border-left: 3px solid #6366f1;
  margin-bottom: 12px;
  animation: fadeIn 0.3s ease-out;
  
  .thinking-avatar {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    
    img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }
  }
  
  .thinking-text {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #6366f1;
    font-size: 14px;
    font-weight: 500;
    
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #6366f1;
      animation: thinking 1.4s infinite;
      
      &:nth-child(2) {
        animation-delay: 0.2s;
      }
      
      &:nth-child(3) {
        animation-delay: 0.4s;
      }
    }
  }
}

@keyframes thinking {
  0%, 60%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  30% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .mobile-only {
    display: block;
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
