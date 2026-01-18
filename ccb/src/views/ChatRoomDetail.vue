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
              <span v-if="currentRoom.techDirection" class="tech-tag" :class="`tech-${currentRoom.techDirection.toLowerCase()}`">
                {{ currentRoom.techDirection }}
              </span>
              <span class="room-status" :class="roomStatusClass">
                <component :is="roomStatusIcon" :size="14" />
                {{ roomStatusText }}
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
          <!-- 倒计时显示 -->
          <div v-if="timeRemaining" class="countdown-display">
            <Clock :size="16" />
            <span class="countdown-text">{{ timeRemaining }}</span>
          </div>
          <button @click="showSummaryDialog = true" class="summary-btn" title="AI 生成总结">
            <FileText class="action-icon" />
          </button>
          <button @click="showRoomDetail = true" class="detail-btn" title="聊天室详情">
            <i>ⓘ</i>
          </button>
        </div>
      </div>

      <!-- AI 智能提示下拉 -->
      <AIInsightsDropdown
        v-if="aiInsights.totalOpenQuestions > 0 || aiInsights.hotTopics?.length > 0"
        :insights="aiInsights"
        :aiSpeech="aiSpeech"
        @jump-to-question="scrollToMessage"
        @ai-answer="handleAIProactiveAnswer"
        @show-all-questions="showAllQuestions"
      />

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
              :isMyMessage="String(message.from) === String(currentUserId)"
              :myAvatar="myAvatar"
              @reply="handleReply(message)"
              @favorite="handleFavorite"
            />
            
            <!-- 普通文本消息 -->
            <div 
              v-else-if="message.messageType === 'text'"
              class="text-message" 
              :class="{ 
                'is-mine': String(message.from) === String(currentUserId),
                'has-question-open': message.isQuestion && message.questionStatus === 'open',
                'has-question-solved': message.isQuestion && message.questionStatus === 'solved'
              }"
            >
              <!-- 问题状态标记 -->
              <QuestionBadge
                v-if="message.isQuestion"
                :message="message"
                class="message-badge"
                @jump-to-solution="jumpToSolution"
              />
              
              <!-- 解决方案标记 -->
              <div v-if="message.isSolution && message.solutionTo" class="solution-badge-main">
                <CheckCircle :size="14" />
                <span>解决方案</span>
              </div>
              <!-- 引用的消息 -->
              <div 
                v-if="message.quotedMessage && message.quotedMessage.id" 
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
                <div class="user-avatar-wrapper">
                  <img 
                    v-if="message.fromAvatar"
                    :src="getAvatarUrl(message.fromAvatar)" 
                    class="user-avatar" 
                    @error="e => { console.warn('头像加载失败:', e.target.src); e.target.src = '/images/avatar/default-avatar.webp' }"
                  />
                  <div v-else class="user-avatar-placeholder">
                    {{ (message.fromName || '?')[0].toUpperCase() }}
                  </div>
                </div>
                <div class="message-info">
                  <span class="user-name" :class="{ 'is-me': String(message.from) === String(currentUserId) }">
                    {{ message.fromName || '未知用户' }}
                  </span>
                  <span class="message-time">{{ formatTime(message.time || message.createdAt) }}</span>
                </div>
              </div>
              <MessageContent :content="message.content" />
              
              <!-- 消息底部区域：操作按钮 + Emoji 反应 -->
              <div class="message-footer">
                <!-- 消息操作按钮 -->
                <MessageActions
                  :message="message"
                  :isMyMessage="String(message.from) === String(currentUserId)"
                  :currentUserId="currentUserId"
                  :isFavorited="checkIfFavorited(message)"
                  @reply="handleReply(message)"
                  @mark-question="handleMarkQuestion(message)"
                  @favorite="handleToggleFavorite(message)"
                />
                
                <!-- Emoji 反应（添加按钮） -->
                <EmojiReactions
                  :reactions="message.reactions || []"
                  :currentUserId="currentUserId"
                  @toggle-reaction="(emoji) => handleToggleReaction(message._id, emoji)"
                />
              </div>
              
              <!-- 已有的 Emoji 反应显示 -->
              <div v-if="message.reactions && message.reactions.length > 0" class="reactions-display">
                <button
                  v-for="reaction in getReactionCounts(message.reactions)"
                  :key="reaction.emoji"
                  class="reaction-bubble"
                  :class="{ 'is-active': reaction.hasReacted }"
                  @click="handleToggleReaction(message._id, reaction.emoji)"
                  :title="reaction.users.join(', ')"
                >
                  <component :is="getEmojiIcon(reaction.emoji)" :size="14" />
                  <span class="count">{{ reaction.count }}</span>
                </button>
              </div>
              
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
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Code, FileText, HelpCircle, Send, MessageCircle, Sparkles, CheckCircle, Clock, Flame, Hourglass, MessageSquare, ThumbsUp, Heart, PartyPopper, Lightbulb, HelpCircle as QuestionIcon } from 'lucide-vue-next'
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
import ReplyList from '../components/ReplyList.vue'
import EmojiReactions from '../components/EmojiReactions.vue'
import MessageContent from '../components/MessageContent.vue'
import AIInsightsDropdown from '../components/AIInsightsDropdown.vue'
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
const onlineCount = ref(0) // 在线人数
const isAIThinking = ref(false) // AI 思考状态
const showReplyList = ref(false) // 显示回复列表
const currentQuestionForReply = ref(null) // 当前查看回复的问题
const favoriteIds = ref(new Set()) // 收藏的消息ID集合
const timeRemaining = ref('') // 剩余时间
const roomStatusClass = ref('') // 聊天室状态样式
const roomStatusText = ref('') // 聊天室状态文本
const aiInsights = ref({ suggestions: [] }) // AI 智能提示
const aiSpeech = ref('') // AI 播报文本
const roomStatusIcon = computed(() => {
  // 返回图标组件
  if (roomStatusClass.value === 'ending-soon') return Hourglass
  if (roomStatusClass.value === 'active') return Flame
  if (roomStatusClass.value === 'expired') return Clock
  return MessageSquare
})

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
      startCountdown() // 启动倒计时
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
      
      // 加载完消息后，获取 AI 智能提示
      loadAIInsights()
    }
  } catch (err) {
    console.error('加载消息失败:', err)
    toast.error('加载消息失败')
  }
}

// 加载 AI 智能提示
async function loadAIInsights() {
  if (!currentRoom.value) return
  
  try {
    console.log('🔍 开始加载 AI 智能提示...')
    const res = await axios.get(
      `${baseUrl}/api/chatroom-ai/insights/${currentRoom.value.RoomID}`,
      { headers: getAuthHeaders() }
    )
    
    console.log('✅ AI 智能提示响应:', res.data)
    
    if (res.data.success) {
      aiInsights.value = res.data.insights
      aiSpeech.value = res.data.aiSpeech || ''
      console.log('📊 AI 智能提示数据:', aiInsights.value)
      console.log('🗣️ AI 播报文本:', aiSpeech.value)
      console.log('💡 建议数量:', res.data.suggestions?.length || 0)
      
      // 直接使用 suggestions
      if (res.data.suggestions && res.data.suggestions.length > 0) {
        aiInsights.value.suggestions = res.data.suggestions
        console.log('✨ 已设置建议:', aiInsights.value.suggestions)
      }
    }
  } catch (err) {
    console.error('❌ 加载 AI 智能提示失败:', err)
    console.error('错误详情:', err.response?.data || err.message)
    
    // 临时：添加模拟数据用于测试 UI
    if (err.response?.status === 404) {
      console.log('🧪 使用模拟数据测试 UI')
      aiInsights.value.suggestions = [
        {
          type: 'open_questions',
          icon: '🔍',
          text: '检测到 3 个未解决问题',
          action: 'show_all',
          count: 3
        },
        {
          type: 'ai_help',
          icon: '💡',
          text: 'AI 可以帮助回答 2 个问题',
          action: 'ai_answer',
          questions: [
            {
              id: 'test1',
              content: 'React Hooks 怎么使用？',
              fromName: '测试用户',
              minutesAgo: 15,
              replyCount: 0
            }
          ]
        }
      ]
    }
  }
}

// AI 主动回答问题
async function handleAIProactiveAnswer(questionId) {
  try {
    isAIThinking.value = true
    
    const res = await axios.post(
      `${baseUrl}/api/chatroom-ai/proactive-answer`,
      {
        roomId: currentRoom.value.RoomID,
        questionId: questionId
      },
      { 
        headers: getAuthHeaders(),
        timeout: 120000
      }
    )
    
    if (res.data.success) {
      toast.success('AI 已回答该问题')
      // 重新加载智能提示
      loadAIInsights()
    }
  } catch (err) {
    console.error('AI 主动回答失败:', err)
    toast.error(err.response?.data?.message || 'AI 回答失败')
  } finally {
    isAIThinking.value = false
  }
}

// 显示所有未解决问题
function showAllQuestions() {
  // 滚动到第一个未解决的问题
  const firstOpenQuestion = messages.value.find(m => 
    m.isQuestion && m.questionStatus === 'open'
  )
  
  if (firstOpenQuestion) {
    scrollToMessage(firstOpenQuestion._id)
    toast.info('已定位到第一个未解决问题')
  } else {
    toast.info('暂无未解决问题')
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
  
  const targetElement = document.querySelector(`[data-message-id="${messageId}"]`)
  
  if (targetElement && messageListRef.value) {
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    targetElement.classList.add('highlight-message')
    setTimeout(() => {
      targetElement.classList.remove('highlight-message')
    }, 2000)
  } else {
    toast.info('原消息未找到')
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

// 标记为解决方案（从回复列表调用）
async function markSolutionFromList(answerId) {
  if (!currentQuestionForReply.value) return
  
  try {
    await axios.post(
      `${baseUrl}/api/question/${answerId}/mark-solution`,
      { questionId: currentQuestionForReply.value._id },
      { headers: getAuthHeaders() }
    )
    
    // 更新答案消息的属性
    const answer = messages.value.find(m => m._id === answerId)
    if (answer) {
      answer.isSolution = true
      answer.solutionTo = currentQuestionForReply.value._id
    }
    
    // 更新问题状态为已解决
    const question = messages.value.find(m => m._id === currentQuestionForReply.value._id)
    if (question) {
      question.questionStatus = 'solved'
    }
    
    // 更新当前问题引用
    if (currentQuestionForReply.value) {
      currentQuestionForReply.value.questionStatus = 'solved'
    }
    
    toast.success('已标记为解决方案，问题已解决')
    showReplyList.value = false
  } catch (err) {
    console.error('标记失败:', err)
    toast.error(err.response?.data?.message || '标记失败')
  }
}

// 切换收藏状态
async function handleToggleFavorite(message) {
  const isFavorited = checkIfFavorited(message)
  
  try {
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
  } catch (err) {
    console.error('收藏操作失败:', err)
    toast.error(err.response?.data?.message || '操作失败')
  }
}

// 切换 Emoji 反应
async function handleToggleReaction(messageId, emoji) {
  try {
    const res = await axios.post(
      `${baseUrl}/api/question/${messageId}/reaction`,
      { emoji },
      { headers: getAuthHeaders() }
    )
    
    if (res.data.success) {
      // 更新本地消息的 reactions
      const message = messages.value.find(m => m._id === messageId)
      if (message) {
        message.reactions = res.data.reactions
      }
    }
  } catch (err) {
    console.error('切换反应失败:', err)
    toast.error(err.response?.data?.message || '操作失败')
  }
}

// 获取 Emoji 图标组件
function getEmojiIcon(type) {
  const iconMap = {
    'thumbsup': ThumbsUp,
    'heart': Heart,
    'party': PartyPopper,
    'bulb': Lightbulb,
    'question': QuestionIcon
  }
  return iconMap[type] || ThumbsUp
}

// 统计每种 emoji 的数量和用户
function getReactionCounts(reactions) {
  const counts = {}
  
  reactions.forEach(reaction => {
    if (!counts[reaction.emoji]) {
      counts[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: [],
        hasReacted: false
      }
    }
    counts[reaction.emoji].count++
    counts[reaction.emoji].users.push(reaction.userName || '未知用户')
    if (reaction.userId === currentUserId.value) {
      counts[reaction.emoji].hasReacted = true
    }
  })
  
  return Object.values(counts)
}

// 引用消息（已移除，使用回复功能代替）

// 判断消息是否已收藏
function checkIfFavorited(message) {
  if (!message) return false
  return favoriteIds.value.has(message._id)
}

// 加载用户收藏列表
async function loadFavorites() {
  try {
    const res = await axios.get(`${baseUrl}/api/favorites`, {
      headers: getAuthHeaders()
    })
    if (res.data.success) {
      favoriteIds.value = new Set(res.data.favorites.map(f => f.messageId))
    }
  } catch (err) {
    console.error('加载收藏失败:', err)
  }
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

// 跳转到解决方案
function jumpToSolution(questionId) {
  const solution = messages.value.find(msg => 
    msg.isSolution && msg.solutionTo === questionId
  )
  
  if (solution) {
    scrollToMessage(solution._id)
    toast.success('已跳转到解决方案')
  } else {
    toast.info('未找到解决方案')
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
        
        // 新消息到达时，刷新智能提示
        setTimeout(() => {
          loadAIInsights()
        }, 2000)
      }
    }
  })
  
  socket.on('message-reaction-updated', (data) => {
    const message = messages.value.find(m => m._id === data.messageId)
    if (message) {
      message.reactions = data.reactions
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

// 计算倒计时和状态
function updateRoomStatus() {
  if (!currentRoom.value || !currentRoom.value.expiresAt) {
    timeRemaining.value = ''
    return
  }
  
  const now = new Date()
  const expiresAt = new Date(currentRoom.value.expiresAt)
  const diff = expiresAt - now
  
  if (diff <= 0) {
    timeRemaining.value = '已结束'
    roomStatusClass.value = 'expired'
    roomStatusText.value = '已结束'
    return
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 0) {
    timeRemaining.value = `剩余 ${hours} 小时 ${minutes} 分`
  } else {
    timeRemaining.value = `剩余 ${minutes} 分钟`
  }
  
  if (hours < 1) {
    roomStatusClass.value = 'ending-soon'
    roomStatusText.value = '即将结束'
  } else if (hours < 6) {
    roomStatusClass.value = 'active'
    roomStatusText.value = '活跃中'
  } else {
    roomStatusClass.value = 'normal'
    roomStatusText.value = '进行中'
  }
}

// 启动倒计时更新
let countdownInterval = null
let insightsInterval = null

function startCountdown() {
  updateRoomStatus()
  countdownInterval = setInterval(updateRoomStatus, 60000) // 每分钟更新一次
  
  // 每 2 分钟刷新一次智能提示
  insightsInterval = setInterval(() => {
    loadAIInsights()
  }, 120000)
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
  if (insightsInterval) {
    clearInterval(insightsInterval)
    insightsInterval = null
  }
}
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

function getAvatarUrl(avatar) {
  if (!avatar) return ''
  
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar
  }
  
  if (avatar.startsWith('/')) {
    return avatar
  }
  
  return baseUrl + avatar
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
  await loadFavorites()
  initSocket()
})

onUnmounted(() => {
  cleanupSocket()
  stopCountdown()
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
        
        .tech-tag {
          font-size: 11px;
          padding: 2px 8px;
          color: white;
          border-radius: 3px;
          font-weight: 600;
          text-transform: uppercase;
          background: rgb(165, 42, 42);
          
          &.tech-react {
            background: linear-gradient(135deg, #61dafb 0%, #0088cc 100%);
            color: #003d5c;
          }
          
          &.tech-vue {
            background: linear-gradient(135deg, #42b883 0%, #35495e 100%);
          }
          
          &.tech-node,
          &.tech-nodejs {
            background: linear-gradient(135deg, #68a063 0%, #3c873a 100%);
          }
          
          &.tech-javascript,
          &.tech-js {
            background: linear-gradient(135deg, #f7df1e 0%, #e6c700 100%);
            color: #333;
          }
          
          &.tech-typescript,
          &.tech-ts {
            background: linear-gradient(135deg, #3178c6 0%, #235a97 100%);
          }
          
          &.tech-python {
            background: linear-gradient(135deg, #3776ab 0%, #ffd43b 100%);
            color: #333;
          }
          
          &.tech-java {
            background: linear-gradient(135deg, #f89820 0%, #e76f00 100%);
          }
          
          &.tech-go,
          &.tech-golang {
            background: linear-gradient(135deg, #00add8 0%, #007d9c 100%);
          }
          
          &.tech-rust {
            background: linear-gradient(135deg, #ce422b 0%, #a33018 100%);
          }
          
          &.tech-php {
            background: linear-gradient(135deg, #8892be 0%, #4f5b93 100%);
          }
          
          &.tech-cpp {
            background: linear-gradient(135deg, #00599c 0%, #004482 100%);
          }
        }
        
        .room-status {
          font-size: 11px;
          padding: 3px 10px;
          border-radius: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
          
          svg {
            flex-shrink: 0;
          }
          
          &.active {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            color: #92400e;
          }
          
          &.ending-soon {
            background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
            color: #991b1b;
            animation: pulse-warning 2s infinite;
          }
          
          &.normal {
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            color: #1e40af;
          }
          
          &.expired {
            background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%);
            color: #374151;
          }
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
        
        .member-count {
          color: #999;
        }
      }
    }
  }
  
  .header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    
    .countdown-display {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      color: #92400e;
      border: 1px solid #fbbf24;
      
      svg {
        flex-shrink: 0;
      }
      
      .countdown-text {
        white-space: nowrap;
      }
    }
    
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

@keyframes pulse-warning {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
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
    transition: all 0.2s;
    border-left: 4px solid transparent;
    
    /* 问题消息左侧彩色边框 - Open */
    &.has-question-open {
      border-left-color: #1a7f37;
      background: linear-gradient(90deg, rgba(26, 127, 55, 0.03) 0%, white 100%);
    }
    
    /* 问题消息左侧彩色边框 - Solved */
    &.has-question-solved {
      border-left-color: #8250df;
      background: linear-gradient(90deg, rgba(130, 80, 223, 0.03) 0%, white 100%);
    }
    
    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      
      .message-actions {
        opacity: 1;
      }
    }
    
    &.is-mine {
      align-self: flex-end;
      background: linear-gradient(135deg, #fef5f5 0%, #fff 100%);
      border: 1px solid rgba(165, 42, 42, 0.15);
      border-left: 1px solid rgba(165, 42, 42, 0.15);
      
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
    
    .solution-badge-main {
      position: absolute;
      top: -8px;
      left: -8px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: linear-gradient(135deg, #8250df 0%, #7c3aed 100%);
      color: white;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(130, 80, 223, 0.3);
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
      
      .user-avatar-wrapper {
        width: 32px;
        height: 32px;
        flex-shrink: 0;
        position: relative;
      }
      
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
    
    .message-footer {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }
    
    .reactions-display {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      margin-top: 8px;
    }
    
    .reaction-bubble {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border: 1px solid #e0e0e0;
      background: white;
      border-radius: 12px;
      cursor: pointer;
      font-size: 12px;
      color: #666;
      transition: all 0.2s;
      
      &:hover {
        background: #f5f5f5;
        border-color: rgb(165, 42, 42);
        transform: translateY(-1px);
      }
      
      &.is-active {
        background: linear-gradient(135deg, rgba(165, 42, 42, 0.1) 0%, rgba(165, 42, 42, 0.05) 100%);
        border-color: rgb(165, 42, 42);
        color: rgb(165, 42, 42);
        font-weight: 600;
      }
      
      .count {
        font-size: 11px;
        font-weight: 600;
      }
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
