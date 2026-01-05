<template>
  <div class="group-chat-container">
    <div class="container">
      <!-- 侧边栏 -->
      <div class="section1">
        <Sidebar />
      </div>

      <!-- 群聊列表 -->
      <div class="section2">
        <GroupList @select-group="handleSelectGroup" ref="groupListRef" />

        <!-- 搜索按钮 -->
        <button class="search-fab" @click="showSearchModal = true" title="搜索群聊和历史消息">
          <i><Search class="search-icon" /></i>
          <span>搜索</span>
        </button>
      </div>

      <!-- 聊天区域 -->
      <div class="section3-wrapper" :class="{ active: showChatArea }">
      <div v-if="!currentGroup" class="section3">
        <div class="welcome-state">
          <i class="icon"><ChatBubble class="welcome-icon" /></i>
          <p>选择一个群聊开始对话</p>
        </div>
      </div>

      <div v-else class="section3 group-chat-content">
        <!-- 群聊头部 -->
        <div class="chat-header">
          <!-- 移动端返回按钮 -->
          <button class="back-btn mobile-only" @click="backToList">
            <i>←</i>
          </button>
          
          <div class="group-info">
            <div class="group-avatar-wrapper">
              <GroupAvatar :members="currentGroup.Members" :size="40" />
            </div>
            <div class="info">
              <h3>{{ currentGroup.RoomName }}</h3>
              <span>{{ currentGroup.Members.length }} 人</span>
            </div>
          </div>
          <div class="header-actions">
            <button @click="showGroupDetail = true" class="detail-btn" title="群详情">
              <i>ⓘ</i>
            </button>
          </div>
        </div>

        <!-- 消息列表 -->
        <ChatMessageList
          ref="messageListRef"
          :messages="messages"
          :loading="isLoadingMessages"
          :currentUserId="currentUserId"
          :myAvatar="myAvatar"
          :baseUrl="baseUrl"
          messageType="group"
          :showAvatar="true"
          :showSenderName="true"
          :autoScroll="true"
          :highlightedMessageId="highlightedMessageId"
          @preview-image="previewImage"
          @preview-video="previewVideo"
          @preview-file="previewFile"
          @play-voice="playVoice"
          @forward-message="handleForwardMessage"
          @forward-messages="handleForwardMessages"
          @download-file="handleDownloadFile"
          @delete-message="handleDeleteMessage"
          @delete-messages="handleDeleteMessages"
          @recall-message="handleRecallMessage"
          @re-edit-message="handleReEditMessage"
        />

        <!-- 输入区域 -->
        <ChatInput
          ref="chatInputRef"
          placeholder="输入消息..."
          :showSearchButton="true"
          :isRecording="isRecording"
          :recordingTime="recordingTime"
          :groupMembers="currentGroup?.Members || []"
          :currentUserId="currentUserId"
          :userRole="getCurrentUserRole()"
          @send-message="handleSendMessage"
          @send-file="handleSendFile"
          @start-recording="handleStartRecording"
          @stop-recording="handleStopRecording"
          @cancel-recording="handleCancelRecording"
          @search="showSearchModal = true"
          @typing-start="handleTypingStart"
          @typing-stop="handleTypingStop"
        />
      </div>
    </div>

    <!-- 群详情侧边栏 -->
    <GroupDetail
      v-if="showGroupDetail && currentGroup"
      :group="currentGroup"
      @close="showGroupDetail = false"
      @update="handleGroupUpdate"
    />

    <!-- 搜索弹窗 -->
    <GroupSearchModal
      v-if="showSearchModal"
      @close="showSearchModal = false"
      @select-group="handleSearchSelectGroup"
      @select-message="handleSearchSelectMessage"
    />

    <!-- 转发对话框 -->
    <ForwardDialog
      v-if="showForwardDialog"
      :messages="forwardMessages"
      @close="showForwardDialog = false"
      @forward-complete="handleForwardComplete"
    />
    </div>

    <!-- 移动端底部导航栏 -->
    <BottomNavbar class="mobile-only" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Search, ChatBubble } from '@iconoir/vue'
import axios from 'axios'
import { io } from 'socket.io-client'
import Sidebar from '../components/Sidebar.vue'
import GroupList from '../components/GroupList.vue'
import GroupDetail from '../components/GroupDetail.vue'
import GroupAvatar from '../components/GroupAvatar.vue'
import BottomNavbar from '../components/BottomNavbar.vue'
import GroupSearchModal from '../components/GroupSearchModal.vue'
import ForwardDialog from '../components/ForwardDialog.vue'
import ChatMessageList from '../components/chat/ChatMessageList.vue'
import ChatInput from '../components/chat/ChatInput.vue'
import { useToast } from '../composables/useToast'
import { useAudioRecorder } from '../composables/useAudioRecorder'

const baseUrl = import.meta.env.VITE_BASE_URL
const toast = useToast()

// 语音录制相关
const {
  isRecording,
  recordingTime,
  audioBlob,
  startRecording,
  stopRecording,
  cancelRecording,
  formatTime: formatRecordingTime,
} = useAudioRecorder()

const currentGroup = ref(null)
const messages = ref([])
const currentUserId = ref('')
const myAvatar = ref('')
const showGroupDetail = ref(false)
const showSearchModal = ref(false)
const showForwardDialog = ref(false)
const forwardMessages = ref([])
const messageListRef = ref(null)
const groupListRef = ref(null)
const chatInputRef = ref(null)
const isLoadingMessages = ref(false)
const showChatArea = ref(false) // 移动端控制聊天区域显示
const highlightedMessageId = ref('')

let socket = null

onMounted(async () => {
  await loadCurrentUser()
  await loadMyAvatar()
  initSocket()
  
  // 监听GroupList发送的加入所有房间事件
  window.addEventListener('joinAllRooms', handleJoinAllRooms)
})

onUnmounted(() => {
  if (socket) {
    if (currentGroup.value) {
      socket.emit('leave-group', {
        roomId: currentGroup.value.RoomID,
        userId: currentUserId.value
      })
    }
    // 清理Socket事件监听器
    socket.off('group-message')
    socket.off('member-joined')
    socket.off('member-left')
    socket.off('message-recalled')
    socket.off('mention-notification')
    socket.disconnect()
  }
  // 清理事件监听器
  window.removeEventListener('joinAllRooms', handleJoinAllRooms)
})

async function loadCurrentUser() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${baseUrl}/api/user/info`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    currentUserId.value = String(res.data.id || res.data.uID)
  } catch (err) {
    console.error('获取用户信息失败:', err)
  }
}

async function loadMyAvatar() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${baseUrl}/api/user/info`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    myAvatar.value = res.data.ava || '/images/avatar/default-avatar.webp'
  } catch (err) {
    console.error('获取自己头像失败:', err)
  }
}

// 处理GroupList发送的加入所有房间事件
function handleJoinAllRooms(event) {
  console.log('🎯 GroupChat收到加入所有房间事件:', event.detail)
  
  if (!socket || !socket.connected) {
    console.log('⚠️ Socket未连接，无法加入房间')
    return
  }
  
  const { groups, userId } = event.detail
  console.log('🚪 开始加入所有群聊Socket房间...')
  console.log('群聊列表:', groups.map(g => ({id: g.RoomID, name: g.RoomName})))
  
  groups.forEach(group => {
    console.log(`🏠 加入Socket房间: ${group.RoomID} (${group.RoomName})`)
    
    // 发送多种加入房间事件，确保服务器能识别
    socket.emit('join-group', {
      roomId: group.RoomID,
      userId: userId
    })
    socket.emit('join-room', group.RoomID)
    socket.emit('join', group.RoomID)
  })
  
  console.log('✅ 所有群聊房间加入请求已发送')
}

function initSocket() {
  socket = io(baseUrl, {
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: true
  })

  socket.on('connect', () => {
    console.log('🎉 Socket连接成功:', socket.id)
    console.log('👤 当前用户ID:', currentUserId.value)
    
    // 发送连接测试
    socket.emit('test-connection', {
      userId: currentUserId.value,
      timestamp: Date.now(),
      message: 'Socket连接测试'
    })
    
    // 加入用户所有的群聊房间（关键修复！）
    console.log('🏠 Socket连接时加入所有群聊房间...')
    if (groupListRef.value && groupListRef.value.groups) {
      const allGroups = groupListRef.value.groups
      console.log('📋 用户的所有群聊:', allGroups.map(g => ({id: g.RoomID, name: g.RoomName})))
      
      allGroups.forEach(group => {
        console.log('🚪 加入群聊房间:', group.RoomID, group.RoomName)
        socket.emit('join-group', {
          roomId: group.RoomID,
          userId: currentUserId.value
        })
        socket.emit('join-room', group.RoomID)
        socket.emit('join', group.RoomID)
      })
    }
    
    // 如果已经选择了群聊，额外确认加入当前房间
    if (currentGroup.value) {
      console.log('🏠 额外确认加入当前群聊房间:', currentGroup.value.RoomID)
      socket.emit('join-group', {
        roomId: currentGroup.value.RoomID,
        userId: currentUserId.value
      })
    }
  })

  // 监听连接测试回应
  socket.on('test-response', (data) => {
    console.log('📡 收到Socket连接测试回应:', data)
  })

  // 监听服务器广播的测试消息
  socket.on('broadcast-test', (data) => {
    console.log('📻 收到服务器广播测试:', data)
  })

  socket.on('disconnect', () => {
    console.log('Socket连接断开')
  })

  socket.on('connect_error', (error) => {
    console.error('Socket连接错误:', error)
  })

  socket.on('group-message', (data) => {
    console.log('========== 收到群消息事件 ==========')
    console.log('消息数据:', data)
    console.log('当前群聊ID:', currentGroup.value?.RoomID)
    console.log('消息来自群聊ID:', data.roomId)
    console.log('Socket ID:', socket.id)
    
    if (currentGroup.value && data.roomId === currentGroup.value.RoomID) {
      // 检查消息数据是否存在(消息内容直接在data中)
      if (!data.content && !data.message) {
        console.log('❌ 收到的消息数据为空:', data)
        return
      }
      
      // 适配不同的消息数据结构
      let messageData;
      if (data.message) {
        // 如果有message属性，使用message属性
        messageData = data.message;
      } else if (data.content) {
        // 如果消息内容直接在data中，构造消息对象
        messageData = {
          _id: data._id || data.id,
          id: data.id || data._id,
          content: data.content,
          from: data.from,
          fromName: data.fromName,
          fromAvatar: data.fromAvatar,
          messageType: data.messageType || 'text',
          createdAt: data.createdAt || data.timestamp || new Date(),
          mentions: data.mentions
        };
      } else {
        console.log('❌ 无法识别的消息数据格式:', data)
        return
      }
      
      // 检查是否是自己发送的消息，避免重复添加
      const isDuplicate = messages.value.some(msg => 
        (msg._id && messageData._id && msg._id === messageData._id) || 
        (msg.id && messageData.id && msg.id === messageData.id) ||
        (msg.content === messageData.content && msg.from === messageData.from)
      )
      
      if (!isDuplicate) {
        console.log('✅ 添加新消息到当前群聊:', messageData)
        messages.value.push(messageData)
        
        // 滚动到底部
        nextTick(() => {
          if (messageListRef.value) {
            messageListRef.value.scrollToBottom()
          }
        })
      } else {
        console.log('⚠️ 消息已存在，跳过重复添加')
      }
    } else if (data.roomId !== currentGroup.value?.RoomID) {
      // 其他群的消息由GroupList处理
      console.log('其他群聊消息，由GroupList处理')
    }
  })

  // 监听各种可能的Socket事件
  socket.on('joined-room', (data) => {
    console.log('✅ 已加入Socket房间:', data)
  })

  socket.on('left-room', (data) => {
    console.log('⬅️ 已离开Socket房间:', data)
  })

  socket.on('joined-group', (data) => {
    console.log('✅ 已加入群聊房间:', data)
  })

  socket.on('room-joined', (data) => {
    console.log('✅ 房间加入确认:', data)
  })

  // 监听房间成员信息
  socket.on('room-members', (data) => {
    console.log('👥 房间成员列表:', data)
  })

  // 监听房间状态
  socket.on('room-status', (data) => {
    console.log('🏠 房间状态:', data)
  })

  // 监听所有可能的消息事件
  socket.on('message', (data) => {
    console.log('📥 收到message事件:', data)
    // 转发给group-message处理
    socket.emit('group-message', data)
  })

  socket.on('new-message', (data) => {
    console.log('📥 收到new-message事件:', data)
    // 转发给group-message处理
    socket.emit('group-message', data)
  })

  socket.on('chat-message', (data) => {
    console.log('📥 收到chat-message事件:', data)
    // 转发给group-message处理
    socket.emit('group-message', data)
  })

  // 监听其他Socket事件
  socket.on('user-joined', (data) => {
    console.log('👤 用户加入房间:', data)
  })

  socket.on('user-left', (data) => {
    console.log('👤 用户离开房间:', data)
  })

  socket.on('member-joined', (data) => {
    console.log('👥 成员加入群聊:', data)
  })

  socket.on('member-left', (data) => {
    console.log('👥 成员离开群聊:', data)
  })

  // 监听Socket错误
  socket.on('error', (error) => {
    console.error('Socket错误:', error)
  })

  // 监听群聊消息撤回事件
  socket.on('message-recalled', (data) => {
    if (currentGroup.value && data.roomId === currentGroup.value.RoomID) {
      // 找到被撤回的消息并更新
      const messageIndex = messages.value.findIndex(msg => 
        (msg._id || msg.id) === data.messageId
      )
      
      if (messageIndex !== -1) {
        const recalledMessage = messages.value[messageIndex]
        messages.value[messageIndex] = {
          ...recalledMessage,
          content: data.userId === currentUserId.value ? '你撤回了一条消息' : `${data.userName || '对方'}撤回了一条消息`,
          messageType: 'system',
          recalled: true
        }
      }
    }
  })

  // 监听@提及通知事件
  socket.on('mention-notification', (data) => {
    console.log('GroupChat 收到@提及通知事件:', data)
    console.log('当前用户ID:', currentUserId.value)
    
    // 检查是否@了当前用户
    const isMentioned = data.mentions.some(mention => 
      mention.type === 'all' || mention.userId === currentUserId.value
    )
    
    console.log('是否被@:', isMentioned)
    
    if (isMentioned && data.senderName) {
      // 如果是其他群的@提醒，在GroupList中显示红色@标记
      if (!currentGroup.value || data.roomId !== currentGroup.value.RoomID) {
        console.log('为其他群聊显示@提醒:', data.roomId)
        if (groupListRef.value && groupListRef.value.markGroupAsMentioned) {
          console.log('调用 groupListRef.markGroupAsMentioned')
          groupListRef.value.markGroupAsMentioned(data.roomId)
        } else {
          console.log('groupListRef 不可用于@提醒:', groupListRef.value)
        }
      }
      
      // 只在当前群聊中显示详细通知
      if (currentGroup.value && data.roomId === currentGroup.value.RoomID) {
        // 区分@全体成员和@个人的通知文案
        const isAllMention = data.mentions.some(m => m.type === 'all')
        const notificationTitle = isAllMention 
          ? `${data.senderName}@了全体成员` 
          : `${data.senderName} 在群聊中@了你`
        
        // 显示微信风格的@提及通知
        toast.success(notificationTitle, {
          duration: 6000,
          icon: '🔔',
          position: 'top-right',
          style: {
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)',
            color: 'white',
            fontWeight: '500',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(255, 107, 107, 0.4)'
          },
          action: {
            text: '查看消息',
            onClick: () => {
              // 滚动到对应消息
              scrollToMessage(data.messageId)
            }
          }
        })
        
        // 播放提示音（如果支持）
        try {
          const audio = new Audio('/sounds/mention-notification.mp3')
          audio.volume = 0.3
          audio.play().catch(() => {
            // 如果音频播放失败，使用系统提示音
            console.log('播放@提醒声音')
          })
        } catch (e) {
          console.log('@提及通知音频播放失败')
        }
      }
    }
  })
}

// 获取当前用户在群聊中的角色
function getCurrentUserRole() {
  if (!currentGroup.value || !currentGroup.value.Members) return 'member'
  
  const currentUser = currentGroup.value.Members.find(member => 
    String(member.id || member.userId || member.userID) === String(currentUserId.value)
  )
  
  if (!currentUser) return 'member'
  
  // 检查是否为创建者
  const isCreator = currentUser.role === 'creator' || 
                   String(currentGroup.value.CreatorID || currentGroup.value.Creator) === String(currentUserId.value)
  
  if (isCreator) {
    return 'creator'
  } else if (currentUser.role === 'admin') {
    return 'admin'
  } else {
    return 'member'
  }
}

async function handleSelectGroup(group) {
  console.log('选择群聊:', group.RoomName, '房间ID:', group.RoomID)

  if (currentGroup.value && socket) {
    console.log('离开当前群聊房间:', currentGroup.value.RoomID)
    socket.emit('leave-group', {
      roomId: currentGroup.value.RoomID,
      userId: currentUserId.value
    })
  }

  currentGroup.value = group
  showChatArea.value = true // 移动端显示聊天区域

  // 加载消息
  await loadMessages()

  // 确保DOM完全更新后再滚动到底部
  await nextTick()
  setTimeout(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollToBottom()
    }
  }, 100)

  if (socket && socket.connected) {
    console.log('🏠 加入新群聊房间:', group.RoomID)
    
    // 尝试多种房间加入事件名称
    socket.emit('join-group', group.RoomID)
    socket.emit('join-room', group.RoomID) 
    socket.emit('join', group.RoomID)
    
    // 同时发送带用户信息的版本
    socket.emit('join-group', {
      roomId: group.RoomID,
      userId: currentUserId.value
    })
    
    console.log('📡 已发送房间加入请求')
  } else {
    console.log('❌ Socket未连接，无法加入房间')
    console.log('Socket状态:', {
      exists: !!socket,
      connected: socket?.connected,
      id: socket?.id
    })
  }
}

// 移动端返回群聊列表
function backToList() {
  showChatArea.value = false
}

// 从搜索结果选择群聊
function handleSearchSelectGroup(group) {
  handleSelectGroup(group)
}

// 从搜索结果选择消息
async function handleSearchSelectMessage(message) {
  // 先找到对应的群聊
  const groups = await loadGroupsData()
  const group = groups.find(g => g.RoomID === message.roomId)
  if (group) {
    await handleSelectGroup(group)
    // 等待消息加载完成后滚动到指定消息
    await nextTick()
    setTimeout(() => {
      scrollToMessage(message._id)
    }, 300)
  }
}

// 加载群聊数据（用于搜索）
async function loadGroupsData() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${baseUrl}/room/list`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.data.success) {
      return res.data.groups
    }
  } catch (err) {
    console.error('加载群聊失败:', err)
  }
  return []
}

// 滚动相关功能现在由ChatMessageList组件处理

// 滚动到指定消息（通过组件暴露的方法）
function scrollToMessage(messageId) {
  if (messageListRef.value) {
    messageListRef.value.scrollToMessage(messageId)
    highlightedMessageId.value = messageId
    
    // 2秒后取消高亮
    setTimeout(() => {
      highlightedMessageId.value = ''
    }, 2000)
  } else {
    console.warn('未找到目标消息:', messageId)
  }
}

async function loadMessages() {
  isLoadingMessages.value = true
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(
      `${baseUrl}/room/${currentGroup.value.RoomID}/messages`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )
    if (res.data.success) {
      messages.value = res.data.messages
      // ChatMessageList组件会自动滚动到底部
    }
  } catch (err) {
    console.error('加载消息失败:', err)
  } finally {
    isLoadingMessages.value = false
  }
}

// 文件预览和处理函数（这些现在由新组件处理，但保留用于消息显示）

function previewImage(fileInfo) {
  window.open(baseUrl + fileInfo.fileUrl, '_blank')
}

function previewVideo(fileInfo) {
  window.open(baseUrl + fileInfo.fileUrl, '_blank')
}

function previewFile(fileInfo) {
  window.open(baseUrl + fileInfo.fileUrl, '_blank')
}

function playVoice(fileInfo) {
  // 播放语音消息
  const audio = new Audio(baseUrl + fileInfo.fileUrl)
  audio.play().catch(err => {
    console.error('播放语音失败:', err)
    toast.error('播放语音失败')
  })
}

// 新组件需要的事件处理方法
function handleForwardMessage(message) {
  console.log('转发单条消息:', message)
  forwardMessages.value = [message]
  showForwardDialog.value = true
}

// 批量转发消息 - 模仿微信逻辑
function handleForwardMessages(messages) {
  if (!messages || messages.length === 0) return
  
  console.log('批量转发消息:', messages)
  
  // 检查转发消息数量限制（微信通常限制30条）
  if (messages.length > 30) {
    toast.error('一次最多转发30条消息')
    return
  }
  
  // 过滤出可转发的消息类型
  const forwardableMessages = messages.filter(msg => {
    // 排除系统消息等不可转发类型
    return msg.messageType !== 'system' && msg.content
  })
  
  if (forwardableMessages.length === 0) {
    toast.error('选中的消息无法转发')
    return
  }
  
  // 显示转发对话框
  forwardMessages.value = forwardableMessages
  showForwardDialog.value = true
}

// 批量删除消息
function handleDeleteMessages(messages) {
  if (!messages || messages.length === 0) return
  
  if (confirm(`确定要删除这 ${messages.length} 条消息吗？`)) {
    console.log('批量删除消息:', messages)
    toast.success(`已删除 ${messages.length} 条消息`)
    // TODO: 实现实际的删除逻辑
  }
}

// 处理转发完成
function handleForwardComplete() {
  // 转发完成后的处理
  console.log('转发完成')
}

// 处理撤回消息
async function handleRecallMessage(messageIndex) {
  try {
    const messageToRecall = messages.value[messageIndex]
    if (!messageToRecall) {
      toast.error('消息不存在')
      return
    }

    // 验证撤回权限和时间限制
    const messageTime = new Date(messageToRecall.time)
    const now = new Date()
    const diffMinutes = (now - messageTime) / (1000 * 60)
    
    if (diffMinutes > 2) {
      toast.error('消息发送超过2分钟，无法撤回')
      return
    }

    // 检查是否是自己的消息
    const isMyMessage = String(messageToRecall.from) === String(currentUserId.value)
    if (!isMyMessage) {
      toast.error('只能撤回自己的消息')
      return
    }

    // 临时方案：客户端撤回（因为服务端API暂未实现）
    // TODO: 服务端需要实现 DELETE /room/{roomId}/messages/{messageId}/recall 端点
    console.warn('群聊撤回API暂未在服务端实现，使用客户端方案')

    // 根据消息类型生成撤回提示
    let recallText = '你撤回了一条消息'
    switch (messageToRecall.messageType) {
      case 'image':
        recallText = '你撤回了一张图片'
        break
      case 'file':
        recallText = '你撤回了一个文件'
        break
      case 'audio':
        recallText = '你撤回了一段语音'
        break
      case 'video':
        recallText = '你撤回了一个视频'
        break
      case 'text':
      default:
        recallText = '你撤回了一条消息'
        break
    }

    // 更新消息状态为已撤回，并添加重新编辑选项
    messages.value[messageIndex] = {
      ...messageToRecall,
      content: recallText,
      messageType: 'system',
      recalled: true,
      originalContent: messageToRecall.content, // 保存原始内容用于重新编辑
      originalMessageType: messageToRecall.messageType, // 保存原始消息类型
      canReEdit: messageToRecall.messageType === 'text' // 只有文本消息可以重新编辑
    }

    // 通过Socket通知其他成员消息被撤回
    if (socket) {
      socket.emit('recall-group-message', {
        roomId: currentGroup.value.RoomID,
        messageId: messageToRecall._id || messageToRecall.id,
        userId: currentUserId.value
      })
    }

    // 显示撤回成功提示
    if (messageToRecall.messageType === 'text') {
      toast.success('消息已撤回，可点击"重新编辑"按钮重新编辑')
    } else {
      toast.success('消息已撤回')
    }
  } catch (error) {
    console.error('撤回群聊消息失败:', error)
    toast.error('撤回消息失败: ' + (error.response?.data?.message || '操作失败'))
  }
}

// 处理重新编辑消息
function handleReEditMessage(recalledMessage) {
  // 将原始内容填充到输入框
  if (chatInputRef.value && recalledMessage.originalContent) {
    chatInputRef.value.setInputContent(recalledMessage.originalContent)
    
    // 聚焦到输入框
    chatInputRef.value.focusInput()
  }
}

async function handleDownloadFile(fileInfo) {
  try {
    const token = localStorage.getItem('token')
    const fileUrl = fileInfo.fileUrl.startsWith('http') ? fileInfo.fileUrl : baseUrl + fileInfo.fileUrl
    
    // 使用fetch下载文件，携带认证token
    const response = await fetch(fileUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status} ${response.statusText}`)
    }
    
    // 获取文件blob
    const blob = await response.blob()
    
    // 创建下载链接
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = fileInfo.fileName || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // 清理URL对象
    window.URL.revokeObjectURL(downloadUrl)
    
    toast.success('文件下载成功')
  } catch (error) {
    console.error('下载文件失败:', error)
    toast.error('下载文件失败: ' + error.message)
  }
}

function handleDeleteMessage(messageIndex) {
  // 删除消息
  if (confirm('确定要删除这条消息吗？')) {
    messages.value.splice(messageIndex, 1)
    toast.success('消息已删除')
  }
}

function handleSendMessage(messageData) {
  // messageData可能是事件对象或消息数据对象，需要判断类型
  if (typeof messageData === 'object' && messageData.content) {
    if (messageData.content && messageData.content.trim()) {
      sendMessage(messageData.content)
    }
  } else if (typeof messageData === 'string') {
    // 如果直接传入字符串
    sendMessage(messageData)
  }
}

async function handleSendFile(messageData) {
  // 处理文件发送
  if (messageData.files && messageData.files.length > 0) {
    await uploadFiles(messageData.files, messageData.content || '')
  }
}

function handleTypingStart() {
  // 开始输入状态
  if (socket && currentGroup.value) {
    socket.emit('typing-start', {
      roomId: currentGroup.value.RoomID,
      userId: currentUserId.value
    })
  }
}

function handleTypingStop() {
  // 停止输入状态
  if (socket && currentGroup.value) {
    socket.emit('typing-stop', {
      roomId: currentGroup.value.RoomID,
      userId: currentUserId.value
    })
  }
}

async function uploadFiles(files, textMessage = '') {
  if (!files || files.length === 0) return

  const token = localStorage.getItem('token')

  try {
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)

      const res = await axios.post(`${baseUrl}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      })

      const fileInfo = {
        fileName: res.data.fileName,
        fileUrl: res.data.fileUrl,
        fileSize: res.data.fileSize,
        fileType: res.data.fileType,
      }

      const messageType = file.type.startsWith('image/') ? 'image' : 'file'
      let messageContent = textMessage.trim() || `发送了一个${messageType === 'image' ? '图片' : '文件'}: ${fileInfo.fileName}`

      await axios.post(
        `${baseUrl}/room/${currentGroup.value.RoomID}/messages`,
        {
          content: messageContent,
          messageType: messageType,
          fileInfo: fileInfo,
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (socket) {
        socket.emit('group-message', {
          roomId: currentGroup.value.RoomID,
          content: messageContent,
          messageType: messageType,
          fileInfo: fileInfo,
          from: currentUserId.value,
          fromName: localStorage.getItem('userName') || localStorage.getItem('displayName') || '我',
          time: new Date()
        })
      }
      
      // 立即通知GroupList更新最新消息（解决文件上传后列表不更新的问题）
      if (groupListRef.value) {
        groupListRef.value.updateGroupLastMessage(currentGroup.value.RoomID, {
          content: messageContent,
          fromName: localStorage.getItem('userName') || localStorage.getItem('displayName') || '我',
          messageType: messageType,
          createdAt: new Date()
        })
      }
    }

    // 文件上传完成后刷新消息列表

    await loadMessages()
  } catch (err) {
    console.error('文件上传失败:', err)
    toast.error('文件上传失败: ' + (err.response?.data?.message || err.message))
  }
}

// 录音相关处理函数
function handleStartRecording() {
  startRecording()
}

function handleStopRecording() {
  stopRecording()
  // 发送语音消息
  if (audioBlob.value) {
    sendVoiceMessage()
  }
}

function handleCancelRecording() {
  cancelRecording()
}

async function sendVoiceMessage() {
  if (!audioBlob.value || !currentGroup.value) return

  const token = localStorage.getItem('token')
  const formData = new FormData()
  formData.append('file', audioBlob.value, 'voice.wav')

  try {
    // 先上传语音文件
    const uploadRes = await axios.post(`${baseUrl}/api/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
    })

    if (uploadRes.data.success) {
      // 发送语音消息
      const messageRes = await axios.post(
        `${baseUrl}/room/${currentGroup.value.RoomID}/messages`,
        {
          content: '',
          messageType: 'voice',
          fileInfo: uploadRes.data.file
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (messageRes.data.success) {
        await loadMessages()
        toast.success('语音发送成功')
      }
    }
  } catch (err) {
    console.error('语音发送失败:', err)
    toast.error('语音发送失败: ' + (err.response?.data?.message || err.message))
  }
}

// 解析@提及内容
function parseMentions(content) {
  const mentions = []
  const mentionRegex = /@(全体成员|[^@\s]+)/g
  let match

  console.log('🔍 开始解析@提及内容:', content)
  console.log('📋 当前群成员列表:', currentGroup.value?.Members)

  while ((match = mentionRegex.exec(content)) !== null) {
    const mentionText = match[1]
    console.log('🎯 找到@提及:', mentionText)
    
    if (mentionText === '全体成员') {
      // @全体成员
      mentions.push({
        type: 'all',
        text: mentionText,
        userId: null
      })
      console.log('✅ 添加@全体成员')
    } else {
      // 查找对应的用户 - 检查所有可能的显示名称字段
      const member = currentGroup.value?.Members?.find(m => {
        // 收集所有可能的显示名称
        const possibleNames = [
          m.Nickname, m.nickname, m.NickName,
          m.name, m.userName, m.Name, m.uName,
          m.displayName, m.DisplayName,
          m.realName, m.RealName
        ].filter(Boolean) // 过滤掉空值
        
        console.log('🔍 检查成员:', {
          member: m,
          possibleNames,
          target: mentionText
        })
        
        // 检查是否有任何名称匹配
        return possibleNames.includes(mentionText)
      })
      
      if (member) {
        // 尝试多个可能的ID字段
        const userId = member.id || member.userId || member.uID || member.ID || member.uid
        mentions.push({
          type: 'user',
          text: mentionText,
          userId: String(userId) // 确保转为字符串
        })
        console.log('✅ 添加用户@提及:', {
          text: mentionText,
          userId: userId,
          member: member
        })
      } else {
        console.log('❌ 未找到对应用户:', mentionText)
      }
    }
  }
  
  console.log('📤 最终@提及列表:', mentions)
  return mentions
}

// 发送文本消息
async function sendMessage(content) {
  if (!content.trim() || !currentGroup.value) return

  try {
    // 解析@提及
    console.log('========== 开始发送消息和@提及解析 ==========')
    console.log('消息内容:', content)
    console.log('当前群组:', currentGroup.value)
    console.log('群成员列表:', currentGroup.value?.Members)
    
    const mentions = parseMentions(content)
    console.log('解析后的@提及列表:', mentions)
    console.log('@提及数量:', mentions.length)
    
    // 验证@全体成员权限
    const hasAllMention = mentions.some(m => m.type === 'all')
    if (hasAllMention && getCurrentUserRole() === 'member') {
      toast.error('只有管理员和群主可以@全体成员')
      return
    }

    const token = localStorage.getItem('token')
    const res = await axios.post(
      `${baseUrl}/room/${currentGroup.value.RoomID}/messages`,
      {
        content: content,
        messageType: 'text',
        mentions: mentions.length > 0 ? mentions : undefined
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )

    if (res.data.success) {
      // 立即添加消息到本地消息列表，确保实时显示
      const newMessage = {
        ...res.data.message,
        mentions: mentions.length > 0 ? mentions : undefined
      }
      messages.value.push(newMessage)
      
      // 滚动到底部
      await nextTick()
      if (messageListRef.value) {
        messageListRef.value.scrollToBottom()
      }
      
      if (socket && socket.connected) {
        // 获取发送者真实姓名
        const possibleNames = [
          localStorage.getItem('username'),
          localStorage.getItem('userName'),
          localStorage.getItem('displayName'), 
          localStorage.getItem('userNickname'),
          localStorage.getItem('nickName'),
          localStorage.getItem('name'),
          '用户' + localStorage.getItem('userId')
        ]
        const senderName = possibleNames.find(name => name && name.trim()) || 'Anonymous'
        
        socket.emit('group-message', {
          roomId: currentGroup.value.RoomID,
          content: newMessage.content,
          messageType: newMessage.messageType || 'text',
          from: newMessage.from,
          fromName: senderName,  // 发送真实姓名，不是"我"
          fromAvatar: localStorage.getItem('userAvatar') || '',
          time: newMessage.time
        })
        console.log('📤 发送消息事件到房间:', currentGroup.value.RoomID)
        
        // 立即通知GroupList更新最新消息
        if (groupListRef.value && groupListRef.value.updateGroupLastMessage) {
          groupListRef.value.updateGroupLastMessage(currentGroup.value.RoomID, {
            content: newMessage.content,
            fromName: '我',
            messageType: newMessage.messageType || 'text',
            createdAt: new Date()
          })
        } else {
          console.error('❌ GroupList引用或方法不存在!')
        }
        
        // 发送@提及通知
        if (mentions.length > 0) {
          console.log('========== 发送@提及通知 ==========')
          console.log('@提及列表:', mentions)
          
          // 简化@提及通知发送
          socket.emit('mention-notification', {
            roomId: currentGroup.value.RoomID,
            mentions: mentions,
            messageId: res.data.message.id || res.data.message._id,
            senderName: myAvatar.value || '某位成员'
          })
          console.log('📧 发送@提及通知到房间:', currentGroup.value.RoomID)
        }
        
        console.log('===================================')
      } else {
        console.log('❌ Socket未连接，无法发送实时消息')
        console.log('Socket状态:', socket?.connected)
      }
    }
  } catch (error) {
    console.error('发送消息失败:', error)
    toast.error('发送消息失败')
  }
}

async function handleGroupUpdate() {
  console.log('群聊信息更新事件触发')
  
  // 重新加载群聊列表
  if (groupListRef.value && groupListRef.value.loadGroups) {
    groupListRef.value.loadGroups()
  }
  
  // 同时更新当前群聊信息
  if (currentGroup.value && currentGroup.value.RoomID) {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${baseUrl}/room/list`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.data.success && res.data.rooms) {
        // 从群聊列表中找到当前群聊
        const updatedGroup = res.data.rooms.find(room => room.RoomID === currentGroup.value.RoomID)
        if (updatedGroup) {
          // 更新当前群聊信息，保持响应性
          Object.assign(currentGroup.value, updatedGroup)
          console.log('群聊信息已更新:', currentGroup.value)
        }
      }
    } catch (err) {
      console.error('获取群聊列表失败:', err)
    }
  }
}

// 滚动功能由ChatMessageList组件处理

function formatTime(time) {
  const date = new Date(time)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return '刚刚'
  
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}分钟前`
  }
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  if (messageDate.getTime() === today.getTime()) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (messageDate.getTime() === yesterday.getTime()) {
    return `昨天 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
  
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}-${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
  
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 图片错误处理由ChatMessage组件处理
</script>

<style scoped lang="scss">
.group-chat-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
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

/* 搜索按钮 */
.search-fab {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  color: white;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.4);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 1000;

  i {
    font-size: 20px;
    margin-bottom: 2px;
    display: flex;
    align-items: center;
    justify-content: center;

    .search-icon {
      width: 20px;
      height: 20px;
      stroke-width: 1.5;
    }
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 68, 68, 0.4);
    background: linear-gradient(135deg, #ff5555 0%, #dd0000 100%);
  }

  &:active {
    transform: translateY(0);
  }
}

/* PC端搜索按钮位置 */
@media (min-width: 769px) {
  .search-fab {
    bottom: 15px;
    right: 15px;
  }
}

.section3-wrapper {
  flex: 1 1 62%;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.section3 {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.welcome-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;

  i {
    font-size: 64px;
    margin-bottom: 20px;
  }

  p {
    font-size: 16px;
  }
}

.group-chat-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  max-height: 100%;
}

.chat-header {
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex !important;
  justify-content: space-between;
  align-items: center;
  background: white;
  flex: 0 0 auto;
  flex-shrink: 0;
  min-height: 60px;
  position: relative;
  z-index: 10;

  .back-btn {
    display: none;
    background: none;
    border: none;
    font-size: 20px;
    color: #666;
    cursor: pointer;
    padding: 0 10px 0 0;
    margin-right: 10px;

    &:hover {
      color: #333;
    }
  }

  .group-info {
    display: flex;
    align-items: center;
    flex: 1;

    .group-avatar-wrapper {
      width: 40px;
      height: 40px;
      margin-right: 12px;
    }

    .info {
      h3 {
        margin: 0 0 4px 0;
        font-size: 16px;
      }

      span {
        font-size: 12px;
        color: #999;
      }
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .detail-btn {
    display: flex !important;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    font-size: 20px;
    color: #666;
    cursor: pointer;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    transition: all 0.2s ease;

    &:hover {
      color: #333;
      background-color: rgba(0, 0, 0, 0.05);
    }

    i {
      font-size: 18px;
    }
  }
}

/* 消息样式现在由ChatMessageList组件处理 */

/* 消息相关CSS已清理完成 */

/* 文件和图片预览样式现在由ChatMessage组件处理 */

/* 视频预览样式现在由ChatMessage组件处理 */

/* 所有消息样式(包括语音、文件、图片)现在由ChatMessage组件处理 */

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

  .section2 {
    flex: 0 0 35%;
  }

  .section3-wrapper {
    flex: 1 1 55%;
  }
}

/* 响应式布局 - 移动设备 */
@media (max-width: 768px) {
  .group-chat-container {
    height: 100vh;
    overflow: hidden;
  }

  .container {
    border-radius: 0;
    margin: 0;
    height: calc(100vh - 65px); /* 减去底部导航栏高度 */
    box-shadow: none;
    max-height: calc(100vh - 65px);
  }

  .mobile-only {
    display: block !important;
  }

  .section1 {
    display: none;
  }

  .section2 {
    flex: 0 0 100%;
    border: none;
    height: 100%;
  }

  .section3-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 65px;
    background: white;
    z-index: 100;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    display: flex;
    flex-direction: column;
    pointer-events: none; /* 默认不接收点击事件 */

    &.active {
      transform: translateX(0);
      pointer-events: auto; /* 激活时才接收点击事件 */
    }
  }

  .group-chat-content {
    .chat-header {
      padding: 12px 15px;
      position: sticky;
      top: 0;
      z-index: 10;

      .back-btn {
        display: block;
        padding: 0 8px 0 0;
        margin-right: 8px;
      }

      .group-info {
        .group-avatar-wrapper {
          width: 36px;
          height: 36px;
          margin-right: 10px;
        }

        .info {
          h3 {
            font-size: 15px;
          }

          span {
            font-size: 11px;
          }
        }
      }

      .detail-btn {
        font-size: 18px;
      }
    }

    .message-list {
      padding: 15px 10px;
      padding-bottom: 10px;

      .message {
        padding-bottom: 8px;

        .avatar {
          width: 36px;
          height: 36px;
        }

        .text {
          .content {
            max-width: 75%;
            font-size: 15px;
            padding: 0.65rem 1rem;
          }

          .sender-name {
            font-size: 11px;
            padding-left: 0.5vw;
          }
        }

        .chat-image-preview {
          max-width: 200px;
          max-height: 200px;
        }

        .file-content {
          width: 220px;
          padding: 10px;
        }
      }
    }

    .bottom {
      margin: 1.5% 1.5% 1.5% 1.5%;
      min-height: 160px;
      max-height: 220px;
      width: 94%;
      border-radius: 15px;

      .input-area {
        .file-preview-inline {
          padding: 6px 10px;
          margin: 6px 10px 0;
          max-height: 100px;

          .file-item {
            padding: 3px;

            .file-icon-container {
              width: 30px;
              height: 30px;

              .file-icon-img {
                width: 35px;
                height: 35px;
              }
            }

            .file-details {
              .file-name {
                font-size: 0.75rem;
              }

              .file-size {
                font-size: 0.65rem;
              }
            }
          }

          .file-count {
            font-size: 0.7rem;
            padding: 3px;
          }
        }

        textarea {
          width: calc(100% - 24px);
          margin: 0 12px;
          padding: 10px 12px;
          font-size: 16px; /* 防止iOS缩放 */
          min-height: 55px;

          &::placeholder {
            font-size: 15px;
          }
        }

        .toolbar {
          bottom: 8px;
          right: 12px;
          gap: 6px;
          padding: 4px;

          button {
            height: 30px;
            width: 30px;
            font-size: 0.85rem;

            &:last-of-type {
              min-width: 60px;
              padding: 0 12px;
              font-size: 0.8rem;
            }

            &.voice-recording {
              min-width: 90px;
              padding: 0 10px;
              font-size: 0.7rem;
            }

            &.voice-cancel {
              width: 30px;
            }
          }
        }
      }
    }
  }
  }

  /* 小屏移动设备 */
@media (max-width: 480px) {
  .group-chat-container {
    height: 100vh;
    overflow: hidden;
  }

  .container {
    font-size: 14px;
    height: calc(100vh - 60px); /* 减去小屏底部导航栏高度 */
    max-height: calc(100vh - 60px);
  }

  .section2,
  .section3 {
    padding: 0;
  }

  .section3-wrapper {
    bottom: 60px;
  }

  .search-fab {
    bottom: 70px; /* 小屏时调整位置 */
    height: 34px;
    padding: 0 12px;
    font-size: 13px;
    gap: 5px;

    i {
      font-size: 13px;
    }

    span {
      font-size: 13px;
    }
  }

  .group-chat-content {
    .chat-header {
      padding: 10px 12px;

      .group-info {
        .group-avatar-wrapper {
          width: 32px;
          height: 32px;
          margin-right: 8px;
        }

        .info {
          h3 {
            font-size: 14px;
          }

          span {
            font-size: 10px;
          }
        }
      }

      .detail-btn {
        font-size: 16px;
      }
    }

    .message-list {
      padding: 12px 8px;

      .message {
        padding-bottom: 8px;

        .avatar {
          width: 32px;
          height: 32px;
        }

        .text {
          .content {
            max-width: 80%;
            font-size: 14px;
            padding: 0.6rem 0.9rem;
          }

          .sender-name {
            font-size: 10px;
          }
        }

        .chat-image-preview {
          max-width: 180px;
          max-height: 180px;
        }

        .file-content {
          width: 200px;
          padding: 8px;
        }
      }
    }

    .bottom {
      min-height: 140px;
      max-height: 190px;
      margin: 1% 1.5% 1% 1.5%;

      .input-area {
        .file-preview-inline {
          padding: 5px 8px;
          margin: 5px 10px 0;
          max-height: 80px;

          .file-item {
            padding: 2px;

            .file-icon-container {
              width: 28px;
              height: 28px;

              .file-icon-img {
                width: 32px;
                height: 32px;
              }
            }

            .file-details {
              .file-name {
                font-size: 0.7rem;
              }

              .file-size {
                font-size: 0.6rem;
              }
            }
          }

          .file-count {
            font-size: 0.65rem;
            padding: 2px;
          }
        }

        textarea {
          width: calc(100% - 20px);
          margin: 0 10px;
          padding: 8px 10px;
          min-height: 50px;
          max-height: 90px;
        }

        .toolbar {
          bottom: 6px;
          right: 10px;
          gap: 5px;
          padding: 3px;

          button {
            height: 28px;
            width: 28px;
            font-size: 0.8rem;

            &:last-of-type {
              min-width: 55px;
              padding: 0 10px;
              font-size: 0.75rem;
            }

            &.voice-recording {
              min-width: 85px;
              padding: 0 8px;
              font-size: 0.65rem;
            }

            &.voice-cancel {
              width: 28px;
            }
          }
        }
      }
    }
  }
}

/* 横屏适配 */
@media (orientation: landscape) and (max-height: 500px) {
  .group-chat-container {
    height: 100vh;
    overflow: hidden;
  }

  .container {
    height: calc(100vh - 60px);
    max-height: calc(100vh - 60px);
  }

  .section3-wrapper {
    bottom: 60px;
  }

  .search-fab {
    bottom: 70px;
    height: 32px;
    padding: 0 12px;
    font-size: 12px;
    gap: 4px;

    i {
      font-size: 12px;
    }

    span {
      font-size: 12px;
    }
  }

  .group-chat-content {
    .bottom {
      min-height: 110px;
      max-height: 150px;
      margin: 1% 2% 1% 2%;

      .input-area {
        .file-preview-inline {
          padding: 4px 8px;
          margin: 4px 10px 0;
          max-height: 60px;

          .file-item {
            padding: 2px;

            .file-icon-container {
              width: 26px;
              height: 26px;

              .file-icon-img {
                width: 30px;
                height: 30px;
              }
            }
          }
        }

        textarea {
          min-height: 40px;
          max-height: 70px;
          padding: 8px 10px;
        }

        .toolbar {
          bottom: 5px;
          right: 10px;
          gap: 4px;
          padding: 3px;

          button {
            height: 26px;
            width: 26px;
            font-size: 0.75rem;

            &:last-of-type {
              min-width: 50px;
              padding: 0 8px;
              font-size: 0.7rem;
            }

            &.voice-recording {
              min-width: 80px;
              padding: 0 6px;
              font-size: 0.6rem;
            }

            &.voice-cancel {
              width: 26px;
            }
          }
        }
      }
    }
  }
}

/* 高亮动画 */
@keyframes highlight-pulse {
  0% {
    background-color: rgba(255, 235, 59, 0.6);
    transform: scale(1.02);
  }
  50% {
    background-color: rgba(255, 235, 59, 0.4);
  }
  100% {
    background-color: rgba(255, 235, 59, 0.3);
    transform: scale(1);
  }
}
</style>
