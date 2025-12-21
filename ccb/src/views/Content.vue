<template>
  <div class="box" @click="hideMessageContextMenu">
    <div class="main">
      <div class="header">
        <div class="header-left">
          <h4>{{ uname }}</h4>
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
      <div class="middle" ref="messageList">
        <ul>
          <li
            class="message"
            v-for="(message, index) in messages"
            :key="index"
            :class="{
              selected: selectedMessages.includes(index),
              'my-message': message.from !== chatstore.currentChatUser,
            }"
            @contextmenu.prevent="
              showMessageContextMenu($event, message, index)
            "
            @click="toggleMessageSelection(index)"
          >
            <!-- 消息时间 - 独立居中显示在最上方 -->
            <div class="message-time-header">
              {{ formatMessageTime(message.time) }}
            </div>

            <!-- 消息内容行 -->
            <div
              class="message-content-row"
              :class="{
                'my-message-row': message.from !== chatstore.currentChatUser,
              }"
            >
              <!-- 多选模式下的选择框 -->
              <div v-if="isSelectionMode" class="message-checkbox">
                <input
                  type="checkbox"
                  :checked="selectedMessages.includes(index)"
                  @change="toggleMessageSelection(index)"
                  @click.stop
                />
              </div>

              <!-- 对方消息：头像在左边 -->
              <div
                class="avatar"
                v-if="message.from === chatstore.currentChatUser"
              >
                <img :src="avatar || '/images/avatar/out.webp'" alt="头像" />
              </div>

              <div
                class="text"
                :class="{ me: message.from !== chatstore.currentChatUser }"
              >
                <!-- 消息内容 -->
                <!-- 文件和图片消息直接显示，不在content容器内 -->
                <template
                  v-if="message.messageType === 'image' && message.fileInfo"
                >
                  <div class="file-message">
                    <div
                      v-if="message.isForwarded || message.forwardedFrom"
                      class="forwarded-info"
                    >
                      转自: {{ message.forwardedFrom }}
                    </div>
                    <div
                      class="image-preview-container"
                      @click="
                        previewImage(
                          baseUrl + message.fileInfo.fileUrl,
                          message.fileInfo.fileName,
                          message.fileInfo.fileSize,
                          message.fileInfo.fileType
                        )
                      "
                    >
                      <img
                        :src="baseUrl + message.fileInfo.fileUrl"
                        :alt="message.fileInfo.fileName"
                        class="chat-image-preview"
                      />
                      <div class="preview-overlay">
                        <span class="preview-icon"
                          ><img
                            src="/images/icon/search.png"
                            alt="预览"
                            style="width: 32px; height: 32px"
                        /></span>
                      </div>
                    </div>
                    <div class="file-info">{{ message.fileInfo.fileName }}</div>
                  </div>
                </template>
                <template
                  v-else-if="message.messageType === 'file' && message.fileInfo"
                >
                  <div class="file-message">
                    <div
                      v-if="message.isForwarded || message.forwardedFrom"
                      class="forwarded-info"
                    >
                      转自: {{ message.forwardedFrom }}
                    </div>
                    <div class="file-content">
                      <!-- 视频文件预览 -->
                      <div
                        v-if="isVideoFile(message.fileInfo.fileType)"
                        class="video-preview-container"
                        @click="
                          previewVideo(
                            baseUrl + message.fileInfo.fileUrl,
                            message.fileInfo.fileName,
                            message.fileInfo.fileSize,
                            message.fileInfo.fileType
                          )
                        "
                      >
                        <video
                          class="chat-video-preview"
                          :src="baseUrl + message.fileInfo.fileUrl"
                          preload="metadata"
                        ></video>
                        <div class="preview-overlay">
                          <!-- <span class="preview-icon">▶️</span> -->
                        </div>
                        <div class="file-info">
                          <span class="file-name"
                            >🎬 {{ message.fileInfo.fileName }}</span
                          >
                          <span class="file-size">{{
                            formatFileSize(message.fileInfo.fileSize)
                          }}</span>
                        </div>
                      </div>
                      <!-- 其他文件类型 -->
                      <div
                        v-else
                        class="file-link-container"
                        @click="
                          previewFile(
                            baseUrl + message.fileInfo.fileUrl,
                            message.fileInfo.fileName,
                            message.fileInfo.fileSize,
                            message.fileInfo.fileType
                          )
                        "
                      >
                        <div class="file-icon-container">
                          <img
                            :src="getFileIcon(message.fileInfo.fileType)"
                            alt="文件图标"
                            class="file-icon-img"
                          />
                          <div class="preview-overlay">
                            <span class="preview-icon"
                              ><img
                                src="/images/icon/eye.png"
                                alt="查看"
                                style="width: 16px; height: 16px"
                            /></span>
                          </div>
                        </div>
                        <div class="file-details">
                          <div class="file-name">
                            {{ message.fileInfo.fileName }}
                          </div>
                          <div class="file-size">
                            {{ formatFileSize(message.fileInfo.fileSize) }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
                <!-- 只有普通文本消息才显示在content容器内 -->
                <div v-else class="content">
                  {{ message.content }}
                </div>
              </div>

              <!-- 自己消息：头像在右边 -->
              <div
                class="avatar"
                v-if="message.from !== chatstore.currentChatUser"
              >
                <img :src="myAvatar || '/images/avatar/out.webp'" alt="头像" />
              </div>
            </div>
          </li>
        </ul>
      </div>
      <div class="bottom">
        <div v-if="showPicker" class="emoji-picker-container">
          <emoji-picker
            id="emoji-picker-instance"
            class="absolute bottom-full right-0 mb-2"
          ></emoji-picker>
        </div>

        <!-- 统一的输入区域 -->
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
                <div class="file-size">
                  {{ formatFileSize(file.size) }}
                </div>
              </div>
              <button class="cancel-file" @click="removeFile(index)">❌</button>
            </div>
            <div v-if="selectedFiles.length > 1" class="file-count">
              共选择了 {{ selectedFiles.length }} 个文件
            </div>
          </div>

          <!-- 文本输入框 -->
          <textarea
            name="content"
            id="content"
            v-model="new_message"
            @keyup.enter="send"
            :placeholder="
              selectedFiles.length > 0 ? '添加文字消息（可选）' : '输入消息...'
            "
            :class="{ 'with-file': selectedFiles.length > 0 }"
          ></textarea>

          <!-- 工具栏 -->
          <div class="toolbar">
            <button @click="showpicker" title="表情">😀</button>
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
              class="search-button"
              @click="openSearchModal"
              title="搜索历史记录"
            >
              <img
                src="/images/icon/search.png"
                alt="搜索"
                style="width: 16px; height: 16px"
              />
            </button>
            <button
              @click="send"
              :class="{
                active:
                  new_message.trim().length > 0 || selectedFiles.length > 0,
              }"
              title="发送"
            >
              send
            </button>
          </div>
        </div>
      </div>

      <!-- 多选操作栏 -->
      <div v-if="isSelectionMode" class="selection-toolbar">
        <div class="selection-info">
          已选择 {{ selectedMessages.length }} 条消息
        </div>
        <div class="selection-actions">
          <button
            @click="forwardSelectedMessages"
            :disabled="selectedMessages.length === 0"
            class="forward-btn"
          >
            <img
              src="/images/icon/forward.png"
              alt="转发"
              style="width: 16px; height: 16px"
            />
            转发
          </button>
          <button
            @click="deleteSelectedMessages"
            :disabled="selectedMessages.length === 0"
            class="delete-btn"
          >
            <img
              src="/images/icon/delete-2.png"
              alt="删除"
              style="width: 16px; height: 16px"
            />
            删除
          </button>
          <button @click="exitSelectionMode" class="cancel-btn">❌ 取消</button>
        </div>
      </div>
    </div>

    <!-- 消息右键菜单 -->
    <div
      v-if="messageContextMenu.show"
      class="message-context-menu"
      :style="{
        left: messageContextMenu.x + 'px',
        top: messageContextMenu.y + 'px',
      }"
      @click.stop
    >
      <div class="context-menu-item" @click="enterSelectionMode">
        <img
          src="/images/icon/more-choice.png"
          alt="多选"
          style="width: 16px; height: 16px"
        />
        多选
      </div>
      <div
        class="context-menu-item"
        @click="forwardSingleMessage(messageContextMenu.message)"
      >
        <img
          src="/images/icon/forward.png"
          alt="转发"
          style="width: 16px; height: 16px"
        />
        转发
      </div>
      <div
        v-if="
          messageContextMenu.message &&
          (messageContextMenu.message.messageType === 'image' ||
            messageContextMenu.message.messageType === 'file') &&
          messageContextMenu.message.fileInfo
        "
        class="context-menu-item"
        @click="downloadFile(messageContextMenu.message.fileInfo)"
      >
        <img
          src="/images/icon/download.png"
          alt="下载"
          style="width: 16px; height: 16px"
        />
        下载
      </div>
      <div
        class="context-menu-item"
        @click="deleteSingleMessage(messageContextMenu.index)"
      >
        <img
          src="/images/icon/delete-2.png"
          alt="删除"
          style="width: 16px; height: 16px"
        />
        删除
      </div>
    </div>

    <!-- 转发对话框 -->
    <div v-if="forwardDialog.show" class="forward-dialog">
      <div class="forward-dialog-content">
        <h3>转发消息</h3>
        <div class="forward-friends-list">
          <div
            v-for="friend in forwardFriends"
            :key="friend.id"
            class="forward-friend-item"
            :class="{
              selected: forwardDialog.selectedFriends.includes(friend.id),
            }"
            @click="toggleForwardFriend(friend.id)"
          >
            <img
              :src="friend.avatar"
              :alt="friend.name"
              class="friend-avatar"
            />
            <span class="friend-name">{{ friend.name }}</span>
            <div class="friend-checkbox">
              <input
                type="checkbox"
                :checked="forwardDialog.selectedFriends.includes(friend.id)"
                @change="toggleForwardFriend(friend.id)"
                @click.stop
              />
            </div>
          </div>
        </div>
        <div class="forward-dialog-actions">
          <button
            @click="confirmForward"
            :disabled="forwardDialog.selectedFriends.length === 0"
            class="confirm-btn"
          >
            确认转发
          </button>
          <button @click="cancelForward" class="cancel-btn">取消</button>
        </div>
      </div>
      <div class="forward-dialog-overlay" @click="cancelForward"></div>
    </div>

    <!-- 遮罩层，点击关闭菜单 -->
    <div
      v-if="false"
      class="context-menu-overlay"
      @click="hideMessageContextMenu"
    ></div>

    <!-- 文件预览弹窗 -->
    <div v-if="previewDialog.show" class="preview-dialog">
      <div class="preview-dialog-content">
        <div class="preview-header">
          <h3>{{ previewDialog.fileName }}</h3>
          <button class="close-btn" @click="closePreview">✖</button>
        </div>
        <div class="preview-body">
          <!-- 图片预览 -->
          <div v-if="previewDialog.type === 'image'" class="image-preview">
            <img :src="previewDialog.fileUrl" :alt="previewDialog.fileName" />
          </div>
          <!-- 视频预览 -->
          <div v-else-if="previewDialog.type === 'video'" class="video-preview">
            <video :src="previewDialog.fileUrl" controls autoplay></video>
          </div>
          <!-- 文本文件预览 -->
          <div v-else-if="previewDialog.type === 'text'" class="text-preview">
            <pre>{{ previewDialog.content }}</pre>
          </div>
          <!-- PDF预览 -->
          <div v-else-if="previewDialog.type === 'pdf'" class="pdf-preview">
            <iframe :src="previewDialog.fileUrl" frameborder="0"></iframe>
          </div>
          <!-- 其他文件类型 -->
          <div v-else class="file-preview">
            <div class="file-preview-info">
              <img
                :src="getFileIcon(previewDialog.fileType)"
                alt="文件图标"
                class="file-icon-large"
              />
              <div class="file-details-large">
                <div class="file-name-large">{{ previewDialog.fileName }}</div>
                <div class="file-size-large">
                  {{ formatFileSize(previewDialog.fileSize) }}
                </div>
                <div class="file-type">{{ previewDialog.fileType }}</div>
              </div>
            </div>
            <div class="file-actions">
              <button @click="downloadFileFromPreview" class="download-btn">
                <img
                  src="/images/icon/download.png"
                  alt="下载"
                  style="width: 16px; height: 16px"
                />
                下载文件
              </button>
              <button @click="openFileInNewTab" class="open-btn">
                🔗 在新标签页打开
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="preview-dialog-overlay" @click="closePreview"></div>
    </div>

    <!-- 搜索弹窗 -->
    <SearchModal
      v-if="searchModal.show"
      :is-visible="searchModal.show"
      :current-user="chatstore.currentChatUser"
      @close="closeSearchModal"
      @jump-to-message="jumpToMessage"
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
import EmojiPicker from 'vue3-emoji-picker'
import 'vue3-emoji-picker/css'
import SearchModal from '../components/SearchModal.vue'

const messages = ref([])
const messageList = ref(null)
const new_message = ref('')
const disturb = ref(true)
const chatstore = useChatStore()

const uname = ref('')
const avatar = ref('') // 对方头像
const myAvatar = ref('') // 自己的头像
const route = useRoute()
const showPicker = ref(false)

const fileInputRef = ref(null)
const selectedFiles = ref([])
const selectedFilePreviewUrls = ref([])
const baseUrl = import.meta.env.VITE_BASE_URL

// 多选和右键菜单相关状态
const isSelectionMode = ref(false)
const selectedMessages = ref([])
const messageContextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  message: null,
  index: -1,
})

// 清理Socket事件监听器
onBeforeUnmount(() => {
  socket.off('message-deleted')
  socket.off('messages-deleted')
  socket.off('avatar-updated')
  socket.off('private-message')
  socket.off('private-file-message')
})

// 转发相关状态
const forwardDialog = ref({
  show: false,
  selectedFriends: [],
  messagesToForward: [],
})
const forwardFriends = ref([])

// 预览相关状态
const previewDialog = ref({
  show: false,
  type: '', // 'image', 'video', 'text', 'pdf', 'file'
  fileName: '',
  fileUrl: '',
  fileSize: 0,
  fileType: '',
  content: '', // 用于文本文件内容
})

// 搜索弹窗相关状态
const searchModal = ref({
  show: false,
})

onMounted(() => {
  console.log('Content组件挂载，当前聊天用户:', chatstore.currentChatUser)
  uname.value = route.query.uname
  avatar.value = route.query.img

  // 发送Socket登录事件
  const currentUserId = localStorage.getItem('userId')
  if (currentUserId) {
    socket.emit('login', currentUserId)
  }

  //这里获取对方头像 - 只有在有当前聊天用户时才获取
  if (chatstore.currentChatUser) {
    getavatar()
  }
  //这里获取自己的头像
  getMyAvatar()

  //这里写获取消息列表 - 只有在有当前聊天用户时才获取
  if (chatstore.currentChatUser) {
    getlists()
  }

  const el = messageList.value
  if (el) {
    el.scrollTop = el.scrollHeight
  }

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
      nextTick(() => {
        const el = messageList.value
        if (el) {
          el.scrollTop = el.scrollHeight
        }
      })
    }
  })

  // 监听私聊文件消息
  socket.on(
    'private-file-message',
    async ({ from, fileUrl, fileName, fileType, messageType }) => {
      // 只有当消息来自当前聊天用户时才刷新消息列表
      if (from === chatstore.currentChatUser) {
        await getlists()
        nextTick(() => {
          const el = messageList.value
          if (el) {
            el.scrollTop = el.scrollHeight
          }
        })
      }
    }
  )
})

//拿对方头像
async function getavatar() {
  const res = await axios.get(
    `${baseUrl}/api/user/friend_avatar/${chatstore.currentChatUser}`
  )
  avatar.value = res.data.avatar || '/images/avatar/default-avatar.webp'
  console.log('获取到对方头像:', avatar.value)
}

//获取自己的头像
async function getMyAvatar() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${baseUrl}/api/user/info`, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    myAvatar.value = res.data.ava
  } catch (err) {
    console.error('获取自己头像失败：', err)
  }
}

// 时间格式化函数 - 类似微信的逻辑
function formatMessageTime(dateStr) {
  if (!dateStr) return ''

  const date = new Date(dateStr)
  const currentDate = new Date()

  // 检查是否是无效日期
  if (isNaN(date.getTime())) return ''

  // 今天：显示时间（如 14:30）
  if (date.toDateString() === currentDate.toDateString()) {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 昨天：显示"昨天 时间"
  const yesterday = new Date(currentDate)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return `昨天 ${date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  }

  // 本周内：显示星期几和时间
  const weekStart = new Date(currentDate)
  weekStart.setDate(currentDate.getDate() - currentDate.getDay())
  if (date >= weekStart) {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `${weekDays[date.getDay()]} ${date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  }

  // 今年内：显示月-日 时间
  if (date.getFullYear() === currentDate.getFullYear()) {
    return `${
      date.getMonth() + 1
    }月${date.getDate()}日 ${date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  }

  // 其他：显示年-月-日 时间
  return `${date.getFullYear()}年${
    date.getMonth() + 1
  }月${date.getDate()}日 ${date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

//拿对话消息
async function getlists() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(
      `${baseUrl}/api/chat/messages/${chatstore.currentChatUser}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    messages.value = res.data
  } catch (err) {
    console.error('消息获取失败:', err)
  }
}

function triggerFileInput() {
  fileInputRef.value.click()
}

function handleFileChange(event) {
  const files = Array.from(event.target.files)
  if (files.length > 0) {
    // 清理之前的预览URL
    selectedFilePreviewUrls.value.forEach((url) => {
      if (url) URL.revokeObjectURL(url)
    })

    selectedFiles.value = files
    selectedFilePreviewUrls.value = []

    // 为每个文件创建预览URL（如果是图片）
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
  // 清理对应的预览URL
  if (selectedFilePreviewUrls.value[index]) {
    URL.revokeObjectURL(selectedFilePreviewUrls.value[index])
  }

  selectedFiles.value.splice(index, 1)
  selectedFilePreviewUrls.value.splice(index, 1)

  // 如果没有文件了，清空文件输入
  if (selectedFiles.value.length === 0 && fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function cancelFileSelection() {
  // 清理所有预览URL，避免内存泄漏
  selectedFilePreviewUrls.value.forEach((url) => {
    if (url) URL.revokeObjectURL(url)
  })

  selectedFiles.value = []
  selectedFilePreviewUrls.value = []
  if (fileInputRef.value) {
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

async function uploadFiles(textMessage = '') {
  if (selectedFiles.value.length === 0) {
    console.warn('没有选中文件')
    return
  }

  const token = localStorage.getItem('token')

  try {
    // 逐个上传文件
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

      // 构建消息内容
      let messageContent = `发送了一个${
        messageType === 'image' ? '图片' : '文件'
      }: ${fileInfo.fileName}`
      if (textMessage.trim()) {
        messageContent = `${textMessage}\n\n${messageContent}`
      }

      // 发送文件消息到后端
      await axios.post(
        `${baseUrl}/api/chat/messages/${chatstore.currentChatUser}`,
        {
          content: messageContent,
          messageType: messageType,
          fileInfo: fileInfo,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      // 直接添加消息到本地列表，避免重新请求接口
      const newMessage = {
        from: localStorage.getItem('userId') || 'me',
        to: chatstore.currentChatUser,
        content: messageContent,
        messageType: messageType,
        fileInfo: fileInfo,
        time: new Date().toISOString(),
      }
      messages.value.push(newMessage)

      // 通过Socket.IO发送实时消息
      socket.emit('private-file-message', {
        to: chatstore.currentChatUser,
        fileUrl: fileInfo.fileUrl,
        fileName: fileInfo.fileName,
        fileType: fileInfo.fileType,
        messageType: messageType,
      })

      // 通知接收方有新消息(用于更新lastChat)
      socket.emit('private-message', {
        to: chatstore.currentChatUser,
        from: localStorage.getItem('userId'),
      })
    }

    // 清理所有预览URL和文件选择
    selectedFilePreviewUrls.value.forEach((url) => {
      if (url) URL.revokeObjectURL(url)
    })

    selectedFiles.value = []
    selectedFilePreviewUrls.value = []
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }

    nextTick(() => {
      const el = messageList.value
      if (el) {
        el.scrollTop = el.scrollHeight
      }
    })
  } catch (err) {
    console.error('文件上传失败:', err)
    console.error('错误详情:', err.response?.data || err.message)
    alert(`文件上传失败: ${err.response?.data?.message || err.message}`)
  }
}

async function send(e) {
  e.preventDefault()

  const hasFiles = selectedFiles.value.length > 0
  const hasText = new_message.value.trim().length > 0

  // 如果既没有文件也没有文字，不发送
  if (!hasFiles && !hasText) {
    console.warn('请输入消息内容或选择文件')
    return
  }

  // 如果有文件，上传文件（可能包含文字）
  if (hasFiles) {
    await uploadFiles(new_message.value)
    new_message.value = ''
    return
  }

  // 检查是否是文件选择提示文本
  const isFilePrompt = new_message.value.match(/^\[已选择(图片|文件): .+\]$/)
  if (isFilePrompt) {
    console.warn('请先选择文件或清空输入框后输入文本消息')
    return
  }

  // 发送文本消息
  if (new_message.value.trim()) {
    try {
      const token = localStorage.getItem('token')
      const messageContent = new_message.value
      const res = await axios.post(
        `${baseUrl}/api/chat/messages/${chatstore.currentChatUser}`,
        { content: messageContent },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      // 直接添加消息到本地列表，避免重新请求接口
      const newMessage = {
        from: localStorage.getItem('userId') || 'me',
        to: chatstore.currentChatUser,
        content: messageContent,
        messageType: 'text',
        time: new Date().toISOString(),
      }
      messages.value.push(newMessage)

      new_message.value = ''

      // 通知对方有新消息
      socket.emit('private-message', {
        to: chatstore.currentChatUser,
        from: localStorage.getItem('userId'),
      })

      nextTick(() => {
        const el = messageList.value
        if (el) {
          el.scrollTop = el.scrollHeight
        }
      })
    } catch (err) {
      console.error('发送失败：', err)
      console.error('错误详情:', err.response?.data || err.message)
      alert(`消息发送失败: ${err.response?.data?.message || err.message}`)
    }
  } else {
    console.warn('输入内容不能为空！')
  }
}

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
      nextTick(() => {
        const el = messageList.value
        if (el) el.scrollTop = el.scrollHeight
      })
    }
  }
)

watch(
  () => route.query.uname,
  (new_uname) => {
    uname.value = new_uname
  }
)

watch(messages, () => {
  nextTick(() => {
    const el = messageList.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
})

function muted() {
  disturb.value = !disturb.value
}

const emit = defineEmits(['closemessage'])
function offmessage() {
  emit('closemessage')
}

// 移除重复的Socket事件监听器注册
// 这些事件监听器已经在第一个onMounted钩子中注册了

// 删除当前聊天记录
async function deleteCurrentChat() {
  if (confirm(`确定要删除与${uname.value}的所有聊天记录吗？此操作不可恢复！`)) {
    try {
      const token = localStorage.getItem('token')
      await axios.delete(
        `${baseUrl}/api/chat/messages/${chatstore.currentChatUser}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      // 清空当前消息列表
      messages.value = []
      alert(`与${uname.value}的聊天记录已删除！`)
    } catch (err) {
      console.error('删除聊天记录失败:', err)
      alert('删除聊天记录失败，请重试！')
    }
  }
}

// 显示消息右键菜单
function showMessageContextMenu(event, message, index) {
  messageContextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    message: message,
    index: index,
  }
}

// 隐藏消息右键菜单
function hideMessageContextMenu() {
  messageContextMenu.value.show = false
}

// 下载文件
async function downloadFile(fileInfo) {
  if (!fileInfo || !fileInfo.fileUrl) {
    alert('文件信息不完整，无法下载')
    return
  }

  try {
    // 获取文件数据
    const response = await fetch(fileInfo.fileUrl)
    if (!response.ok) {
      throw new Error('文件下载失败')
    }

    // 获取文件blob
    const blob = await response.blob()

    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileInfo.fileName || 'download'

    // 添加到DOM并触发下载
    document.body.appendChild(link)
    link.click()

    // 清理
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('下载文件失败:', error)
    alert('下载文件失败，请重试！')
  }

  hideMessageContextMenu()
}

// 进入多选模式
function enterSelectionMode() {
  isSelectionMode.value = true
  selectedMessages.value = []
  hideMessageContextMenu()
}

// 退出多选模式
function exitSelectionMode() {
  isSelectionMode.value = false
  selectedMessages.value = []
}

// 切换消息选择状态
function toggleMessageSelection(index) {
  if (!isSelectionMode.value) return

  const selectedIndex = selectedMessages.value.indexOf(index)
  if (selectedIndex > -1) {
    selectedMessages.value.splice(selectedIndex, 1)
  } else {
    selectedMessages.value.push(index)
  }
}

// 删除单条消息
async function deleteSingleMessage(index) {
  if (confirm('确定要删除这条消息吗？')) {
    try {
      const token = localStorage.getItem('token')
      const message = messages.value[index]

      // 调用删除单条消息的API
      await axios.delete(`${baseUrl}/api/chat/message/${message._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      // 通过Socket通知其他用户消息已删除
      socket.emit('message-deleted', {
        messageId: message._id,
        chatWith: route.params.id,
      })

      // 从本地删除
      messages.value.splice(index, 1)
      alert('消息已删除')
    } catch (err) {
      console.error('删除消息失败:', err)
      alert('删除消息失败，请重试！')
    }
  }
  hideMessageContextMenu()
}

// 删除选中的消息
async function deleteSelectedMessages() {
  if (selectedMessages.value.length === 0) return

  if (confirm(`确定要删除选中的 ${selectedMessages.value.length} 条消息吗？`)) {
    try {
      const token = localStorage.getItem('token')
      // 按索引从大到小排序，避免删除时索引错乱
      const sortedIndexes = [...selectedMessages.value].sort((a, b) => b - a)
      const deletedMessageIds = []

      for (const index of sortedIndexes) {
        const message = messages.value[index]
        // 调用API删除消息
        await axios.delete(`${baseUrl}/api/chat/message/${message._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        deletedMessageIds.push(message._id)
        // 从本地删除
        messages.value.splice(index, 1)
      }

      // 通过Socket通知其他用户消息已删除
      socket.emit('messages-deleted', {
        messageIds: deletedMessageIds,
        chatWith: route.params.id,
      })

      alert(`已删除 ${selectedMessages.value.length} 条消息`)
      exitSelectionMode()
    } catch (err) {
      console.error('删除消息失败:', err)
      alert('删除消息失败，请重试！')
    }
  }
}

// 获取好友列表用于转发
async function loadForwardFriends() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${baseUrl}/api/user/friends`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    forwardFriends.value = res.data
  } catch (err) {
    console.error('获取好友列表失败:', err)
  }
}

// 转发单条消息
function forwardSingleMessage(message) {
  forwardDialog.value.messagesToForward = [message]
  forwardDialog.value.show = true
  forwardDialog.value.selectedFriends = []
  loadForwardFriends()
  hideMessageContextMenu()
}

// 转发选中的消息
function forwardSelectedMessages() {
  if (selectedMessages.value.length === 0) return

  const messagesToForward = selectedMessages.value.map(
    (index) => messages.value[index]
  )
  forwardDialog.value.messagesToForward = messagesToForward
  forwardDialog.value.show = true
  forwardDialog.value.selectedFriends = []
  loadForwardFriends()
}

// 切换转发好友选择
function toggleForwardFriend(friendId) {
  const index = forwardDialog.value.selectedFriends.indexOf(friendId)
  if (index > -1) {
    forwardDialog.value.selectedFriends.splice(index, 1)
  } else {
    forwardDialog.value.selectedFriends.push(friendId)
  }
}

// 确认转发
async function confirmForward() {
  if (forwardDialog.value.selectedFriends.length === 0) return

  try {
    const token = localStorage.getItem('token')

    // 获取当前用户信息用于显示转发来源
    const userRes = await axios.get(`${baseUrl}/user/info`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const currentUserName = userRes.data.name

    for (const friendId of forwardDialog.value.selectedFriends) {
      for (const message of forwardDialog.value.messagesToForward) {
        let forwardedContent = message.content

        // 为文本消息添加转发来源信息
        if (message.messageType === 'text' || !message.messageType) {
          forwardedContent = `[转自 ${currentUserName}] ${message.content}`
        }

        // 发送转发的消息
        await axios.post(
          `${baseUrl}/api/chat/messages/${friendId}`,
          {
            content: forwardedContent,
            messageType: message.messageType || 'text',
            fileInfo: message.fileInfo,
            isForwarded: true,
            forwardedFrom: currentUserName,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )

        // 通过Socket发送实时消息
        socket.emit('private-message', {
          to: friendId,
          content: forwardedContent,
          messageType: message.messageType || 'text',
          fileInfo: message.fileInfo,
          isForwarded: true,
          forwardedFrom: currentUserName,
        })
      }
    }

    alert('消息转发成功！')

    // 刷新当前聊天的消息列表
    await getlists()

    // 通知LastChats组件刷新好友列表

    socket.emit('refresh-friend-list')

    cancelForward()

    if (isSelectionMode.value) {
      exitSelectionMode()
    }
  } catch (err) {
    console.error('转发消息失败:', err)
    alert('转发消息失败，请重试！')
  }
}

// 取消转发
function cancelForward() {
  forwardDialog.value.show = false
  forwardDialog.value.selectedFriends = []
  forwardDialog.value.messagesToForward = []
}

// 预览图片
function previewImage(fileUrl, fileName, fileSize, fileType) {
  previewDialog.value = {
    show: true,
    type: 'image',
    fileName: fileName,
    fileUrl: fileUrl,
    fileSize: fileSize || 0,
    fileType: fileType || 'image',
    content: '',
  }
}

// 预览视频
function previewVideo(fileUrl, fileName, fileSize, fileType) {
  previewDialog.value = {
    show: true,
    type: 'video',
    fileName: fileName,
    fileUrl: fileUrl,
    fileSize: fileSize,
    fileType: fileType,
    content: '',
  }
}

// 预览文件
async function previewFile(fileUrl, fileName, fileSize, fileType) {
  const lowerFileType = fileType.toLowerCase()

  // Office文件直接下载，不预览
  if (
    lowerFileType.includes('doc') ||
    lowerFileType.includes('docx') ||
    lowerFileType.includes('ppt') ||
    lowerFileType.includes('pptx') ||
    lowerFileType.includes('xls') ||
    lowerFileType.includes('xlsx')
  ) {
    const fileInfo = {
      fileUrl: fileUrl,
      fileName: fileName,
      fileSize: fileSize,
      fileType: fileType,
    }
    downloadFile(fileInfo)
    return
  }

  // 代码文件直接下载
  if (
    lowerFileType.includes('html') ||
    lowerFileType.includes('htm') ||
    lowerFileType.includes('css') ||
    lowerFileType.includes('js') ||
    lowerFileType.includes('javascript') ||
    lowerFileType.includes('php') ||
    lowerFileType.includes('java') ||
    lowerFileType.includes('cpp') ||
    lowerFileType.includes('c++') ||
    lowerFileType.includes('py') ||
    lowerFileType.includes('python') ||
    lowerFileType.includes('sql')
  ) {
    const fileInfo = {
      fileUrl: fileUrl,
      fileName: fileName,
      fileSize: fileSize,
      fileType: fileType,
    }
    downloadFile(fileInfo)
    return
  }

  // 判断可预览的文件类型
  if (lowerFileType.includes('pdf')) {
    previewDialog.value = {
      show: true,
      type: 'pdf',
      fileName: fileName,
      fileUrl: fileUrl,
      fileSize: fileSize,
      fileType: fileType,
      content: '',
    }
  } else if (
    lowerFileType.includes('image/') ||
    lowerFileType.includes('.jpg') ||
    lowerFileType.includes('.jpeg') ||
    lowerFileType.includes('.png') ||
    lowerFileType.includes('.gif') ||
    lowerFileType.includes('.webp') ||
    lowerFileType.includes('.bmp') ||
    lowerFileType.includes('.svg')
  ) {
    // 图片文件
    previewDialog.value = {
      show: true,
      type: 'image',
      fileName: fileName,
      fileUrl: fileUrl,
      fileSize: fileSize,
      fileType: fileType,
      content: '',
    }
  } else if (isVideoFile(fileType)) {
    // 视频文件
    previewDialog.value = {
      show: true,
      type: 'video',
      fileName: fileName,
      fileUrl: fileUrl,
      fileSize: fileSize,
      fileType: fileType,
      content: '',
    }
  } else if (
    lowerFileType.includes('text') ||
    lowerFileType.includes('txt') ||
    lowerFileType.includes('.md') ||
    lowerFileType.includes('markdown') ||
    lowerFileType.includes('json') ||
    lowerFileType.includes('xml') ||
    lowerFileType.includes('csv') ||
    lowerFileType.includes('log')
  ) {
    // 文本文件，尝试获取内容预览
    try {
      const response = await fetch(fileUrl)
      const content = await response.text()
      previewDialog.value = {
        show: true,
        type: 'text',
        fileName: fileName,
        fileUrl: fileUrl,
        fileSize: fileSize,
        fileType: fileType,
        content: content,
      }
    } catch (err) {
      console.error('获取文本文件内容失败:', err)
      // 如果获取失败，直接下载
      const fileInfo = {
        fileUrl: fileUrl,
        fileName: fileName,
        fileSize: fileSize,
        fileType: fileType,
      }
      downloadFile(fileInfo)
    }
  } else {
    // 其他未分类文件类型，显示文件信息预览
    previewDialog.value = {
      show: true,
      type: 'file',
      fileName: fileName,
      fileUrl: fileUrl,
      fileSize: fileSize,
      fileType: fileType,
      content: '',
    }
  }
}

// 关闭预览
function closePreview() {
  previewDialog.value.show = false
}

// 从预览中下载文件
function downloadFileFromPreview() {
  const fileInfo = {
    fileUrl: previewDialog.value.fileUrl,
    fileName: previewDialog.value.fileName,
    fileSize: previewDialog.value.fileSize,
    fileType: previewDialog.value.fileType,
  }
  downloadFile(fileInfo)
}

// 在新标签页打开文件
function openFileInNewTab() {
  window.open(previewDialog.value.fileUrl, '_blank')
}

// 获取文件图标
function getFileIcon(fileType) {
  const lowerType = fileType.toLowerCase()

  // .md文件用md.png
  if (lowerType.includes('.md') || lowerType.includes('markdown')) {
    return '/images/icon/md.png'
  }

  // .docx和.doc文件用doc.png
  if (lowerType.includes('doc') || lowerType.includes('docx')) {
    return '/images/icon/doc.png'
  }

  // excel文件用excel.png
  if (
    lowerType.includes('xls') ||
    lowerType.includes('xlsx') ||
    lowerType.includes('excel')
  ) {
    return '/images/icon/excel.png'
  }

  // ppt和pptx文件用ppt.png
  if (lowerType.includes('ppt') || lowerType.includes('pptx')) {
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

  // 其他文件用other.png
  return '/images/icon/other.png'
}

// 判断是否为视频文件
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
    lowerType.includes('.webm') ||
    lowerType.includes('.mkv')
  )
}

onMounted(() => {
  // 点击其他地方关闭右键菜单
  document.addEventListener('click', hideMessageContextMenu)
})

onBeforeUnmount(() => {
  socket.off('private-message')
  socket.off('private-file-message')
  socket.off('message-deleted')
  socket.off('messages-deleted')
  socket.off('avatar-updated')
  document.removeEventListener('click', hideMessageContextMenu)

  // 清理表情选择器事件监听器
  if (pickerElement && boundAddEmoji) {
    pickerElement.removeEventListener('emoji-click', boundAddEmoji)
  }
})

let pickerElement = null
let boundAddEmoji = null

function showpicker() {
  showPicker.value = !showPicker.value
}

function addEmoji(event) {
  new_message.value += event.detail.emoji.unicode
  showPicker.value = false
}

// 搜索弹窗相关方法
function openSearchModal() {
  searchModal.value.show = true
}

function closeSearchModal() {
  searchModal.value.show = false
}

function jumpToMessage(messageId) {
  console.log('跳转到消息:', messageId)
  closeSearchModal()

  // 查找消息在当前消息列表中的索引
  const messageIndex = messages.value.findIndex((msg) => msg._id === messageId)

  if (messageIndex !== -1) {
    // 找到消息，滚动到对应位置
    nextTick(() => {
      const messageList = document.querySelector('.middle ul')
      const messageElements = messageList.querySelectorAll('.message')

      if (messageElements[messageIndex]) {
        // 滚动到目标消息
        messageElements[messageIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })

        // 高亮显示目标消息
        messageElements[messageIndex].classList.add('highlight-message')

        // 3秒后移除高亮效果
        setTimeout(() => {
          messageElements[messageIndex].classList.remove('highlight-message')
        }, 3000)
      }
    })
  } else {
    console.warn('未找到对应的消息:', messageId)
    // 如果当前消息列表中没有找到，可能需要加载更多历史消息
    // 这里可以添加加载历史消息的逻辑
  }
}

watch(showPicker, (newValue) => {
  if (newValue) {
    nextTick(() => {
      pickerElement = document.getElementById('emoji-picker-instance')
      if (pickerElement) {
        boundAddEmoji = addEmoji
        pickerElement.addEventListener('emoji-click', boundAddEmoji)
      } else {
        console.warn('Emoji picker element not found after nextTick.')
      }
    })
  } else {
    if (pickerElement && boundAddEmoji) {
      pickerElement.removeEventListener('emoji-click', boundAddEmoji)
      pickerElement = null
      boundAddEmoji = null
    }
  }
})
</script>

<style scoped lang="scss">
.box {
  width: 96%;
  height: 92%;
  padding: 4% 2%;
  padding-top: 2%;
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
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    padding: 0 24px;
    background-color: #ffffff;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    min-height: 70px;

    .header-left {
      display: flex;
      align-items: center;

      h4 {
        margin: 0;
        font-size: 19px;
        font-weight: 600;
        color: #2c3e50;
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
/* 消息容器基础样式 */
.message {
  display: flex;
  flex-direction: column;
  padding-bottom: 10px;
  transition: background-color 0.3s ease;

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

  /* 高亮消息样式 */
  &.highlight-message {
    background-color: rgba(255, 235, 59, 0.3);
    border-radius: 8px;
    padding: 8px;
    margin: 2px 0;
    animation: highlight-pulse 0.6s ease-in-out;
  }

  .avatar {
    /* border: 1px solid black; */
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
    max-width: 70%;
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

/* 底部样式 */
.bottom {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border-radius: 20px;
  flex: 2;
  width: 94%;
  margin: 2% 3% 2.5% 3%;
  background-color: #ffffff;
  max-height: 25vh;
  min-height: 180px;
  position: relative;
  -webkit-app-region: no-drag;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(0, 0, 0, 0.06);

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
      // width: calc(100% - 24px);
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
      background-color: rgba(255, 255, 255, 0.9);
      border-radius: 20px;
      border: 1px solid #e9ecef;
      backdrop-filter: blur(4px);
      -webkit-app-region: no-drag;

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

        &:hover {
          background-color: #f8f9fa;
          transform: scale(1.1);
        }

        &:first-of-type {
          color: #666;

          &:hover {
            background-color: #fff3cd;
          }
        }

        &.file-button {
          color: #666;

          &:hover {
            background-color: #e3f2fd;
          }
        }

        &:last-of-type {
          display: none;
          background: linear-gradient(
            135deg,
            rgb(255, 127, 80) 0%,
            rgb(255, 140, 100) 100%
          );
          color: white;
          font-size: 0.85rem;
          font-weight: 600;
          width: auto;
          min-width: 65px;
          border-radius: 16px;
          padding: 0 14px;
          box-shadow: 0 2px 8px rgba(255, 127, 80, 0.3);

          &:hover {
            background: linear-gradient(
              135deg,
              rgb(255, 140, 100) 0%,
              rgb(255, 160, 120) 100%
            );
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(255, 127, 80, 0.4);
          }
        }

        &.active {
          display: flex;
        }
      }
    }
  }
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
    border-radius: 0;
    border: none;
    border-top: 1px solid #e0e0e0;
    min-height: 120px;
    max-height: 200px;

    .input-area {
      .file-preview-inline {
        padding: 6px 10px;
        gap: 4px;
      }

      textarea {
        width: 90%;
        margin: 0 5%;
        padding: 10px;
        font-size: 16px; /* 防止iOS缩放 */
        min-height: 50px;

        &::placeholder {
          font-size: 15px;
        }
      }

      .toolbar {
        bottom: 6px;
        right: 8px;
        gap: 6px;

        button {
          height: 28px;
          width: 28px;
          font-size: 0.8rem;
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
    min-height: 100px;

    .input-area {
      textarea {
        width: 88%;
        margin: 0 6%;
        padding: 8px;
        font-size: 16px;
        min-height: 40px;
      }

      .toolbar {
        bottom: 4px;
        right: 6px;

        button {
          height: 24px;
          width: 24px;
          font-size: 0.7rem;
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
    min-height: 80px;
    max-height: 120px;

    .input-area {
      textarea {
        min-height: 35px;
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
