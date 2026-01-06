<template>
  <div class="box">
    <div class="main">
      <div class="header">
        <div class="header-left">
          <h4>
            {{ uname }}
            <span 
              class="online-status-indicator" 
              :class="{ online: isUserOnline(chatstore.currentChatUser) }"
            >
              {{ isUserOnline(chatstore.currentChatUser) ? '在线' : '离线' }}
            </span>
          </h4>
        </div>
        <div class="header-right">
          <button
            @click="deleteCurrentChat"
            class="delete-chat"
            title="删除当前聊天记录"
          >
            <img
              src="/images/icon/delete.png"
              alt="删除"
              style="width: 16px; height: 16px"
            />
          </button>
          <button class="off" @click="offmessage">✖</button>
        </div>
      </div>
      
      <!-- 消息列表区域 -->
      <ChatMessageList
        ref="messageListRef"
        :messages="messages"
        :currentUserId="currentUserId"
        :otherUserAvatar="avatar"
        :myAvatar="myAvatar"
        :baseUrl="baseUrl"
        messageType="normal"
        :showAvatar="true"
        :showSenderName="false"
        :autoScroll="true"
        @preview-image="handlePreviewImage"
        @preview-video="handlePreviewVideo"
        @preview-file="handlePreviewFile"
        @play-voice="handlePlayVoice"
        @forward-message="handleForwardMessage"
        @forward-messages="handleForwardMessages"
        @download-file="handleDownloadFile"
        @delete-message="handleDeleteMessage"
        @delete-messages="handleDeleteMessages"
        @recall-message="handleRecallMessage"
        @re-edit-message="handleReEditMessage"
        @selection-change="handleSelectionChange"
      />
      
      <!-- 输入区域 -->
      <ChatInput
        ref="chatInputRef"
        placeholder="输入消息..."
        :showEmojiButton="true"
        :showFileButton="true"
        :showVoiceButton="true"
        :showSearchButton="false"
        @send-message="handleSendMessage"
        @send-file="handleSendFile"
        @typing-start="handleTypingStart"
        @typing-stop="handleTypingStop"
      />
    </div>

    <!-- 转发对话框 -->
    <ForwardDialog
      v-if="showForwardDialog"
      :messages="forwardMessages"
      @close="showForwardDialog = false"
      @forward-complete="handleForwardComplete"
    />
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useChatStore } from '../stores/useChatStore'
import axios from 'axios'
import { watch } from 'vue'
import { socket } from '../../utils/socket'
import { onBeforeUnmount } from 'vue'
import ChatMessageList from '../components/chat/ChatMessageList.vue'
import ChatInput from '../components/chat/ChatInput.vue'
import ForwardDialog from '../components/ForwardDialog.vue'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'
import { useOnlineStatus } from '../composables/useOnlineStatus'

const messages = ref([])
const messageListRef = ref(null)
const chatInputRef = ref(null)
const showForwardDialog = ref(false)
const forwardMessages = ref([])
const chatstore = useChatStore()

const uname = ref('')
const avatar = ref('') // 对方头像
const myAvatar = ref('') // 自己的头像
const currentUserId = ref(localStorage.getItem('userId') || '') // 当前登录用户ID
const route = useRoute()
const baseUrl = import.meta.env.VITE_BASE_URL
const toast = useToast()
const { confirm } = useConfirm()

// 在线状态管理
const { isUserOnline } = useOnlineStatus()

// 新增事件处理函数
function handleSendMessage(messageData) {
  if (messageData && messageData.content && messageData.content.trim()) {
    sendMessage(messageData.content)
  }
}

async function handleSendFile(messageData) {
  if (!messageData.files || messageData.files.length === 0) return
  
  const token = localStorage.getItem('token')
  if (!token) {
    toast.error('请先登录')
    return
  }

  try {
    for (const file of messageData.files) {
      // 上传文件
      const formData = new FormData()
      formData.append('file', file)
      
      const uploadRes = await axios.post(
        `${baseUrl}/api/file/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      // 发送文件消息
      const messageType = file.type.startsWith('image/') ? 'image' : 
                         file.type.startsWith('video/') ? 'video' : 'file'
                         
      await axios.post(
        `${baseUrl}/api/chat/messages/${chatstore.currentChatUser}`,
        {
          content: messageData.content || '',
          messageType: messageType,
          fileInfo: {
            fileName: uploadRes.data.fileName,
            fileUrl: uploadRes.data.fileUrl,
            fileSize: uploadRes.data.fileSize,
            fileType: uploadRes.data.fileType || file.type
          }
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      
      // 通过Socket发送实时文件消息
      socket.emit('private-file-message', {
        to: chatstore.currentChatUser,
        messageType: messageType,
        fileInfo: {
          fileName: uploadRes.data.fileName,
          fileUrl: uploadRes.data.fileUrl,
          fileSize: uploadRes.data.fileSize,
          fileType: uploadRes.data.fileType || file.type
        }
      })
    }
    
    // 刷新消息列表
    await getlists()
  } catch (error) {
    console.error('发送文件失败:', error)
    toast.error('发送文件失败: ' + (error.response?.data?.message || error.message))
  }
}

function handlePreviewImage(fileInfo) {
  window.open(baseUrl + fileInfo.fileUrl, '_blank')
}

function handlePreviewVideo(fileInfo) {
  window.open(baseUrl + fileInfo.fileUrl, '_blank')
}

function handlePreviewFile(fileInfo) {
  window.open(baseUrl + fileInfo.fileUrl, '_blank')
}

function handlePlayVoice(fileInfo) {
  const audio = new Audio(baseUrl + fileInfo.fileUrl)
  audio.play().catch(err => {
    console.error('播放语音失败:', err)
    toast.error('播放语音失败')
  })
}

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
async function handleDeleteMessages(messagesToDelete) {
  if (!messagesToDelete || messagesToDelete.length === 0) return
  
  const confirmed = await confirm({
    title: '删除消息',
    message: `确定要删除这 ${messagesToDelete.length} 条消息吗？`
  })
  
  if (confirmed) {
    try {
      console.log('批量删除消息:', messagesToDelete)
      
      // 获取要删除的消息ID列表
      const messageIds = messagesToDelete.map(msg => msg._id || msg.id).filter(id => id)
      
      // 如果有消息ID，尝试调用服务端API删除
      if (messageIds.length > 0) {
        try {
          const token = localStorage.getItem('token')
          const baseUrl = import.meta.env.VITE_BASE_URL
          
          // 批量删除API调用（如果服务端支持）
          await axios.delete(`${baseUrl}/api/chat/messages/batch`, {
            headers: { Authorization: `Bearer ${token}` },
            data: { 
              messageIds: messageIds,
              chatUserId: chatstore.currentChatUser
            }
          })
          
          console.log('服务端批量删除成功')
        } catch (apiError) {
          console.warn('服务端批量删除失败，使用客户端删除:', apiError)
        }
      }
      
      // 从本地消息列表中移除被删除的消息
      const deletedMessageIds = new Set(messagesToDelete.map(msg => msg._id || msg.id))
      messages.value = messages.value.filter(msg => !deletedMessageIds.has(msg._id || msg.id))
      
      // 通过Socket通知对方消息被删除
      if (socket && socket.connected && chatstore.currentChatUser) {
        socket.emit('private-messages-deleted', {
          from: localStorage.getItem('userId'),
          to: chatstore.currentChatUser,
          messageIds: messageIds
        })
      }
      
      toast.success(`已删除 ${messagesToDelete.length} 条消息`)
    } catch (error) {
      console.error('批量删除消息失败:', error)
      toast.error('删除消息失败，请重试')
    }
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

    // 检查是否是自己的消息 - 修正逻辑以匹配MessageContextMenu
    const currentUserId = localStorage.getItem('userId')
    const isMyMessage = String(messageToRecall.from) === String(currentUserId)
    if (!isMyMessage) {
      toast.error('只能撤回自己的消息')
      return
    }

    // 临时方案：客户端撤回（因为服务端API暂未实现）
    // TODO: 服务端需要实现 DELETE /api/chat/messages/{messageId}/recall 端点
    console.warn('撤回API暂未在服务端实现，使用客户端方案')

    // 更新消息状态为已撤回，并添加重新编辑选项
    messages.value[messageIndex] = {
      ...messageToRecall,
      content: '你撤回了一条消息',
      messageType: 'system',
      recalled: true,
      originalContent: messageToRecall.content, // 保存原始内容用于重新编辑
      canReEdit: true // 标记可以重新编辑
    }

    // 通过Socket通知对方消息被撤回
    socket.emit('recall-private-message', {
      chatWith: chatstore.currentChatUser,
      messageId: messageToRecall._id || messageToRecall.id,
      userId: currentUserId
    })

    // 显示撤回成功提示
    toast.success('消息已撤回')
  } catch (error) {
    console.error('撤回消息失败:', error)
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

async function handleDeleteMessage(messageIndex) {
  const confirmed = await confirm({
    title: '删除消息',
    message: '确定要删除这条消息吗？'
  })
  
  if (confirmed) {
    messages.value.splice(messageIndex, 1)
    toast.success('消息已删除')
  }
}

// 消息选择功能现在由ChatMessageList组件处理

// 输入状态事件现在由ChatInput组件处理

// 发送消息函数
async function sendMessage(content) {
  if (!content || !content.trim()) return
  
  const token = localStorage.getItem('token')
  if (!token) {
    toast.error('请先登录')
    return
  }

  try {
    const res = await axios.post(
      `${baseUrl}/api/chat/messages/${chatstore.currentChatUser}`,
      {
        content: content,
        messageType: 'text'
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )

    // 发送成功，刷新消息列表
    await getlists()
    
    // 通过Socket发送实时消息
    socket.emit('private-message', {
      to: chatstore.currentChatUser,
      content: content,
      messageType: 'text'
    })
  } catch (error) {
    console.error('发送消息失败:', error)
    toast.error('发送消息失败: ' + (error.response?.data?.message || error.message))
  }
}

// 获取消息列表
async function getlists() {
  console.log('=== 开始获取消息列表 ===')
  console.log('chatstore.currentChatUser:', chatstore.currentChatUser)
  
  if (!chatstore.currentChatUser) {
    console.warn('没有设置currentChatUser，无法获取消息')
    return
  }
  
  const token = localStorage.getItem('token')
  if (!token) {
    console.warn('没有token，无法获取消息')
    return
  }

  try {
    const url = `${baseUrl}/api/chat/messages/${chatstore.currentChatUser}`
    console.log('请求URL:', url)
    
    const res = await axios.get(url, { 
      headers: { Authorization: `Bearer ${token}` } 
    })
    
    messages.value = res.data || []
    console.log('获取到的消息数量:', messages.value.length)
    console.log('消息列表:', messages.value)
  } catch (error) {
    console.error('获取消息列表失败:', error)
    console.error('错误详情:', error.response?.data)
  }
}

// 获取对方头像
async function getavatar() {
  if (!chatstore.currentChatUser) return
  
  try {
    const res = await axios.get(
      `${baseUrl}/api/user/friend_avatar/${chatstore.currentChatUser}`
    )
    avatar.value = res.data.avatar || '/images/avatar/default-avatar.webp'
    console.log('获取到对方头像:', avatar.value)
  } catch (error) {
    console.error('获取头像失败:', error)
    // 设置默认头像
    avatar.value = '/images/avatar/default-avatar.webp'
  }
}

// 获取自己的头像
async function getMyAvatar() {
  const token = localStorage.getItem('token')
  console.log('=== 获取自己的头像 ===')
  console.log('Token:', token ? '存在' : '不存在')
  
  if (!token) {
    console.warn('没有token，无法获取头像')
    return
  }

  try {
    const response = await axios.get(
      `${baseUrl}/api/user/info`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )

    console.log('用户信息响应:', response.data)
    
    // 后端返回的是 { id, name, ava }，没有success字段
    if (response.data && response.data.ava) {
      myAvatar.value = response.data.ava
      console.log('设置的myAvatar:', myAvatar.value)
    } else {
      console.warn('响应中没有头像数据')
      myAvatar.value = '/images/avatar/default-avatar.webp'
    }
  } catch (error) {
    console.error('获取自己头像失败:', error)
    console.error('错误详情:', error.response?.data)
    myAvatar.value = '/images/avatar/default-avatar.webp'
  }
}

// 删除当前聊天记录
async function deleteCurrentChat() {
  const confirmed = await confirm({
    title: '删除聊天记录',
    message: '确定要删除与该用户的所有聊天记录吗？'
  })
  
  if (!confirmed) return
  
  const token = localStorage.getItem('token')
  if (!token) return

  try {
    await axios.delete(
      `${baseUrl}/api/chat/delete/${chatstore.currentChatUser}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )
    
    messages.value = []
    toast.success('聊天记录已删除')
  } catch (error) {
    console.error('删除聊天记录失败:', error)
    toast.error('删除失败')
  }
}

// 关闭消息窗口
function offmessage() {
  // 可以添加关闭逻辑，比如返回到联系人列表
  chatstore.currentChatUser = ''
}

// 清理Socket事件监听器
onBeforeUnmount(() => {
  socket.off('message-deleted')
  socket.off('messages-deleted')
  socket.off('avatar-updated')
  socket.off('private-message')
  socket.off('private-file-message')
  socket.off('private-message-recalled')
  
  // 清理转发消息事件监听器
  window.removeEventListener('private-message-forwarded', handleForwardedPrivateMessage)
})

// 处理私聊转发消息事件
function handleForwardedPrivateMessage(event) {
  const { userId, message, forwardData } = event.detail
  
  // 如果转发到当前私聊用户，立即更新消息列表
  if (chatstore.currentChatUser && userId === chatstore.currentChatUser) {
    if (message && !messages.value.some(msg => msg._id === message._id || msg.id === message.id)) {
      messages.value.push(message)
      
      // 滚动到底部
      nextTick(() => {
        const messageList = document.querySelector('.message-list')
        if (messageList) {
          messageList.scrollTop = messageList.scrollHeight
        }
      })
    }
  }
}

onMounted(() => {
  console.log('=== Content组件挂载 ===')
  console.log('当前聊天用户 (chatstore):', chatstore.currentChatUser)
  console.log('URL参数:', route.query)
  
  // 监听私聊转发消息事件
  window.addEventListener('private-message-forwarded', handleForwardedPrivateMessage)
  
  uname.value = route.query.uname
  avatar.value = route.query.img

  // 页面刷新时从URL参数恢复用户状态
  const urlUserId = route.query.userId
  if (urlUserId && !chatstore.currentChatUser) {
    console.log('从URL参数恢复用户状态:', urlUserId)
    chatstore.switchChatUser(urlUserId)
  }

  // 发送Socket登录事件
  const currentUserId = localStorage.getItem('userId')
  console.log('当前登录用户ID:', currentUserId)
  if (currentUserId) {
    socket.emit('login', currentUserId)
  }

  // 确保有聊天用户后再获取数据
  const targetUserId = chatstore.currentChatUser || urlUserId
  console.log('目标聊天用户ID:', targetUserId)
  
  if (targetUserId) {
    //这里获取对方头像
    getavatar()
    //这里写获取消息列表
    getlists().then(() => {
      // 消息加载完成后滚动到底部
      nextTick(() => {
        if (messageListRef.value) {
          messageListRef.value.scrollToBottom()
        }
      })
    })
  }
  
  //这里获取自己的头像
  getMyAvatar()

  // ChatMessageList组件会自动滚动到底部

  // 监听消息删除事件
  socket.on('message-deleted', (data) => {
    if (data.chatWith === route.params.id) {
      messages.value = messages.value.filter(
        (msg) => msg._id !== data.messageId
      )
    }
  })

  socket.on('messages-deleted', (data) => {
    if (data.chatWith === route.params.id) {
      messages.value = messages.value.filter(
        (msg) => !data.messageIds.includes(msg._id)
      )
    }
  })

  // 监听头像更新事件
  socket.on('avatar-updated', (data) => {
    // 如果是当前聊天对象的头像更新，则更新对方头像显示
    if (data.userId.toString() === chatstore.currentChatUser) {
      avatar.value = data.newAvatarUrl
    }
    // 如果是自己的头像更新，则更新自己的头像显示
    const currentUserId = localStorage.getItem('userId')
    if (data.userId.toString() === currentUserId) {
      myAvatar.value = data.newAvatarUrl
    }
  })

  // 监听私聊消息
  socket.on('private-message', async ({ from }) => {
    // 只有当消息来自当前聊天用户时才刷新消息列表
    if (from === chatstore.currentChatUser) {
      await getlists()
      // ChatMessageList组件会自动滚动到底部
    }
  })

  // 监听私聊文件消息
  socket.on(
    'private-file-message',
    async ({ from, fileUrl, fileName, fileType, messageType }) => {
      // 只有当消息来自当前聊天用户时才刷新消息列表
      if (from === chatstore.currentChatUser) {
        console.log('收到私聊文件消息，刷新消息列表')
        await getlists()
      }
    }
  )

  // 监听私聊消息撤回事件
  socket.on('private-message-recalled', (data) => {
    if (data.chatWith === route.params.id) {
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
})

// 重复函数已删除，保留上面的版本

// 录音功能现在由ChatInput组件处理

// send函数现在由ChatInput组件处理

watch(
  () => chatstore.currentChatUser,
  async (newUser, oldUser) => {
    console.log('聊天用户变化:', { newUser, oldUser })
    if (newUser !== oldUser && newUser) {
      console.log('开始加载聊天内容，用户ID:', newUser)
      // 当聊天用户切换时，更新用户名和头像
      if (route.query.uname) {
        uname.value = route.query.uname
      }
      if (route.query.img) {
        avatar.value = route.query.img
      }
      await getavatar()
      await getMyAvatar()
      await getlists()
      
      // 确保DOM完全更新后再滚动到底部
      await nextTick()
      setTimeout(() => {
        if (messageListRef.value) {
          messageListRef.value.scrollToBottom()
        }
      }, 100)
    }
  }
)

watch(
  () => route.query.uname,
  (new_uname) => {
    uname.value = new_uname
  }
)

// 滚动和静音功能现在由组件处理

const emit = defineEmits(['closemessage'])
// offmessage函数已在上面定义

// 所有消息相关功能现在由ChatMessageList和ChatInput组件处理

onBeforeUnmount(() => {
  socket.off('private-message')
  socket.off('private-file-message')
  socket.off('message-deleted')
  socket.off('messages-deleted')
  socket.off('avatar-updated')
})
</script>

<style scoped lang="scss">
.box {
  width: 100%;
  height: 100%;
  padding: 2% 1%;
  padding-top: 1%;
  /* height: 100vh; */
}

.main {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 24px;
  background-color: #ffffff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;

  .header {
    border-top-left-radius: 24px;
    border-top-right-radius: 24px;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    padding: 12px 24px;
    background-color: #ffffff;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    height: 60px;

    .header-left {
      display: flex;
      align-items: center;

      h4 {
        margin: 0;
        font-size: 19px;
        font-weight: 600;
        color: #2c3e50;
        display: flex;
        align-items: center;
        gap: 10px;
      }
    }
    
    .online-status-indicator {
      font-size: 12px;
      padding: 3px 10px;
      border-radius: 12px;
      background-color: #e0e0e0;
      color: #666;
      font-weight: 500;
      
      &.online {
        background-color: #e8f5e9;
        color: #4caf50;
      }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;

      button {
        height: 36px;
        width: 36px;
        border: none;
        cursor: pointer;
        font-size: 16px;
        background-color: transparent;
        border-radius: 50%;
        transition: all 0.2s ease;
        -webkit-app-region: no-drag;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          background-color: rgba(255, 127, 80, 0.1);
          color: rgb(255, 127, 80);
        }
      }
    }
  }

  .middle {
    /* border: 1px solid black; */
    border-radius: 1rem;
    flex: 10;
    overflow-y: scroll;
    overflow-x: hidden;
    -webkit-app-region: no-drag;

    ul {
      height: 100%;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;

      li {
        flex: 0 0 10%;
        padding-top: 1vh;
        padding-left: 1vw;
        list-style-type: none;
      }
    }
  }
}

*:focus {
  border: none;
  outline: none;
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
.text {
  height: 100%;
  position: relative;
  flex: 9;
  /* background-color: aliceblue; */
  position: relative;
  display: flex;
  flex-direction: column;
  // justify-content: flex-end;

  &.me {
    align-items: flex-end;
    .file-message {
      align-items: flex-end;
    }

    .content {
      border-radius: 18px 18px 4px 18px;
      margin-right: 10px;
      background: var(--message-bg-user);
      color: var(--message-text-user);
      box-shadow: var(--shadow-primary);
    }
  }

  /* 消息时间显示样式 */
  .message-time {
    font-size: 12px;
    color: #999;
    text-align: center;
    margin: 8px auto;
    padding: 4px 12px;
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 12px;
    display: block;
    width: fit-content;
    max-width: 200px;
    word-break: keep-all;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .content {
    display: inline-block;
    background-color: #ffffff;
    color: #2c3e50;
    padding: 0.75rem 1.2rem;
    margin: 0 1vw 0.4rem;
    border-radius: 18px 18px 18px 4px;
    width: fit-content;
    max-width: 85%;
    word-wrap: break-word;
    word-break: break-word;
    font-size: 16px;
    line-height: 1.5;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(0, 0, 0, 0.04);
  }
}
.triangle {
  background-color: transparent;
  width: 0;
  height: 0;
  position: absolute;
  border-top: 20px solid transparent;
  border-bottom: 30px solid #f9f9f9;
  border-left: 20px solid transparent;
  border-right: 20px solid transparent;
  bottom: 0;
  left: 5px;
  color: transparent;
}

.send {
  position: relative;
  bottom: 0;
  width: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 10px 20px 15px;
  -webkit-app-region: no-drag;
  background-color: #fafafa;
  border-radius: 0 0 1rem 1rem;
  border-top: 1px solid #f0f0f0;

  button {
    height: 36px;
    padding: 0 16px;
    border-radius: 18px;
    border: none;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 60px;

    &:first-of-type {
      background-color: #f5f5f5;
      color: #666;
      border: 1px solid #e0e0e0;

      &:hover {
        background-color: #eeeeee;
        transform: translateY(-1px);
      }
    }

    &:last-of-type {
      display: none;
      background-color: rgba(165, 42, 42, 0.9);
      color: white;
      box-shadow: 0 2px 8px rgba(165, 42, 42, 0.3);

      &:hover {
        background-color: rgba(165, 42, 42, 1);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(165, 42, 42, 0.4);
      }
    }

    &.active {
      display: flex;
    }
  }
}
.emoji-picker-container {
  position: absolute;
  bottom: 0;
  right: 0;
}

/* 新增的样式 */
/* 视频预览容器样式 */
.video-preview-container {
  position: relative;
  max-width: 280px;
  max-height: 180px;
  min-width: 200px;
  min-height: 120px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f5f5f5;

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);

    &::after {
      opacity: 1;
    }
  }

  &::after {
    content: '▶';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 2rem;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    pointer-events: none;
    opacity: 0.8;
    transition: opacity 0.3s ease;
    z-index: 2;
  }
}

.chat-video-preview {
  width: 100%;
  height: 100%;
  max-width: 280px;
  max-height: 180px;
  object-fit: cover;
  border-radius: 8px;
  display: block;
  background: #000;
}

/* 文件预览容器样式 */
.file-link-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  max-width: 300px;

  &:hover {
    background-color: #f5f5f5;
    border-color: #007bff;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .file-icon-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background-color: #f8f9fa;
    border-radius: 8px;
    flex-shrink: 0;

    .file-icon-img {
      width: 32px;
      height: 32px;
      object-fit: contain;
    }

    .file-icon {
      font-size: 24px;
    }
  }

  .file-details {
    flex: 1;
    min-width: 0;

    .file-name {
      font-weight: 500;
      color: #333;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-size {
      font-size: 12px;
      color: #666;
    }
  }
}

/* 预览覆盖层样式 */
.preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 8px;

  .preview-icon {
    font-size: 24px;
    color: white;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }
}

.video-preview-container:hover .preview-overlay,
.file-link-container:hover .preview-overlay,
.image-preview-container:hover .preview-overlay {
  opacity: 1;
}

/* 图片预览容器样式 */
.image-preview-container {
  position: relative;
  max-width: 300px;
  max-height: 300px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  }
}

.chat-image-preview {
  max-width: 150px; /* 限制图片宽度 */
  max-height: 150px; /* 限制图片高度 */
  border-radius: 8px;
  cursor: pointer;
  display: block;
  margin-top: 5px;
}
.file-message {
  padding: 0;
  margin: 0;
  width: 100%;
}

.file-content {
  background-color: #f0f8ff;
  border: 1px solid #d0e7ff;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 250px;

  .file-link {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #4a90e2;
    text-decoration: none;
    font-weight: 500;
    font-size: 14px;

    &:hover {
      text-decoration: underline;
    }
  }
}

/* 自己发送的文件消息右对齐 */
.text.me {
  .file-message {
    display: flex;
    flex-direction: column;
  }

  .file-content {
    margin-right: 10px;
  }

  .image-preview-container {
    margin-right: 10px;
  }
}

.file-info {
  font-size: 12px;
  color: #666;
  margin-top: 5px;
}

.file-size {
  font-size: 12px;
  color: #666;
  margin: 0;
}

.forwarded-info {
  color: #888;
  font-size: 0.8em;
  font-style: italic;
  margin-bottom: 4px;
  padding: 2px 6px;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  border-left: 3px solid #007bff;
}

.file-button {
  background-color: #f0f0f0 !important;
  border: 1px solid #ddd !important;

  &:hover {
    background-color: #e0e0e0 !important;
  }
}

/* 语音消息样式 */
.voice-message {
  padding: 0;
  margin: 0;
  width: 100%;
}

.voice-content {
  background-color: #e8f5e9;
  border: 1px solid #c8e6c9;
  border-radius: 20px;
  padding: 10px 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 120px;
  max-width: 200px;
}

.voice-play-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
}

.voice-duration {
  font-size: 14px;
  color: #2e7d32;
  font-weight: 500;
}

/* 录音按钮样式 */
.voice-button {
  background-color: #4caf50 !important;
  color: white !important;
  border: none !important;
  font-size: 18px;

  &:hover {
    background-color: #45a049 !important;
  }
}

.voice-recording {
  background-color: #f44336 !important;
  color: white !important;
  border: none !important;
  animation: pulse 1.5s infinite;
  font-size: 14px;
  padding: 8px 12px;
}

.voice-cancel {
  background-color: #ff9800 !important;
  color: white !important;
  border: none !important;
  font-size: 14px;

  &:hover {
    background-color: #fb8c00 !important;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* 文件预览样式 - 与发送消息样式保持一致 */
.file-preview {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 8px;
  max-width: 300px;
  // background-color: #f0f8ff;
  transition: all 0.3s ease;

  &:hover {
    background-color: #f5f5f5;
    border-color: #007bff;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .file-icon-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background-color: #f8f9fa;
    border-radius: 8px;
    flex-shrink: 0;

    .file-icon-img {
      width: 32px;
      height: 32px;
      object-fit: contain;

      &.image-thumbnail {
        width: 48px;
        height: 48px;
        object-fit: cover;
        border-radius: 4px;
      }
    }
  }

  .file-details {
    flex: 1;
    min-width: 0;

    .file-name {
      font-weight: 500;
      color: #333;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-size {
      font-size: 12px;
      color: #666;
    }
  }
}

.cancel-file {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  color: #999;

  &:hover {
    background-color: rgba(255, 0, 0, 0.1);
    color: #666;
  }
}

/* 删除聊天记录按钮样式 */
.delete-chat {
  background-color: #ff6b6b !important;
  color: white !important;
  border: none !important;
  padding: 8px 12px !important;
  border-radius: 6px !important;
  cursor: pointer !important;
  transition: all 0.3s ease !important;
  font-size: 14px !important;

  &:hover {
    background-color: #ff5252 !important;
    transform: scale(1.05) !important;
  }

  &:active {
    transform: scale(0.95) !important;
  }
}

/* 消息选择相关样式 */
.message {
  position: relative;
  transition: all 0.3s ease;

  &.selected {
    background: rgba(76, 175, 80, 0.1);
    border-left: 4px solid #4caf50;
  }

  /* 多选模式下消息内容左移 */
  &:has(.message-checkbox) {
    .avatar,
    .text {
      margin-left: 40px;
    }
  }
}

.message-checkbox {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;

  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
}

/* 多选操作栏样式 */
.selection-toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #f8f9fa;
  border-top: 1px solid #dee2e6;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1000;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

.selection-info {
  font-weight: 500;
  color: #495057;
}

.selection-actions {
  display: flex;
  gap: 0.5rem;

  button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.3s ease;
  }
}

.forward-btn {
  background: #007bff;
  color: white;

  &:hover:not(:disabled) {
    background: #0056b3;
  }
}

.delete-btn {
  background: #dc3545;
  color: white;

  &:hover:not(:disabled) {
    background: #c82333;
  }
}

.cancel-btn {
  background: #6c757d;
  color: white;

  &:hover {
    background: #545b62;
  }
}

.selection-actions {
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

/* 消息右键菜单样式 */
.message-context-menu {
  position: fixed;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  min-width: 120px;
  overflow: hidden;
}

.context-menu-item {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 0.9rem;
  border-bottom: 1px solid #f8f9fa;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #f8f9fa;
  }
}

.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
}

/* 转发对话框样式 */
.forward-dialog {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1002;
  display: flex;
  justify-content: center;
  align-items: center;
}

.forward-dialog-content {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  z-index: 1003;

  h3 {
    margin: 0 0 1.5rem 0;
    text-align: center;
    color: #333;
  }
}

.forward-friends-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 1.5rem;
  border: 1px solid #dee2e6;
  border-radius: 8px;
}

.forward-friend-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #f8f9fa;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #f8f9fa;
  }

  &.selected {
    background: rgba(76, 175, 80, 0.1);
    border-left: 4px solid #4caf50;
  }
}

.friend-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 1rem;
}

.friend-name {
  flex: 1;
  font-weight: 500;
}

.friend-checkbox {
  input[type='checkbox'] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
}

.forward-dialog-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.confirm-btn {
  padding: 0.75rem 2rem;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background: #218838;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.forward-dialog-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1002;
}

/* 预览弹窗样式 */
.preview-dialog {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1004;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-dialog-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  position: relative;
  z-index: 1005;
  display: flex;
  flex-direction: column;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #dee2e6;
  background: #f8f9fa;

  h3 {
    margin: 0;
    color: #333;
    font-size: 1.1rem;
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #666;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    background: #e9ecef;
    color: #333;
  }
}

.preview-body {
  flex: 1;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

/* 图片预览 */
.image-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 400px;

  img {
    max-width: 100%;
    max-height: 70vh;
    object-fit: contain;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    transition: transform 0.3s ease;

    &:hover {
      transform: scale(1.02);
    }
  }
}

/* 视频预览 */
.video-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 400px;

  video {
    max-width: 100%;
    max-height: 70vh;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
    transition: transform 0.3s ease;

    &:hover {
      transform: scale(1.02);
    }
  }
}

/* 文本预览 */
.text-preview {
  padding: 1.5rem;
  max-height: 60vh;
  overflow: auto;

  pre {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid #dee2e6;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    line-height: 1.4;
    white-space: pre-wrap;
    word-wrap: break-word;
    margin: 0;
    color: #333;
  }
}

/* PDF预览 */
.pdf-preview {
  width: 100%;
  height: 70vh;
  padding: 1rem;

  iframe {
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 8px;
  }
}

/* 文件预览 */
.file-preview {
  padding: 3rem;
  text-align: center;
  min-width: 450px;
  // background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
  min-height: 75px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.file-preview-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2.5rem;
  background: rgba(255, 255, 255, 0.9);
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.file-icon-large {
  width: 80px;
  height: 80px;
  object-fit: contain;
  margin-bottom: 1.5rem;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
}

.file-details-large {
  text-align: center;
}

.file-name-large {
  font-size: 1.3rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.75rem;
  word-break: break-all;
  line-height: 1.4;
}

.file-size-large {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.file-type {
  font-size: 1rem;
  color: #888;
  text-transform: uppercase;
  font-weight: 500;
  letter-spacing: 1px;
}

.file-actions {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
}

.download-btn,
.open-btn {
  padding: 1rem 2rem;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.download-btn {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;

  &:hover {
    background: linear-gradient(135deg, #218838 0%, #1ea085 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(40, 167, 69, 0.3);
  }
}

.open-btn {
  background: linear-gradient(135deg, #007bff 0%, #6610f2 100%);
  color: white;

  &:hover {
    background: linear-gradient(135deg, #0056b3 0%, #520dc2 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 123, 255, 0.3);
  }
}

.preview-dialog-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1004;
}

/* 预览提示样式 */
.preview-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.image-container,
.video-container,
.file-container {
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.02);

    .preview-hint {
      opacity: 1;
    }
  }
}

/* 响应式设计 */

/* 大屏幕设备 */
@media (min-width: 1200px) {
  .container {
    padding: 1rem;
  }

  .top {
    padding: 1.2rem 1.5rem;
  }

  .middle {
    padding: 0 1rem;
  }

  .bottom {
    margin: 1.5% 1.5% 1.5% 1.5%;
    min-height: 160px;
  }
}

/* 平板设备 */
@media (max-width: 1199px) and (min-width: 769px) {
  .container {
    padding: 0.8rem;
  }

  .top {
    padding: 1rem 1.2rem;
  }

  .middle {
    padding: 0 0.8rem;

    .message {
      .content {
        max-width: 75%;
        font-size: 16px;
      }
    }
  }

  .bottom {
    margin: 1.5% 1.5% 1.5% 1.5%;
    min-height: 140px;

    .input-area {
      textarea {
        font-size: 0.95rem;
      }
    }
  }
}

/* 移动设备 */
@media (max-width: 768px) {
  .box {
    padding: 0;
    width: 100%;
    height: 100%;
  }

  .main {
    border-radius: 0;
    box-shadow: none;
  }

  .container {
    height: 100vh;
    border-radius: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .top {
    flex: 0 0 auto;
    padding: 1rem;
    border-bottom: 1px solid #e0e0e0;
    background: #fff;
    z-index: 10;

    .top_child {
      span {
        font-size: 1.1rem;
        font-weight: 600;
      }
    }
  }

  .middle {
    flex: 1;
    padding: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 10px;

    ul {
      padding: 0.5rem;

      li {
        padding: 0.8rem 1rem;

        &.my-message {
          .content {
            max-width: 85%;
            font-size: 15px;
            padding: 0.7rem 1rem;
          }
        }

        &:not(.my-message) {
          .content {
            max-width: 85%;
            font-size: 15px;
            padding: 0.7rem 1rem;
          }
        }
      }
    }

    .message {
      .avatar {
        width: 36px;
        height: 36px;
      }

      .content {
        max-width: 85%;
        font-size: 15px;
        line-height: 1.4;
        padding: 0.7rem 1rem;
      }
    }

    /* 文件消息优化 */
    .file-content {
      width: 220px;
      padding: 10px;
    }

    .chat-image-preview {
      max-width: 120px;
      max-height: 120px;
    }

    .video-preview-container {
      max-width: 200px;
      max-height: 150px;
      min-width: 150px;
      min-height: 100px;
    }
  }

  .bottom {
    flex: 0 0 auto;
    margin: 0;
    margin-bottom: 65px; /* 为底部导航栏留出空间 */
    border-radius: 0;
    border: none;
    border-top: 1px solid #e0e0e0;
    min-height: 160px;
    max-height: 240px;
    width: 100%;
    background: var(--bg-primary, #ffffff);
    position: relative;
    display: flex;
    flex-direction: column;

    .input-area {
      display: flex;
      flex-direction: column;
      height: 100%;
      position: relative;
      padding: 10px 0;

      .file-preview-inline {
        padding: 6px 10px;
        gap: 4px;
        margin: 0 10px 8px;
        max-height: 80px;
        overflow-y: auto;
      }

      textarea {
        width: calc(100% - 24px);
        margin: 0 12px;
        padding: 12px;
        font-size: 16px; /* 防止iOS缩放 */
        min-height: 60px;
        max-height: 100px;
        resize: none;
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 12px;

        &::placeholder {
          font-size: 15px;
        }
      }

      .toolbar {
        position: relative;
        bottom: auto;
        right: auto;
        margin: 10px 12px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        background: var(--bg-primary, rgba(255, 255, 255, 0.95));
        border-radius: 12px;
        flex-wrap: wrap;

        button {
          height: 38px;
          width: 38px;
          font-size: 1.1rem;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          &:last-of-type {
            min-width: 70px;
            width: auto;
            padding: 0 16px;
            font-size: 0.9rem;
            margin-left: auto;
          }

          &.voice-recording {
            width: auto;
            min-width: 100px;
            padding: 8px 14px;
            font-size: 0.85rem;
          }

          &.voice-cancel {
            width: 38px;
            min-width: 38px;
          }

          &.voice-button {
            font-size: 1.2rem;
          }
        }
      }
    }

    .send-buttons {
      padding: 8px 12px;
      gap: 8px;

      button {
        padding: 8px 16px;
        font-size: 0.9rem;

        &:last-of-type {
          padding: 8px 20px;
        }
      }
    }
  }

  /* 预览弹窗移动端优化 */
  .preview-dialog-content {
    max-width: 95vw;
    max-height: 95vh;
    margin: 2.5vh 2.5vw;
  }

  .preview-header {
    padding: 0.8rem 1rem;

    h3 {
      font-size: 1rem;
      max-width: 250px;
    }
  }

  .image-preview,
  .video-preview {
    padding: 1rem;
    min-height: 200px;

    img,
    video {
      max-height: 60vh;
    }
  }

  .file-preview {
    padding: 2rem 1rem;
    min-width: auto;

    .file-preview-info {
      padding: 1.5rem;
    }

    .file-icon-large {
      width: 60px;
      height: 60px;
    }

    .file-name-large {
      font-size: 1.1rem;
    }

    .download-btn,
    .open-btn {
      padding: 0.8rem 1.5rem;
      font-size: 1rem;
    }
  }
}

/* 小屏移动设备 */
@media (max-width: 480px) {
  .box {
    padding: 0;
    width: 100%;
    height: 100%;
  }

  .main {
    border-radius: 0;
    box-shadow: none;
  }

  .container {
    font-size: 14px;
  }

  .top {
    padding: 0.8rem;

    .top_child {
      span {
        font-size: 1rem;
      }
    }
  }

  .middle {
    .message {
      .avatar {
        width: 32px;
        height: 32px;
      }

      .content {
        font-size: 14px;
        padding: 0.6rem 0.8rem;
        max-width: 90%;
      }
    }

    .file-content {
      width: 180px;
      padding: 8px;
    }

    .chat-image-preview {
      max-width: 100px;
      max-height: 100px;
    }

    .video-preview-container {
      max-width: 160px;
      max-height: 120px;
    }
  }

  .bottom {
    margin-bottom: 60px; /* 为小屏底部导航栏留出空间 */
    min-height: 150px;
    max-height: 220px;

    .input-area {
      padding: 8px 0;

      textarea {
        width: calc(100% - 20px);
        margin: 0 10px;
        padding: 10px;
        font-size: 16px;
        min-height: 50px;
        max-height: 90px;
      }

      .toolbar {
        margin: 8px 10px 0;
        gap: 6px;
        padding: 6px;

        button {
          height: 34px;
          width: 34px;
          font-size: 0.95rem;

          &:last-of-type {
            min-width: 60px;
            padding: 0 14px;
            font-size: 0.85rem;
          }

          &.voice-recording {
            width: auto;
            min-width: 90px;
            padding: 6px 12px;
            font-size: 0.8rem;
          }

          &.voice-cancel {
            width: 34px;
            min-width: 34px;
          }

          &.voice-button {
            font-size: 1.1rem;
          }
        }
      }
    }

    .send-buttons {
      padding: 6px 8px;

      button {
        padding: 6px 12px;
        font-size: 0.8rem;
      }
    }
  }

  .preview-dialog-content {
    max-width: 98vw;
    max-height: 98vh;
    margin: 1vh 1vw;
  }

  .file-preview {
    padding: 1.5rem 0.8rem;

    .file-icon-large {
      width: 50px;
      height: 50px;
    }

    .file-name-large {
      font-size: 1rem;
    }

    .download-btn,
    .open-btn {
      padding: 0.7rem 1.2rem;
      font-size: 0.9rem;
    }
  }
}

/* 横屏适配 */
@media (orientation: landscape) and (max-height: 500px) {
  .container {
    height: 100vh;
  }

  .top {
    padding: 0.6rem 1rem;
  }

  .bottom {
    margin-bottom: 60px; /* 横屏时底部导航栏高度为60px */
    min-height: 110px;
    max-height: 160px;

    .input-area {
      padding: 6px 0;

      textarea {
        min-height: 40px;
        max-height: 70px;
      }

      .toolbar {
        margin: 6px 10px 0;
        padding: 5px;

        button {
          height: 32px;
          width: 32px;
          font-size: 0.9rem;

          &:last-of-type {
            min-width: 60px;
            padding: 0 12px;
            font-size: 0.8rem;
          }

          &.voice-recording {
            min-width: 80px;
            padding: 5px 10px;
            font-size: 0.75rem;
          }

          &.voice-cancel {
            width: 32px;
          }
        }
      }
    }
  }

  .preview-dialog-content {
    max-height: 95vh;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .bottom {
    .input-area {
      .toolbar {
        button {
          &:active {
            transform: scale(0.9);
            background-color: #e9ecef;
          }
        }
      }
    }

    .send-buttons {
      button {
        &:active {
          transform: scale(0.95);
        }
      }
    }
  }

  .message {
    .content {
      &:active {
        background-color: rgba(0, 0, 0, 0.05);
      }
    }
  }

  .image-container,
  .video-container,
  .file-container {
    &:active {
      transform: scale(0.98);
    }
  }
}

/* 高分辨率屏幕优化 */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .message .avatar img,
  .chat-image-preview,
  .file-icon-large {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
  }
}
</style>
