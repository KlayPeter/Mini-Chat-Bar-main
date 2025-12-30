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
          <i>🔍</i>
          <span>搜索</span>
        </button>
      </div>

      <!-- 聊天区域 -->
      <div class="section3-wrapper" :class="{ active: showChatArea }">
      <div v-if="!currentGroup" class="section3">
        <div class="welcome-state">
          <i class="icon">💬</i>
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
        <div class="message-list" ref="messageListRef">
          <div v-if="isLoadingMessages" class="loading-state">
            <i class="spin">⟳</i>
            <p>加载中...</p>
          </div>

          <div v-else-if="messages.length === 0" class="empty-messages">
            <i>💬</i>
            <p>暂无消息，发送第一条消息吧~</p>
          </div>

          <div
            v-else
            v-for="message in messages"
            :key="message._id"
            :data-message-id="message._id"
            class="message"
            :class="{ 'my-message': String(message.from) === String(currentUserId) }"
          >
            <!-- 系统消息 -->
            <div v-if="message.messageType === 'system'" class="system-message">
              {{ message.content }}
            </div>

            <!-- 普通消息 -->
            <template v-else>
              <!-- 消息时间 - 独立居中显示在最上方 -->
              <div class="message-time-header">
                {{ formatTime(message.time) }}
              </div>

              <!-- 消息内容行 -->
              <div
                class="message-content-row"
                :class="{
                  'my-message-row': String(message.from) === String(currentUserId),
                }"
              >
                <!-- 对方消息：头像在左边 -->
                <div
                  class="avatar"
                  v-if="String(message.from) !== String(currentUserId)"
                >
                  <img :src="message.fromAvatar || '/images/avatar/default-avatar.webp'" alt="头像" />
                </div>

                <div
                  class="text"
                  :class="{ me: String(message.from) === String(currentUserId) }"
                >
                  <!-- 群聊显示发送者名称 -->
                  <div v-if="String(message.from) !== String(currentUserId)" class="sender-name">
                    {{ message.fromName }}
                  </div>

                  <!-- 图片消息 -->
                  <template v-if="message.messageType === 'image' && message.fileInfo">
                    <div class="file-message">
                      <div
                        class="image-preview-container"
                        @click="previewImage(message.fileInfo)"
                      >
                        <img
                          :src="baseUrl + message.fileInfo.fileUrl"
                          :alt="message.fileInfo.fileName"
                          class="chat-image-preview"
                          @error="handleImageError"
                        />
                        <div class="preview-overlay">
                          <span class="preview-icon">
                            <img
                              src="/images/icon/search.png"
                              alt="预览"
                              style="width: 32px; height: 32px"
                            />
                          </span>
                        </div>
                      </div>
                      <div class="file-info">{{ message.fileInfo.fileName }}</div>
                    </div>
                  </template>

                  <!-- 文件消息 -->
                  <template v-else-if="message.messageType === 'file' && message.fileInfo">
                    <div class="file-message">
                      <div class="file-content">
                        <!-- 视频文件预览 -->
                        <div
                          v-if="isVideoFile(message.fileInfo.fileType)"
                          class="video-preview-container"
                          @click="previewVideo(message.fileInfo)"
                        >
                          <video
                            class="chat-video-preview"
                            :src="baseUrl + message.fileInfo.fileUrl"
                            preload="metadata"
                          ></video>
                          <div class="preview-overlay"></div>
                          <div class="file-info">
                            <span class="file-name">🎬 {{ message.fileInfo.fileName }}</span>
                            <span class="file-size">{{ formatFileSize(message.fileInfo.fileSize) }}</span>
                          </div>
                        </div>
                        <!-- 其他文件类型 -->
                        <div
                          v-else
                          class="file-link-container"
                          @click="previewFile(message.fileInfo)"
                        >
                          <div class="file-icon-container">
                            <img
                              :src="getFileIcon(message.fileInfo.fileType)"
                              alt="文件图标"
                              class="file-icon-img"
                            />
                            <div class="preview-overlay">
                              <span class="preview-icon">
                                <img
                                  src="/images/icon/eye.png"
                                  alt="查看"
                                  style="width: 16px; height: 16px"
                                />
                              </span>
                            </div>
                          </div>
                          <div class="file-details">
                            <div class="file-name">{{ message.fileInfo.fileName }}</div>
                            <div class="file-size">{{ formatFileSize(message.fileInfo.fileSize) }}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>

                  <!-- 语音消息 -->
                  <template v-else-if="message.messageType === 'voice' && message.fileInfo">
                    <div class="voice-message">
                      <div class="voice-content">
                        <button class="voice-play-btn" @click="playVoice(message.fileInfo)">
                          🎤
                        </button>
                        <div class="voice-duration">
                          {{ formatRecordingTime(message.fileInfo.duration || 0) }}
                        </div>
                      </div>
                    </div>
                  </template>

                  <!-- 文本消息 -->
                  <div v-else class="content">
                    {{ message.content }}
                  </div>
                </div>

                <!-- 自己消息：头像在右边 -->
                <div
                  class="avatar"
                  v-if="String(message.from) === String(currentUserId)"
                >
                  <img :src="myAvatar || '/images/avatar/default-avatar.webp'" alt="头像" />
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="bottom">
          <div class="input-area">
            <!-- 文件选择状态显示（在输入框内部） -->
            <div v-if="selectedFiles.length > 0" class="file-preview-inline">
              <div
                v-for="(file, index) in selectedFiles"
                :key="index"
                class="file-item"
              >
                <div class="file-icon-container">
                  <!-- 图片文件显示缩略图 -->
                  <img
                    v-if="file.type.startsWith('image/')"
                    :src="selectedFilePreviewUrls[index]"
                    alt="图片预览"
                    class="file-icon-img image-thumbnail"
                  />
                  <!-- 非图片文件显示文件图标 -->
                  <img
                    v-else
                    :src="getFileIcon(file.type)"
                    alt="文件图标"
                    class="file-icon-img"
                  />
                </div>
                <div class="file-details">
                  <div class="file-name">{{ file.name }}</div>
                  <div class="file-size">{{ formatFileSize(file.size) }}</div>
                </div>
                <button class="cancel-file" @click="removeFile(index)">❌</button>
              </div>
              <div v-if="selectedFiles.length > 1" class="file-count">
                共选择了 {{ selectedFiles.length }} 个文件
              </div>
            </div>

            <!-- 文本输入框 -->
            <textarea
              v-model="messageInput"
              @keyup.enter="handleSendMessage"
              :placeholder="selectedFiles.length > 0 ? '添加文字消息（可选）' : '输入消息...'"
              :class="{ 'with-file': selectedFiles.length > 0 }"
            ></textarea>

            <!-- 工具栏 -->
            <div class="toolbar">
              <button @click="showEmojiPicker = !showEmojiPicker" title="表情">😀</button>
              <input
                type="file"
                ref="fileInputRef"
                style="display: none"
                @change="handleFileChange"
                multiple
              />
              <button class="file-button" @click="triggerFileInput" title="文件">
                <img
                  src="/images/icon/folder.png"
                  alt="文件夹"
                  style="width: 16px; height: 16px"
                />
              </button>
              <!-- 录音按钮 -->
              <button
                v-if="!isRecording"
                class="voice-button"
                @click="handleStartRecording"
                title="录音"
              >
                🎤
              </button>
              <button
                v-else
                class="voice-recording"
                @click="handleStopRecording"
                title="点击发送"
              >
                ⏹ {{ formatRecordingTime(recordingTime) }}
              </button>
              <button
                v-if="isRecording"
                class="voice-cancel"
                @click="handleCancelRecording"
                title="取消录音"
              >
                ❌
              </button>
              <button
                class="search-button"
                @click="showSearchModal = true"
                title="搜索历史记录"
              >
                <img
                  src="/images/icon/search.png"
                  alt="搜索"
                  style="width: 16px; height: 16px"
                />
              </button>
              <button
                @click="handleSendMessage"
                :class="{
                  active: messageInput.trim().length > 0 || selectedFiles.length > 0,
                }"
                title="发送"
              >
                send
              </button>
            </div>
          </div>
        </div>
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
    </div>

    <!-- 移动端底部导航栏 -->
    <BottomNavbar class="mobile-only" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import axios from 'axios'
import { io } from 'socket.io-client'
import Sidebar from '../components/Sidebar.vue'
import GroupList from '../components/GroupList.vue'
import GroupDetail from '../components/GroupDetail.vue'
import GroupAvatar from '../components/GroupAvatar.vue'
import BottomNavbar from '../components/BottomNavbar.vue'
import GroupSearchModal from '../components/GroupSearchModal.vue'
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
const messageInput = ref('')
const currentUserId = ref('')
const myAvatar = ref('')
const showGroupDetail = ref(false)
const showEmojiPicker = ref(false)
const showSearchModal = ref(false)
const messageListRef = ref(null)
const groupListRef = ref(null)
const isLoadingMessages = ref(false)
const fileInputRef = ref(null)
const selectedFiles = ref([])
const selectedFilePreviewUrls = ref([])
const showChatArea = ref(false) // 移动端控制聊天区域显示

let socket = null

onMounted(async () => {
  await loadCurrentUser()
  await loadMyAvatar()
  initSocket()
})

onUnmounted(() => {
  if (socket) {
    if (currentGroup.value) {
      socket.emit('leave-group', {
        roomId: currentGroup.value.RoomID,
        userId: currentUserId.value
      })
    }
    socket.disconnect()
  }
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

function initSocket() {
  socket = io(baseUrl)

  socket.on('connect', () => {
    // Socket连接成功
  })

  socket.on('group-message', (data) => {
    if (currentGroup.value && data.roomId === currentGroup.value.RoomID) {
      messages.value.push(data.message)
      scrollToBottom()
    }
  })

  socket.on('member-joined', (data) => {
    // 成员加入
  })

  socket.on('member-left', (data) => {
    // 成员离开
  })
}

async function handleSelectGroup(group) {
  console.log('选择群聊:', group) // 调试日志
  
  if (currentGroup.value && socket) {
    socket.emit('leave-group', {
      roomId: currentGroup.value.RoomID,
      userId: currentUserId.value
    })
  }

  currentGroup.value = group
  showChatArea.value = true // 移动端显示聊天区域
  
  console.log('当前群聊已设置:', currentGroup.value) // 调试日志

  // 加载消息
  await loadMessages()

  // 确保滚动到底部
  await nextTick()
  setTimeout(() => {
    scrollToBottom()
  }, 150)

  if (socket) {
    socket.emit('join-group', {
      roomId: group.RoomID,
      userId: currentUserId.value
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

// 滚动到指定消息
function scrollToMessage(messageId) {
  if (!messageListRef.value) return
  
  // 使用 data-message-id 属性查找消息元素
  const targetElement = messageListRef.value.querySelector(`[data-message-id="${messageId}"]`)
  
  if (targetElement) {
    // 滚动到目标消息
    targetElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })
    
    // 高亮显示目标消息
    targetElement.classList.add('highlight-message')
    
    // 3秒后移除高亮
    setTimeout(() => {
      targetElement.classList.remove('highlight-message')
    }, 3000)
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
      // 等待DOM更新后滚动到底部
      await nextTick()
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
  } catch (err) {
    console.error('加载消息失败:', err)
  } finally {
    isLoadingMessages.value = false
  }
}

function triggerFileInput() {
  fileInputRef.value.click()
}

function handleFileChange(event) {
  const files = Array.from(event.target.files)
  if (files.length > 0) {
    selectedFilePreviewUrls.value.forEach((url) => {
      if (url) URL.revokeObjectURL(url)
    })

    selectedFiles.value = files
    selectedFilePreviewUrls.value = []

    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        selectedFilePreviewUrls.value.push(URL.createObjectURL(file))
      } else {
        selectedFilePreviewUrls.value.push('')
      }
    })
  }
}

function removeFile(index) {
  if (selectedFilePreviewUrls.value[index]) {
    URL.revokeObjectURL(selectedFilePreviewUrls.value[index])
  }

  selectedFiles.value.splice(index, 1)
  selectedFilePreviewUrls.value.splice(index, 1)

  if (selectedFiles.value.length === 0 && fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getFileIcon(fileType) {
  const lowerType = fileType.toLowerCase()

  // .md文件用md.png
  if (lowerType.includes('.md') || lowerType.includes('markdown')) {
    return '/images/icon/md.png'
  }

  // .docx和.doc文件用doc.png
  if (lowerType.includes('doc') || lowerType.includes('docx') || lowerType.includes('word') || lowerType.includes('document')) {
    return '/images/icon/doc.png'
  }

  // excel文件用excel.png
  if (
    lowerType.includes('xls') ||
    lowerType.includes('xlsx') ||
    lowerType.includes('excel') ||
    lowerType.includes('spreadsheet')
  ) {
    return '/images/icon/excel.png'
  }

  // ppt和pptx文件用ppt.png
  if (lowerType.includes('ppt') || lowerType.includes('pptx') || lowerType.includes('presentation')) {
    return '/images/icon/ppt.png'
  }

  // txt文件用txt.png
  if (lowerType.includes('txt') || lowerType.includes('text')) {
    return '/images/icon/txt.png'
  }

  // html文件用html.png
  if (lowerType.includes('html') || lowerType.includes('htm')) {
    return '/images/icon/html.png'
  }

  // PDF文件用doc.png（因为没有pdf.png）
  if (lowerType.includes('pdf')) {
    return '/images/icon/doc.png'
  }

  // 压缩文件用folder.png
  if (lowerType.includes('zip') || lowerType.includes('rar') || lowerType.includes('7z') || lowerType.includes('tar') || lowerType.includes('gz')) {
    return '/images/icon/folder.png'
  }

  // 视频文件用camera.png
  if (lowerType.includes('video') || lowerType.includes('.mp4') || lowerType.includes('.avi') || lowerType.includes('.mov') || lowerType.includes('.wmv') || lowerType.includes('.flv')) {
    return '/images/icon/camera.png'
  }

  // 音频文件用camera.png
  if (lowerType.includes('audio') || lowerType.includes('.mp3') || lowerType.includes('.wav') || lowerType.includes('.flac') || lowerType.includes('.aac')) {
    return '/images/icon/camera.png'
  }

  // 图片文件用camera.png
  if (lowerType.includes('image') || lowerType.includes('.jpg') || lowerType.includes('.jpeg') || lowerType.includes('.png') || lowerType.includes('.gif') || lowerType.includes('.webp') || lowerType.includes('.bmp') || lowerType.includes('.svg')) {
    return '/images/icon/camera.png'
  }

  // 其他文件用other.png
  return '/images/icon/other.png'
}

function isVideoFile(fileType) {
  if (!fileType) return false
  const lowerType = fileType.toLowerCase()
  return (
    lowerType.includes('video/') ||
    lowerType.includes('.mp4') ||
    lowerType.includes('.avi') ||
    lowerType.includes('.mov') ||
    lowerType.includes('.wmv') ||
    lowerType.includes('.flv') ||
    lowerType.includes('.mkv') ||
    lowerType.includes('.webm')
  )
}

function previewImage(fileInfo) {
  window.open(baseUrl + fileInfo.fileUrl, '_blank')
}

function previewVideo(fileInfo) {
  window.open(baseUrl + fileInfo.fileUrl, '_blank')
}

function previewFile(fileInfo) {
  window.open(baseUrl + fileInfo.fileUrl, '_blank')
}

async function uploadFiles(textMessage = '') {
  if (selectedFiles.value.length === 0) return

  const token = localStorage.getItem('token')

  try {
    for (const file of selectedFiles.value) {
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
          message: {
            content: messageContent,
            messageType: messageType,
            fileInfo: fileInfo,
            from: currentUserId.value,
            time: new Date()
          }
        })
      }
    }

    selectedFilePreviewUrls.value.forEach((url) => {
      if (url) URL.revokeObjectURL(url)
    })

    selectedFiles.value = []
    selectedFilePreviewUrls.value = []
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }

    await loadMessages()
  } catch (err) {
    console.error('文件上传失败:', err)
    toast.error('文件上传失败: ' + (err.response?.data?.message || err.message))
  }
}

async function handleSendMessage(e) {
  if (e && e.shiftKey) {
    return
  }
  
  if (e) {
    e.preventDefault()
  }

  const hasFiles = selectedFiles.value.length > 0
  const hasText = messageInput.value.trim().length > 0

  if (!hasFiles && !hasText) return

  if (hasFiles) {
    await uploadFiles(messageInput.value)
    messageInput.value = ''
    return
  }

  const content = messageInput.value.trim()
  if (!content) return

  try {
    const token = localStorage.getItem('token')
    const res = await axios.post(
      `${baseUrl}/room/${currentGroup.value.RoomID}/messages`,
      {
        content: content,
        messageType: 'text'
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )

    if (res.data.success) {
      if (socket) {
        socket.emit('group-message', {
          roomId: currentGroup.value.RoomID,
          message: res.data.message
        })
      }

      messageInput.value = ''
      await loadMessages()
    }
  } catch (err) {
    console.error('发送消息失败:', err)
    toast.error('发送消息失败')
  }
}



function handleGroupUpdate() {
  if (groupListRef.value) {
    groupListRef.value.loadGroups()
  }
}

function scrollToBottom() {
  if (messageListRef.value) {
    // 使用 requestAnimationFrame 确保在浏览器下一次重绘前执行
    requestAnimationFrame(() => {
      if (messageListRef.value) {
        messageListRef.value.scrollTop = messageListRef.value.scrollHeight
      }
    })
  }
}

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
  
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function handleImageError(e) {
  console.error('图片加载失败:', e.target.src)
  e.target.src = '/images/icon/image-error.png'
}

// 语音录制处理函数
async function handleStartRecording() {
  try {
    await startRecording()
  } catch (err) {
    console.error('开始录音失败:', err)
    toast.error('无法访问麦克风，请检查权限设置')
  }
}

async function handleStopRecording() {
  try {
    await stopRecording()
    
    if (audioBlob.value) {
      // 上传语音文件
      await uploadVoiceMessage(audioBlob.value)
    }
  } catch (err) {
    console.error('停止录音失败:', err)
    toast.error('录音失败')
  }
}

function handleCancelRecording() {
  cancelRecording()
  toast.info('已取消录音')
}

async function uploadVoiceMessage(blob) {
  try {
    const token = localStorage.getItem('token')
    const formData = new FormData()
    
    // 创建文件对象
    const audioFile = new File([blob], `voice_${Date.now()}.webm`, {
      type: 'audio/webm'
    })
    formData.append('file', audioFile)

    // 上传文件
    const uploadRes = await axios.post(`${baseUrl}/api/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
    })

    const fileInfo = {
      fileName: uploadRes.data.fileName,
      fileUrl: uploadRes.data.fileUrl,
      fileSize: uploadRes.data.fileSize,
      fileType: uploadRes.data.fileType,
      duration: recordingTime.value,
    }

    // 发送语音消息
    const res = await axios.post(
      `${baseUrl}/room/${currentGroup.value.RoomID}/messages`,
      {
        content: '发送了一条语音消息',
        messageType: 'voice',
        fileInfo: fileInfo,
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )

    if (res.data.success && socket) {
      socket.emit('group-message', {
        roomId: currentGroup.value.RoomID,
        message: res.data.message
      })
    }

    await loadMessages()
    toast.success('语音发送成功')
  } catch (err) {
    console.error('语音上传失败:', err)
    toast.error('语音发送失败')
  }
}

// 播放语音
function playVoice(fileInfo) {
  const audio = new Audio(baseUrl + fileInfo.fileUrl)
  audio.play().catch(err => {
    console.error('播放语音失败:', err)
    toast.error('播放失败')
  })
}
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
  flex-direction: column;
  height: 100%;
}

/* 搜索按钮 */
.search-fab {
  position: absolute;
  bottom: 80px; /* 移动端时避开底部导航栏 */
  right: 15px;
  height: 36px;
  padding: 0 16px;
  border-radius: 18px;
  background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
  color: white;
  border: none;
  box-shadow: 0 2px 8px rgba(255, 68, 68, 0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  z-index: 10;
  white-space: nowrap;

  i {
    font-size: 14px;
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

.message-list {
  flex: 10;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  background: transparent;
  border-radius: 1rem;
  -webkit-app-region: no-drag;

  .loading-state,
  .empty-messages {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #999;

    i {
      font-size: 48px;
      margin-bottom: 15px;
    }

    p {
      font-size: 14px;
    }
  }

  .empty-messages {
    padding: 60px 20px;
    font-size: 16px;

    i {
      font-size: 48px;
      margin-bottom: 16px;
      color: #ccc;
    }
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
}

/* 消息容器基础样式 */
.message {
  display: flex;
  flex-direction: column;
  padding-bottom: 10px;
  transition: background-color 0.3s ease;
  flex: 0 0 10%;
  padding-top: 1vh;
  padding-left: 1vw;
  list-style-type: none;

  /* 高亮消息样式 */
  &.highlight-message {
    background-color: rgba(255, 235, 59, 0.3);
    border-radius: 8px;
    padding: 12px;
    margin: 4px 0;
    animation: highlight-pulse 0.6s ease-in-out;
  }

  /* 消息时间头部 - 居中显示 */
  .message-time-header {
    text-align: center;
    font-size: 12px;
    color: #b2b2b2;
    margin: 8px 0 10px;
    padding: 2px 0;
  }

  /* 消息内容行 - 头像+消息横向排列 */
  .message-content-row {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 8px;
    padding: 0 10px;

    /* 对方的消息：头像在左 */
    .avatar {
      order: 1;
      margin-right: 0;
    }

    .text {
      order: 2;
    }

    /* 自己发送的消息：消息+头像 */
    &.my-message-row {
      justify-content: flex-end;

      .text {
        order: 1;
      }

      .avatar {
        order: 2;
        margin-left: 0;
        margin-right: 0;
      }
    }
  }

  .avatar {
    width: 40px;
    height: 40px;
    aspect-ratio: 1/1;
    border-radius: 50%;
    overflow: hidden;

    img {
      width: 100%;
      aspect-ratio: 1/1;
      object-fit: cover;
    }
  }

  .system-message {
    text-align: center;
    color: #999;
    font-size: 12px;
    padding: 5px 0;
  }
}

.text {
  height: 100%;
  position: relative;
  flex: 9;
  position: relative;
  display: flex;
  flex-direction: column;

  .sender-name {
    font-size: 12px;
    color: #666;
    margin-bottom: 4px;
    padding-left: 1vw;
  }

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

    .sender-name {
      display: none;
    }
  }

  .content {
    display: inline-block;
    background-color: #ffffff;
    color: #2c3e50;
    padding: 0.75rem 1.2rem;
    margin: 0 1vw 0.4rem;
    border-radius: 18px 18px 18px 4px;
    width: fit-content;
    max-width: 70%;
    word-wrap: break-word;
    word-break: break-word;
    font-size: 16px;
    line-height: 1.5;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(0, 0, 0, 0.04);
  }
}

.file-message {
  padding: 0;
  margin: 0;
  width: 100%;
  max-width: 300px;
}

.image-message {
  padding: 0;
  margin: 0;
  display: inline-block;
}

.file-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

    .preview-overlay {
      opacity: 1;
    }
  }

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

    .preview-icon {
      color: white;
      font-size: 32px;
    }
  }
}

.chat-image-preview {
  max-width: 300px;
  max-height: 300px;
  border-radius: 8px;
  cursor: pointer;
  display: block;
  object-fit: cover;
}

/* 视频预览容器样式 */
.video-preview-container {
  position: relative;
  max-width: 300px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  }

  .chat-video-preview {
    width: 100%;
    max-height: 200px;
    border-radius: 8px;
    display: block;
    object-fit: cover;
  }

  .file-info {
    padding: 8px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .file-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-size {
      margin-left: 8px;
      color: #ccc;
    }
  }
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
  background: white;

  &:hover {
    background-color: #f5f5f5;
    border-color: #007bff;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    .preview-overlay {
      opacity: 1;
    }
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

    .preview-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      opacity: 0;
      transition: opacity 0.3s ease;

      .preview-icon {
        color: white;
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
      font-size: 14px;
    }

    .file-size {
      font-size: 12px;
      color: #666;
    }
  }
}

.file-info {
  font-size: 12px;
  color: #666;
  padding: 4px 8px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 自己发送的文件消息右对齐 */
.text.me {
  .file-message {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .file-content {
    margin-right: 10px;
  }

  .image-preview-container {
    margin-right: 10px;
  }
}

.input-area {
  border-top: 1px solid #e0e0e0;
  background: white;
  flex-shrink: 0;

  .file-preview-inline {
    padding: 10px 15px;
    border-bottom: 1px solid #f0f0f0;
    max-height: 150px;
    overflow-y: auto;

    .file-item {
      display: flex;
      align-items: center;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
      margin-bottom: 8px;

      .file-icon-container {
        width: 40px;
        height: 40px;
        flex-shrink: 0;
        margin-right: 10px;

        .file-icon-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 4px;

          &.image-thumbnail {
            object-fit: cover;
          }
        }
      }

      .file-details {
        flex: 1;
        min-width: 0;

        .file-name {
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-size {
          font-size: 11px;
          color: #999;
        }
      }

      .cancel-file {
        background: none;
        border: none;
        font-size: 18px;
        color: #999;
        cursor: pointer;
        padding: 0 5px;

        &:hover {
          color: #f56c6c;
        }
      }
    }
  }

  .input-toolbar {
    padding: 10px 15px;
    display: flex;
    gap: 10px;

    button {
      background: none;
      border: none;
      font-size: 20px;
      color: #666;
      cursor: pointer;

      &:hover {
        color: #333;
      }
    }
  }

  .input-box {
    padding: 0 15px;

    textarea {
      width: 100%;
      border: none;
      resize: none;
      font-size: 14px;
      font-family: inherit;
      outline: none;
    }
  }

  .input-actions {
    padding: 10px 15px;
    display: flex;
    justify-content: flex-end;

    .send-btn {
      padding: 8px 30px;
      background: #07c160;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;

      &:hover:not(:disabled) {
        background: #06ad56;
      }

      &:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
    }
  }
}

/* 底部输入区域样式 - 统一Content.vue样式 */
.bottom {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border-radius: 20px;
  flex: 2;
  width: 94%;
  margin: 2% 3% 2.5% 3%;
  background-color: var(--bg-tertiary, #ffffff);
  max-height: 25vh;
  min-height: 180px;
  position: relative;
  -webkit-app-region: no-drag;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.06));

  .input-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;

    .file-preview-inline {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 8px 12px;
      margin: 8px 12px 0;
      background-color: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      font-size: 0.85rem;
      max-height: 120px;
      overflow-y: auto;

      .file-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px;
        background-color: #ffffff;
        border-radius: 6px;
        border: 1px solid #dee2e6;
      }

      .file-count {
        text-align: center;
        font-size: 0.75rem;
        color: #6c757d;
        padding: 4px;
        background-color: #e9ecef;
        border-radius: 4px;
        margin-top: 4px;
      }

      .file-icon-container {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background-color: #ffffff;
        border-radius: 6px;
        flex-shrink: 0;

        .file-icon-img {
          width: 40px;
          height: 40px;
          object-fit: contain;

          &.image-thumbnail {
            object-fit: cover;
          }
        }
      }

      .file-details {
        flex: 1;
        min-width: 0;

        .file-name {
          font-weight: 500;
          color: #495057;
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 0.8rem;
        }

        .file-size {
          font-size: 0.7rem;
          color: #6c757d;
        }
      }

      .cancel-file {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        font-size: 0.8rem;

        &:hover {
          background-color: #e9ecef;
        }
      }
    }

    textarea {
      flex: 1;
      width: 92%;
      margin: 0 12px;
      padding: 12px;
      border: none;
      outline: none;
      resize: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: normal;
      background-color: transparent;
      line-height: 1.5;
      font-family: inherit;
      min-height: 60px;

      &.with-file {
        margin-top: 8px;
      }

      &::placeholder {
        color: #999;
        font-size: 0.95rem;
      }

      &:focus {
        background-color: #fafafa;
      }
    }

    .toolbar {
      position: absolute;
      bottom: 8px;
      right: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px;
      background-color: var(--bg-tertiary, rgba(255, 255, 255, 0.9));
      border-radius: 20px;
      border: 1px solid var(--border-color, #e9ecef);
      backdrop-filter: blur(4px);
      -webkit-app-region: no-drag;
      z-index: 10;

      button {
        height: 32px;
        width: 32px;
        padding: 0;
        border-radius: 50%;
        border: none;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: transparent;
        flex-shrink: 0;

        &:hover {
          background-color: var(--hover-bg, #f8f9fa);
          transform: scale(1.1);
        }

        &:first-of-type {
          color: var(--text-secondary, #666);

          &:hover {
            background-color: #fff3cd;
          }
        }

        &.file-button {
          color: var(--text-secondary, #666);

          &:hover {
            background-color: #e3f2fd;
          }

          img {
            vertical-align: middle;
          }
        }

        &.voice-button {
          color: var(--text-secondary, #666);

          &:hover {
            background-color: #e8f5e9;
          }
        }

        &.voice-recording {
          background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
          color: white;
          width: auto;
          min-width: 70px;
          border-radius: 16px;
          padding: 0 12px;
          font-size: 0.75rem;
          animation: pulse 1.5s infinite;

          &:hover {
            transform: scale(1.05);
          }
        }

        &.voice-cancel {
          color: #f56c6c;

          &:hover {
            background-color: #fee;
          }
        }

        &.search-button {
          color: var(--text-secondary, #666);

          &:hover {
            background-color: #e8f5e9;
          }

          img {
            vertical-align: middle;
          }
        }

        &:last-of-type {
          display: none;
          background: var(--primary-gradient, linear-gradient(135deg, rgb(255, 127, 80) 0%, rgb(255, 140, 100) 100%));
          color: white;
          font-size: 0.85rem;
          font-weight: 600;
          width: auto;
          min-width: 65px;
          border-radius: 16px;
          padding: 0 14px;
          box-shadow: var(--shadow-primary, 0 2px 8px rgba(255, 127, 80, 0.3));

          &:hover {
            transform: scale(1.05);
            box-shadow: var(--shadow-md, 0 4px 12px rgba(255, 127, 80, 0.4));
          }
        }

        &.active {
          display: flex;
        }
      }
    }
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

/* 语音消息样式 */
.voice-message {
  padding: 0;
  margin: 0;
  display: inline-block;

  .voice-content {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 15px;
    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
    border-radius: 20px;
    min-width: 100px;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      transform: scale(1.05);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .voice-play-btn {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .voice-duration {
      font-size: 14px;
      color: #666;
      font-weight: 500;
    }
  }
}

.text.me {
  .voice-message {
    .voice-content {
      background: linear-gradient(135deg, rgb(255, 127, 80) 0%, rgb(255, 140, 100) 100%);
      
      .voice-duration {
        color: white;
      }
    }
  }
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
