<template>
  <div class="container">
    <!-- 侧边栏 -->
    <div class="section1">
      <Sidebar />
    </div>
    
    <!-- 群聊列表 -->
    <div class="section2">
      <GroupList @select-group="handleSelectGroup" ref="groupListRef" />
    </div>

    <!-- 聊天区域 -->
    <div class="section3-wrapper">
      <div v-if="!currentGroup" class="section3">
        <div class="welcome-state">
          <i class="fas fa-comments"></i>
          <p>选择一个群聊开始对话</p>
        </div>
      </div>

      <div v-else class="section3 group-chat-content">
        <!-- 群聊头部 -->
        <div class="chat-header">
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
            <button @click="showGroupDetail = true" class="detail-btn">
              <i class="fas fa-info-circle"></i>
            </button>
          </div>
        </div>

        <!-- 消息列表 -->
        <div class="message-list" ref="messageListRef">
          <div v-if="isLoadingMessages" class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>加载中...</p>
          </div>

          <div v-else-if="messages.length === 0" class="empty-messages">
            <i class="fas fa-comments"></i>
            <p>暂无消息，发送第一条消息吧~</p>
          </div>

          <div
            v-else
            v-for="message in messages"
            :key="message._id"
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
                      <div class="image-preview-container">
                        <img
                          :src="message.fileInfo.fileUrl"
                          :alt="message.fileInfo.fileName"
                          class="chat-image-preview"
                        />
                      </div>
                    </div>
                  </template>

                  <!-- 文件消息 -->
                  <template v-else-if="message.messageType === 'file' && message.fileInfo">
                    <div class="file-message">
                      <div class="file-content">
                        <div class="file-link-container">
                          <div class="file-icon-container">
                            <img
                              :src="getFileIcon(message.fileInfo.fileType)"
                              alt="文件图标"
                              class="file-icon-img"
                            />
                          </div>
                          <div class="file-details">
                            <div class="file-name">{{ message.fileInfo.fileName }}</div>
                            <div class="file-size">{{ formatFileSize(message.fileInfo.fileSize) }}</div>
                          </div>
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
          <!-- 文件选择状态显示 -->
          <div v-if="selectedFiles.length > 0" class="file-preview-inline">
            <div
              v-for="(file, index) in selectedFiles"
              :key="index"
              class="file-item"
            >
              <div class="file-icon-container">
                <img
                  v-if="file.type.startsWith('image/')"
                  :src="selectedFilePreviewUrls[index]"
                  alt="图片预览"
                  class="file-icon-img image-thumbnail"
                />
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

    <!-- 群详情侧边栏 -->
    <GroupDetail
      v-if="showGroupDetail && currentGroup"
      :group="currentGroup"
      @close="showGroupDetail = false"
      @update="handleGroupUpdate"
    />
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
import { useToast } from '../composables/useToast'

const baseUrl = import.meta.env.VITE_BASE_URL
const toast = useToast()

const currentGroup = ref(null)
const messages = ref([])
const messageInput = ref('')
const currentUserId = ref('')
const myAvatar = ref('')
const showGroupDetail = ref(false)
const showEmojiPicker = ref(false)
const messageListRef = ref(null)
const groupListRef = ref(null)
const isLoadingMessages = ref(false)
const fileInputRef = ref(null)
const selectedFiles = ref([])
const selectedFilePreviewUrls = ref([])

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
  if (currentGroup.value && socket) {
    socket.emit('leave-group', {
      roomId: currentGroup.value.RoomID,
      userId: currentUserId.value
    })
  }

  currentGroup.value = group
  await loadMessages()

  if (socket) {
    socket.emit('join-group', {
      roomId: group.RoomID,
      userId: currentUserId.value
    })
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
      nextTick(() => scrollToBottom())
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
  if (fileType.includes('pdf')) return '/images/icon/pdf.png'
  if (fileType.includes('word') || fileType.includes('document')) return '/images/icon/word.png'
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '/images/icon/excel.png'
  if (fileType.includes('zip') || fileType.includes('rar')) return '/images/icon/zip.png'
  if (fileType.includes('video')) return '/images/icon/video.png'
  if (fileType.includes('audio')) return '/images/icon/audio.png'
  return '/images/icon/file.png'
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
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
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
</script>

<style scoped lang="scss">
.container {
  border-radius: 1rem;
  flex: 1;
  display: flex;
  box-shadow: 0 0 5px 1px rgba(0, 0, 0, 0.5);
  -webkit-app-region: drag;
  max-height: 100vh;
  background: #f9f9f9;
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
}

.section3-wrapper {
  flex: 1 1 62%;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.section3 {
  flex: 1;
  height: 100%;
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
}

.chat-header {
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  flex-shrink: 0;

  .group-info {
    display: flex;
    align-items: center;

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

  .detail-btn {
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

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f5f5f5;

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
    align-items: flex-end;
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
  max-width: 150px;
  max-height: 150px;
  border-radius: 8px;
  cursor: pointer;
  display: block;
  margin-top: 5px;
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

.bottom {
  background: white;
  border-top: 1px solid #e0e0e0;
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
        font-size: 14px;
        color: #999;
        cursor: pointer;
        padding: 0 5px;

        &:hover {
          color: #f56c6c;
        }
      }
    }

    .file-count {
      font-size: 12px;
      color: #666;
      text-align: center;
      padding: 5px 0;
    }
  }

  textarea {
    width: 100%;
    padding: 15px;
    border: none;
    resize: none;
    font-size: 14px;
    font-family: inherit;
    outline: none;
    min-height: 80px;
    box-sizing: border-box;

    &.with-file {
      min-height: 60px;
    }
  }

  .toolbar {
    padding: 10px 15px;
    display: flex;
    gap: 15px;
    border-top: 1px solid #f0f0f0;

    button {
      background: none;
      border: none;
      font-size: 16px;
      color: #666;
      cursor: pointer;
      padding: 5px 10px;
      border-radius: 4px;
      transition: all 0.2s;

      &:hover {
        background: #f5f5f5;
        color: #333;
      }

      &.active {
        background: #07c160;
        color: white;

        &:hover {
          background: #06ad56;
        }
      }

      &.file-button img {
        vertical-align: middle;
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
  .container {
    border-radius: 0;
    margin: 0;
    height: 100vh;
  }

  .section1 {
    display: none;
  }

  .section2 {
    flex: 0 0 40%;
    border: none;
  }

  .section3-wrapper {
    flex: 1 1 60%;
  }
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
}
</style>
