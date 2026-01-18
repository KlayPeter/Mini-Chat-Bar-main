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

      <!-- 消息列表 - 统一单栏布局 -->
      <div class="message-area">
        <div class="messages-container" ref="messageListRef">
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
          
          <!-- 所有消息按时间顺序显示 -->
          <div 
            v-for="(message, index) in messages" 
            :key="message._id || index" 
            :data-message-id="message._id"
            class="message-wrapper"
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
            />
            
            <!-- 普通文本消息 -->
            <div 
              v-else-if="message.messageType === 'text'"
              class="text-message" 
              :class="{ 'is-mine': String(message.from) === String(currentUserId) }"
            >
              <!-- 问题/答案标记 -->
              <QuestionBadge
                v-if="message.isQuestion || message.isSolution"
                :message="message"
                :isBestAnswer="isMessageBestAnswer(message)"
                class="message-badge"
              />
              <!-- 引用的消息 -->
              <div 
                v-if="message.quotedMessage" 
                class="quoted-message"
                @click="scrollToMessage(message.quotedMessage.id)"
              >
                <div class="quoted-header">
                  <MessageCircle :size="12" />
                  <span class="quoted-user">{{ message.quotedMessage.fromName || '未知用户' }}</span>
                </div>
                <div class="quoted-content">
                  {{ (message.quotedMessage.content || '').substring(0, 80) }}{{ (message.quotedMessage.content || '').length > 80 ? '...' : '' }}
                </div>
              </div>
              
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
                  <span class="user-name" :class="{ 'is-me': String(message.from) === String(currentUserId) }">
                    {{ message.fromName || '未知用户' }}
                  </span>
                  <span class="message-time">{{ formatTime(message.time || message.createdAt) }}</span>
                </div>
              </div>
              <div class="message-content">
                {{ message.content }}
              </div>
              
              <!-- 消息操作按钮 -->
              <MessageActions
                :message="message"
                :isMyMessage="String(message.from) === String(currentUserId)"
                :currentUserId="currentUserId"
                :replyingToQuestion="replyingToQuestion"
                @reply="handleReply(message)"
                @upvote="handleUpvote(message)"
                @mark-question="handleMarkQuestion(message)"
                @mark-solution="handleMarkSolution(message)"
                @mark-best-answer="handleMarkBestAnswer(message)"
              />
              
              <!-- 回复数量气泡（所有有回复的消息都显示） -->
              <div 
                v-if="getReplyCount(message._id) > 0"
                class="reply-count-badge"
                @click="showReplies(message)"
              >
                <MessageCircle :size="14" />
                <span>{{ getReplyCount(message._id) }} 条回复</span>
              </div>
            </div>
            
            <!-- 系统消息 -->
            <div v-else-if="message.messageType === 'system'" class="system-message">
              {{ message.content }}
            </div>
            
            <!-- 其他类型消息（兜底） -->
            <div v-else class="text-message">
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
                  <span class="user-name">{{ message.fromName || '未知用户' }}</span>
                  <span class="message-time">{{ formatTime(message.time || message.createdAt) }}</span>
                </div>
              </div>
              <div class="message-content">
                {{ message.content }}
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
    
    <!-- 回复列表弹窗 -->
    <ReplyList
      :visible="showReplyList"
      :replies="currentQuestionForReply ? getQuestionReplies(currentQuestionForReply._id) : []"
      :questionMessage="currentQuestionForReply"
      :currentUserId="currentUserId"
      @close="showReplyList = false"
      @jump="jumpToMessage"
      @mark-solution="markSolutionFromList"
      @mark-best="markBestFromList"
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
import MessageActions from '../components/MessageActions.vue'
import QuestionBadge from '../components/QuestionBadge.vue'
import QuotedMessage from '../components/QuotedMessage.vue'
import ReplyList from '../components/ReplyList.vue'
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
const replyingTo = ref(null) // 正在回复的消息
const replyingToQuestion = ref(null) // 正在回复的问题
const onlineCount = ref(0) // 在线人数
const isAIThinking = ref(false) // AI 思考状态
const showReplyList = ref(false) // 显示回复列表
const currentQuestionForReply = ref(null) // 当前查看回复的问题

// 右键菜单状态
const contextMenu = ref({
  visible: false,
  position: { x: 0, y: 0 },
  message: null
})

let socket = null

// 获取 token 的辅助函数
function getAuthHeaders() {
  const token = localStorage.getItem('token')
  return { Authorization: `Bearer ${token}` }
}

async function loadCurrentUser() {
  try {
    const res = await axios.get(`${baseUrl}/api/user/info`, {
      headers: getAuthHeaders()
    })
    currentUserId.value = String(res.data.user?.uID || res.data.id || res.data.uID)
    myAvatar.value = res.data.user?.uAvatar || '/images/avatar/default-avatar.webp'
  } catch (err) {
    console.error('获取用户信息失败:', err)
    toast.error('获取用户信息失败')
  }
}

async function loadRoom() {
  const roomId = route.query.roomId
  if (!roomId) {
    toast.error('聊天室ID不存在')
    return
  }

  try {
    const res = await axios.get(`${baseUrl}/room/${roomId}`, {
      headers: getAuthHeaders()
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
    const res = await axios.get(
      `${baseUrl}/room/${currentRoom.value.RoomID}/messages?limit=100`,
      { headers: getAuthHeaders() }
    )
    if (res.data.success) {
      messages.value = res.data.messages
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
  
  if (targetElement && messageListRef.value) {
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

// 点赞
async function handleUpvote(message) {
  try {
    const res = await axios.post(
      `${baseUrl}/api/question/${message._id}/upvote`,
      {},
      { headers: getAuthHeaders() }
    )
    
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
    toast.success(res.data.upvoted ? '已点赞' : '已取消点赞')
  } catch (err) {
    console.error('点赞失败:', err)
    toast.error('操作失败')
  }
}

// 标记为问题
async function handleMarkQuestion(message) {
  try {
    await axios.post(
      `${baseUrl}/api/question/${message._id}/mark-question`,
      {},
      { headers: getAuthHeaders() }
    )
    
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
    await axios.post(
      `${baseUrl}/api/question/${message._id}/mark-solution`,
      { questionId: replyingToQuestion.value },
      { headers: getAuthHeaders() }
    )
    
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
    await axios.post(
      `${baseUrl}/api/question/${message.solutionTo}/best-answer`,
      { answerId: message._id },
      { headers: getAuthHeaders() }
    )
    
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

// 引用消息（已移除，使用回复功能代替）

// 判断是否为最佳答案
function isMessageBestAnswer(message) {
  if (!message.solutionTo) return false
  const question = messages.value.find(m => m._id === message.solutionTo)
  return question?.bestAnswer === message._id
}

// 获取问题的回复列表
function getQuestionReplies(questionId) {
  return messages.value.filter(msg => 
    msg.quotedMessage?.id === questionId && msg._id !== questionId
  )
}

// 获取问题的回复数量
function getReplyCount(questionId) {
  return getQuestionReplies(questionId).length
}

// 显示回复列表
function showReplies(questionMessage) {
  currentQuestionForReply.value = questionMessage
  showReplyList.value = true
}

// 从回复列表跳转到消息
function jumpToMessage(messageId) {
  showReplyList.value = false
  scrollToMessage(messageId)
}

// 从回复列表标记答案
async function markSolutionFromList(answerId) {
  if (!currentQuestionForReply.value) return
  
  try {
    await axios.post(
      `${baseUrl}/api/question/${answerId}/mark-solution`,
      { questionId: currentQuestionForReply.value._id },
      { headers: getAuthHeaders() }
    )
    
    const msg = messages.value.find(m => m._id === answerId)
    if (msg) {
      msg.isSolution = true
      msg.solutionTo = currentQuestionForReply.value._id
    }
    
    toast.success('已标记为答案')
  } catch (err) {
    console.error('标记失败:', err)
    toast.error(err.response?.data?.message || '标记失败')
  }
}

// 从回复列表标记最佳答案
async function markBestFromList(answerId) {
  if (!currentQuestionForReply.value) return
  
  try {
    await axios.post(
      `${baseUrl}/api/question/${currentQuestionForReply.value._id}/best-answer`,
      { answerId: answerId },
      { headers: getAuthHeaders() }
    )
    
    if (currentQuestionForReply.value) {
      currentQuestionForReply.value.bestAnswer = answerId
      currentQuestionForReply.value.questionStatus = 'solved'
    }
    
    // 更新消息列表中的问题
    const question = messages.value.find(m => m._id === currentQuestionForReply.value._id)
    if (question) {
      question.bestAnswer = answerId
      question.questionStatus = 'solved'
    }
    
    toast.success('已标记为最佳答案')
  } catch (err) {
    console.error('标记失败:', err)
    toast.error(err.response?.data?.message || '标记失败')
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
    if (currentRoom.value) {
      socket.emit('join-room', currentRoom.value.RoomID)
      socket.emit('join-group', {
        roomId: currentRoom.value.RoomID,
        userId: currentUserId.value
      })
    }
  })

  socket.on('disconnect', () => {
    console.log('❌ Socket 已断开')
  })

  socket.on('online-count', (data) => {
    onlineCount.value = data.count
  })

  socket.on('group-message', (data) => {
    if (currentRoom.value && data.roomId === currentRoom.value.RoomID) {
      const exists = messages.value.some(msg => msg._id === data._id)
      if (!exists) {
        messages.value.push(data)
        scrollToBottom()
      }
    }
  })

  socket.on('connect_error', (error) => {
    console.error('Socket 连接错误:', error)
    toast.error('连接失败，请刷新页面')
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
      { headers: getAuthHeaders() }
    )
    
    showCodeInput.value = false
    toast.success('代码发送成功')
  } catch (err) {
    console.error('发送代码失败:', err)
    toast.error('发送代码失败')
  }
}

async function sendMessage(content) {
  try {
    await axios.post(
      `${baseUrl}/room/${currentRoom.value.RoomID}/messages`,
      {
        content: content,
        messageType: 'text',
        isQuestion: content.includes('【问题描述】')
      },
      { headers: getAuthHeaders() }
    )
  } catch (err) {
    console.error('发送消息失败:', err)
    toast.error('发送消息失败')
  }
}

async function sendMessageWithReply(content, quotedMsg) {
  try {
    await axios.post(
      `${baseUrl}/room/${currentRoom.value.RoomID}/messages`,
      {
        content: content,
        messageType: 'text',
        quotedMessage: quotedMsg
      },
      { headers: getAuthHeaders() }
    )
    
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
    
    const res = await axios.post(
      `${baseUrl}/api/chatroom-ai/ask`,
      {
        roomId: currentRoom.value.RoomID,
        question: question,
        useRAG: true
      },
      { 
        headers: getAuthHeaders(),
        timeout: 120000
      }
    )
    
    if (res.data.success) {
      toast.success('AI 回答已生成')
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
    if (data.isFavorited) {
      await axios.post(
        `${baseUrl}/api/favorites`,
        {
          messageId: data.messageId,
          messageType: 'chatroom',
          chatId: currentRoom.value.RoomID
        },
        { headers: getAuthHeaders() }
      )
      toast.success('收藏成功')
    } else {
      await axios.delete(
        `${baseUrl}/api/favorites/${data.messageId}`,
        { headers: getAuthHeaders() }
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
    switch (action) {
      case 'favorite':
        const isFavorited = checkIfFavorited(message)
        if (isFavorited) {
          await axios.delete(
            `${baseUrl}/api/favorites/${message._id}`,
            { headers: getAuthHeaders() }
          )
          toast.success('取消收藏')
        } else {
          await axios.post(
            `${baseUrl}/api/favorites`,
            {
              messageId: message._id,
              messageType: 'chatroom',
              chatId: currentRoom.value.RoomID
            },
            { headers: getAuthHeaders() }
          )
          toast.success('收藏成功')
        }
        break
        
      case 'copy':
        const textToCopy = message.codeInfo?.code || message.content || ''
        await navigator.clipboard.writeText(textToCopy)
        toast.success('已复制到剪贴板')
        break
        
      case 'reply':
        handleReply(message)
        break
        
      case 'forward':
        toast.info('转发功能开发中')
        break
        
      case 'delete':
        if (message.from === currentUserId.value) {
          if (confirm('确定要删除这条消息吗？')) {
            await axios.delete(
              `${baseUrl}/room/${currentRoom.value.RoomID}/messages/${message._id}`,
              { headers: getAuthHeaders() }
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

/* 消息区域 - 单栏布局 */
.message-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
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
  .messages-container {
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
  
  .message-wrapper {
    display: flex;
    flex-direction: column;
    gap: 8px;
    animation: slideIn 0.2s ease-out;
    
    &.highlight-message {
      animation: highlight-flash 2s ease-in-out;
    }
  }
  
  /* 文本消息样式 */
  .text-message {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 16px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    max-width: 70%;
    align-self: flex-start;
    position: relative;
    
    &.is-mine {
      align-self: flex-end;
      background: linear-gradient(135deg, #fef5f5 0%, #fff 100%);
      border: 1px solid rgba(165, 42, 42, 0.15);
      
      .message-badge {
        left: -8px;
        right: auto;
      }
    }
    
    .message-badge {
      position: absolute;
      top: -8px;
      right: -8px;
      z-index: 1;
    }
    
    .quoted-message {
      padding: 8px 12px;
      background: rgba(165, 42, 42, 0.05);
      border-left: 3px solid rgb(165, 42, 42);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 4px;
      
      &:hover {
        background: rgba(165, 42, 42, 0.1);
        transform: translateX(2px);
      }
      
      .quoted-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 4px;
        color: rgb(165, 42, 42);
        font-size: 11px;
        font-weight: 600;
      }
      
      .quoted-content {
        font-size: 12px;
        color: #666;
        line-height: 1.4;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    
    .reply-count-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: linear-gradient(135deg, rgba(165, 42, 42, 0.1) 0%, rgba(165, 42, 42, 0.05) 100%);
      border: 1px solid rgba(165, 42, 42, 0.2);
      border-radius: 20px;
      cursor: pointer;
      font-size: 13px;
      color: rgb(165, 42, 42);
      font-weight: 500;
      transition: all 0.2s;
      margin-top: 8px;
      
      svg {
        flex-shrink: 0;
      }
      
      &:hover {
        background: linear-gradient(135deg, rgba(165, 42, 42, 0.15) 0%, rgba(165, 42, 42, 0.08) 100%);
        border-color: rgba(165, 42, 42, 0.3);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(165, 42, 42, 0.15);
      }
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
      }
      
      .message-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        
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
    }
    
    .message-content {
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      word-wrap: break-word;
      white-space: pre-wrap;
    }
  }
  
  /* 系统消息 */
  .system-message {
    text-align: center;
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 16px;
    font-size: 12px;
    color: #999;
    align-self: center;
    max-width: 80%;
  }

@keyframes highlight-flash {
  0%, 100% {
    background: transparent;
  }
  50% {
    background: rgba(165, 42, 42, 0.1);
    border-radius: 12px;
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
