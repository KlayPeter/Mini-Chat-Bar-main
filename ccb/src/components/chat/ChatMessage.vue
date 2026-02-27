<template>
  <div
    class="message"
    :class="{
      'my-message': isMyMessage,
      'selected': isSelected,
      'highlight-message': isHighlighted
    }"
    :data-message-id="message ? (message._id || message.id) : ''"
    @click="$emit('click', message, messageIndex)"
    @contextmenu.prevent="$emit('contextmenu', $event, message, messageIndex)"
  >
    <!-- 系统消息 -->
    <div v-if="message && message.messageType === 'system'" class="system-message">
      <span class="system-text">{{ message.content }}</span>
      <!-- 重新编辑按钮（仅撤回消息显示） -->
      <button 
        v-if="message.recalled && message.canReEdit" 
        @click="$emit('re-edit-message', message)"
        class="re-edit-btn"
      >
        重新编辑
      </button>
    </div>

    <!-- 普通消息 -->
    <template v-else-if="message">
      <!-- 消息时间头部 -->
      <div v-if="!hideTime" class="message-time-header">
        {{ formatTime(message.time) }}
      </div>

      <!-- 消息内容行 -->
      <div
        class="message-content-row"
        :class="{ 'my-message-row': isMyMessage }"
      >
        <!-- 多选模式下的选择框 -->
        <div v-if="showSelectionMode && messageType !== 'ai'" class="selection-checkbox">
          <input
            type="checkbox"
            :checked="isSelected"
            @click.stop="$emit('toggle-selection', messageIndex)"
          />
        </div>

        <!-- 对方消息：头像在左边 -->
        <div class="avatar" v-if="!isMyMessage && showAvatar">
          <img :src="getAvatar()" alt="头像" @error="e => e.target.src = '/images/avatar/default-avatar.webp'" />
        </div>

        <div class="text" :class="{ me: isMyMessage }">
          <!-- 发送者名称（群聊中显示） -->
          <div v-if="!isMyMessage && showSenderName" class="sender-name">
            {{ getSenderName() }}
          </div>

          <!-- 引用消息显示 -->
          <div v-if="message.quotedMessage && message.quotedMessage.content" class="quoted-message-display" @click="handleQuotedMessageClick">
            <div class="quoted-content-inline">
              <span class="quoted-author">{{ message.quotedMessage.fromName || message.quotedMessage.senderName || '未知用户' }}</span>
              <span class="quoted-separator">:</span>
              <span v-if="message.quotedMessage.messageType === 'text'" class="quoted-text-inline">
                {{ message.quotedMessage.content }}
              </span>
              <span v-else-if="message.quotedMessage.messageType === 'image'" class="quoted-media-inline">
                [图片]
              </span>
              <span v-else-if="message.quotedMessage.messageType === 'file'" class="quoted-media-inline">
                [文件] {{ message.quotedMessage.fileName || '文件' }}
              </span>
              <span v-else-if="message.quotedMessage.messageType === 'audio'" class="quoted-media-inline">
                [语音]
              </span>
              <span v-else-if="message.quotedMessage.messageType === 'video'" class="quoted-media-inline">
                [视频]
              </span>
              <span v-else class="quoted-text-inline">
                {{ message.quotedMessage.content || '[消息]' }}
              </span>
            </div>
          </div>

          <!-- 图片消息 -->
          <template v-if="message.messageType === 'image' && message.fileInfo">
            <div class="file-message">
              <div class="image-preview-container" @click="$emit('preview-image', message.fileInfo)">
                <img
                  :src="getImageUrl()"
                  :alt="message.fileInfo.fileName"
                  class="chat-image-preview"
                  @error="handleImageError"
                />
                <div class="preview-overlay">
                  <Search class="preview-icon" />
                </div>
              </div>
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
                  @click="$emit('preview-video', message.fileInfo)"
                >
                  <video
                    class="chat-video-preview"
                    :src="getFileUrl()"
                    preload="metadata"
                  ></video>
                  <div class="preview-overlay"></div>
                  <div class="file-info">
                    <span class="file-name">
                      <Camera class="file-type-icon" />
                      {{ message.fileInfo.fileName }}
                    </span>
                    <span class="file-size">{{ formatFileSize(message.fileInfo.fileSize) }}</span>
                  </div>
                </div>
                <!-- 其他文件类型 -->
                <div
                  v-else
                  class="file-link-container"
                  @click="$emit('preview-file', message.fileInfo)"
                >
                  <div class="file-icon-container">
                    <img
                      :src="getFileIcon(message.fileInfo.fileType)"
                      alt="文件图标"
                      class="file-icon-img"
                    />
                    <!-- <div class="preview-overlay">
                      <span class="preview-icon">👁️</span>
                    </div> -->
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
          <template v-else-if="(message.messageType === 'voice' || message.messageType === 'audio') && message.fileInfo">
            <div 
              class="content voice-message-bubble" 
              :class="{ 'voice-playing': isPlayingVoice(message._id || message.id) }"
              @click="handleVoiceClick(message)"
            >
              <div class="voice-content">
                <!-- 未读红点 -->
                <span v-if="!isMyMessage && !message.isPlayed" class="voice-unread-dot"></span>
                
                <div class="voice-icon-wrapper">
                  <Microphone class="voice-icon" />
                  <div class="voice-waves">
                    <span class="wave"></span>
                    <span class="wave"></span>
                    <span class="wave"></span>
                  </div>
                </div>
                <div class="voice-duration">
                  {{ getVoiceDurationText(message) }}"
                </div>
              </div>
            </div>
          </template>

          <!-- 聊天室邀请卡片 -->
          <template v-else-if="message.messageType === 'chatroom_invite'">
            <ChatRoomInviteCard :inviteData="parseInviteData(message.content)" />
          </template>

          <!-- 文本消息 -->
          <div v-else class="content">
            <MessageContent :content="message.content" />
          </div>
        </div>

        <!-- 自己消息：头像在右边 -->
        <div class="avatar" v-if="isMyMessage && showAvatar">
          <img :src="getMyAvatar()" alt="头像" @error="e => e.target.src = '/images/avatar/default-avatar.webp'" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Search, Camera, Microphone } from '@iconoir/vue'
import ChatRoomInviteCard from '../chatroom/ChatRoomInviteCard.vue'
import MessageContent from './MessageContent.vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import { getAvatarUrl } from '../../utils/avatarHelper'
import { ref, onUnmounted } from 'vue'

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true,
})
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value
      } catch (err) {
        console.error('Highlight error:', err)
      }
    }
    return hljs.highlightAuto(code).value
  },
  breaks: true,
  gfm: true
})

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  messageIndex: {
    type: Number,
    required: true
  },
  currentUserId: {
    type: String,
    default: ''
  },
  myAvatar: {
    type: String,
    default: '/images/avatar/default-avatar.webp'
  },
  otherUserAvatar: {
    type: String,
    default: '/images/avatar/default-avatar.webp'
  },
  baseUrl: {
    type: String,
    default: ''
  },
  messageType: {
    type: String,
    default: 'normal' // 'normal', 'group', 'ai'
  },
  showAvatar: {
    type: Boolean,
    default: true
  },
  showSenderName: {
    type: Boolean,
    default: false
  },
  showSelectionMode: {
    type: Boolean,
    default: false
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  isHighlighted: {
    type: Boolean,
    default: false
  },
  hideTime: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'click',
  'contextmenu',
  'toggle-selection',
  'preview-image',
  'preview-video',
  'preview-file',
  'play-voice',
  're-edit-message',
  'jump-to-quoted-message',
  'voice-played'
])

// 语音播放状态管理
const playingVoiceId = ref(null)
const voiceRemainingTimes = ref({}) // 存储每个语音的剩余时间
let countdownTimers = {} // 存储每个语音的定时器

// 计算是否为我的消息
const isMyMessage = computed(() => {
  if (!props.message) return false
  
  if (props.messageType === 'ai') {
    return props.message.from === 'user'
  }
  if (props.messageType === 'group') {
    return String(props.message.from || '') === String(props.currentUserId)
  }
  // 私聊模式：判断消息发送者是否是当前登录用户
  return String(props.message.from || '') === String(props.currentUserId)
})

// 计算是否包含@提及
const hasMentions = computed(() => {
  if (!props.message.content || typeof props.message.content !== 'string') return false
  return /@(全体成员|[^@\s]+)/.test(props.message.content)
})

// 检测是否包含 Markdown 语法
function hasMarkdown(content) {
  if (!content || typeof content !== 'string') return false
  
  // 检测常见的 Markdown 语法
  const markdownPatterns = [
    /\*\*.*?\*\*/,           // 加粗 **text**
    /\*.*?\*/,               // 斜体 *text*
    /`.*?`/,                 // 行内代码 `code`
    /```[\s\S]*?```/,        // 代码块 ```code```
    /^#{1,6}\s/m,            // 标题 # heading
    /^\>\s/m,                // 引用 > quote
    /^\-\s/m,                // 列表 - item
    /^\d+\.\s/m,             // 有序列表 1. item
    /\[.*?\]\(.*?\)/         // 链接 [text](url)
  ]
  
  return markdownPatterns.some(pattern => pattern.test(content))
}

// 渲染 Markdown
function renderMarkdown(content) {
  if (!content || typeof content !== 'string') return content
  
  try {
    // 使用 marked 解析 Markdown
    let html = marked.parse(content)
    
    // 手动高亮代码块
    html = html.replace(/<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g, (_match, lang, code) => {
      // 解码 HTML 实体
      const decodedCode = code
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
      
      // 使用 highlight.js 高亮
      let highlightedCode
      if (lang && hljs.getLanguage(lang)) {
        highlightedCode = hljs.highlight(decodedCode, { language: lang }).value
      } else {
        highlightedCode = hljs.highlightAuto(decodedCode).value
      }
      
      return `<pre><code class="language-${lang} hljs">${highlightedCode}</code></pre>`
    })
    
    return html
  } catch (err) {
    console.error('Markdown render error:', err)
    return content
  }
}

// 渲染@提及高亮
function renderMentions(content) {
  if (!content || typeof content !== 'string') return content
  
  // 高亮@提及内容
  return content.replace(
    /@(全体成员|[^@\s]+)/g, 
    '<span class="mention-highlight">@$1</span>'
  )
}

// 格式化时间
function formatTime(time) {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (messageDate.getTime() === today.getTime()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return '昨天 ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
}

// 获取头像
function getAvatar() {
  // 群聊模式：使用消息中的头像
  if (props.messageType === 'group') {
    return getAvatarUrl(props.message.fromAvatar)
  }
  // 私聊模式：使用传入的对方头像
  return getAvatarUrl(props.otherUserAvatar || props.message.fromAvatar || props.message.uavatar)
}

function getMyAvatar() {
  return getAvatarUrl(props.myAvatar)
}

// 获取发送者名称
function getSenderName() {
  return props.message.fromName || props.message.uname || '未知用户'
}

// 获取图片URL
function getImageUrl() {
  const url = props.message.fileInfo.fileUrl
  return url.startsWith('http') ? url : props.baseUrl + url
}

// 获取文件URL
function getFileUrl() {
  const url = props.message.fileInfo.fileUrl
  return url.startsWith('http') ? url : props.baseUrl + url
}

// 判断是否为视频文件
function isVideoFile(fileType) {
  return fileType && fileType.startsWith('video/')
}

// 获取文件图标
function getFileIcon(fileType) {
  if (!fileType) return '/images/icon/other.png'
  
  if (fileType.includes('pdf')) return '/images/icon/other.png' // PDF用通用图标
  if (fileType.includes('word') || fileType.includes('doc')) return '/images/icon/doc.png'
  if (fileType.includes('excel') || fileType.includes('sheet')) return '/images/icon/excel.png'
  if (fileType.includes('powerpoint') || fileType.includes('ppt')) return '/images/icon/ppt.png'
  if (fileType.includes('text') || fileType.includes('txt')) return '/images/icon/txt.png'
  if (fileType.includes('html')) return '/images/icon/html.png'
  if (fileType.includes('markdown') || fileType.includes('md')) return '/images/icon/md.png'
  if (fileType.includes('zip') || fileType.includes('rar')) return '/images/icon/folder.png' // 压缩文件用文件夹图标
  
  return '/images/icon/other.png'
}

// 格式化文件大小
function formatFileSize(size) {
  if (!size) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB']
  let index = 0
  let fileSize = size
  
  while (fileSize >= 1024 && index < units.length - 1) {
    fileSize /= 1024
    index++
  }
  
  return `${fileSize.toFixed(1)} ${units[index]}`
}

// 格式化录音时间
function formatRecordingTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 处理图片错误
function handleImageError(event) {
  event.target.src = '/images/icon/other.png' // 使用存在的通用图标
}

// 处理引用消息点击
function handleQuotedMessageClick(event) {
  event.stopPropagation() // 防止触发消息本身的点击事件
  if (props.message && props.message.quotedMessage) {
    emit('jump-to-quoted-message', props.message.quotedMessage)
  }
}

// 解析聊天室邀请数据
function parseInviteData(content) {
  try {
    if (typeof content === 'string') {
      return JSON.parse(content)
    }
    return content
  } catch (err) {
    console.error('解析邀请数据失败:', err)
    return {}
  }
}

// 语音播放相关函数
function isPlayingVoice(messageId) {
  return playingVoiceId.value === messageId
}

function getVoiceDurationText(message) {
  const messageId = message._id || message.id
  if (isPlayingVoice(messageId) && voiceRemainingTimes.value[messageId] > 0) {
    // 播放中显示倒计时
    return Math.ceil(voiceRemainingTimes.value[messageId])
  }
  // 未播放显示总时长
  return formatRecordingTime(message.fileInfo?.duration || 0)
}

function handleVoiceClick(message) {
  const messageId = message._id || message.id
  
  // 如果正在播放这条语音，停止播放
  if (isPlayingVoice(messageId)) {
    stopVoicePlayback(messageId)
    return
  }
  
  // 停止之前的播放
  if (playingVoiceId.value) {
    stopVoicePlayback(playingVoiceId.value)
  }
  
  // 开始播放新的语音
  playingVoiceId.value = messageId
  
  // 标记为已播放
  if (!isMyMessage.value && !message.isPlayed) {
    emit('voice-played', messageId)
  }
  
  // 触发播放事件
  emit('play-voice', message.fileInfo, (audio) => {
    if (audio) {
      const duration = message.fileInfo?.duration || audio.duration || 0
      voiceRemainingTimes.value[messageId] = duration
      
      // 开始倒计时
      startCountdown(messageId, audio)
      
      // 监听播放结束
      audio.addEventListener('ended', () => {
        stopVoicePlayback(messageId)
      })
      
      audio.addEventListener('error', () => {
        stopVoicePlayback(messageId)
      })
    }
  })
}

function startCountdown(messageId, audio) {
  // 清除旧的定时器
  if (countdownTimers[messageId]) {
    clearInterval(countdownTimers[messageId])
  }
  
  countdownTimers[messageId] = setInterval(() => {
    if (voiceRemainingTimes.value[messageId] > 0) {
      voiceRemainingTimes.value[messageId] -= 0.1
    } else {
      stopVoicePlayback(messageId)
    }
  }, 100)
}

function stopVoicePlayback(messageId) {
  // 清除定时器
  if (countdownTimers[messageId]) {
    clearInterval(countdownTimers[messageId])
    delete countdownTimers[messageId]
  }
  
  // 清除剩余时间
  delete voiceRemainingTimes.value[messageId]
  
  // 如果是当前播放的语音，清除播放状态
  if (playingVoiceId.value === messageId) {
    playingVoiceId.value = null
  }
}

// 组件卸载时清理
onUnmounted(() => {
  // 清理所有定时器
  Object.keys(countdownTimers).forEach(messageId => {
    if (countdownTimers[messageId]) {
      clearInterval(countdownTimers[messageId])
    }
  })
  countdownTimers = {}
})
</script>

<style scoped lang="scss">
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

  &.selected {
    background-color: rgba(255, 235, 59, 0.2);
  }

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

    .selection-checkbox {
      order: 0;
      display: flex;
      align-items: flex-start;
      padding-top: 10px;
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

      .selection-checkbox {
        order: 3;
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
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;

    .system-text {
      display: block;
    }

    .re-edit-btn {
      padding: 4px 12px;
      background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 11px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s ease;
      
      &:hover {
        background: linear-gradient(135deg, #0056b3 0%, #003d82 100%);
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(0, 123, 255, 0.3);
      }
      
      &:active {
        transform: translateY(0);
      }
    }
    padding: 5px 0;
  }
}

.text {
  height: 100%;
  position: relative;
  flex: 9;
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
      background: var(--message-bg-user, #07c160);
      color: var(--message-text-user, white);
      box-shadow: var(--shadow-primary, 0 2px 8px rgba(0, 0, 0, 0.1));
    }

    .sender-name {
      display: none;
    }
  }

  .content {
    display: inline-block;
    background-color: var(--message-bg-other, #ffffff);
    color: var(--message-text-other, #2c3e50);
    padding: 0.6rem 1rem;
    margin: 0 1vw 0.4rem;
    border-radius: 18px 18px 18px 4px;
    width: fit-content;
    max-width: 85%;
    word-wrap: break-word;
    word-break: break-word;
    font-size: 14px;
    line-height: 1.4;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(0, 0, 0, 0.04);

    :deep(.message-content-wrapper) {
      color: inherit;
    }
    
    // Markdown 内容样式
    .markdown-content {
      :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
        margin: 0.5em 0 0.3em;
        font-weight: 600;
        line-height: 1.3;
        
        &:first-child {
          margin-top: 0;
        }
      }
      
      :deep(h1) { font-size: 1.8em; }
      :deep(h2) { font-size: 1.5em; }
      :deep(h3) { font-size: 1.3em; }
      :deep(h4) { font-size: 1.1em; }
      
      :deep(p) {
        margin: 0.5em 0;
        
        &:first-child {
          margin-top: 0;
        }
        
        &:last-child {
          margin-bottom: 0;
        }
      }
      
      :deep(strong) {
        font-weight: 700;
        color: inherit; // 使用继承的文字颜色，不改变颜色
      }
      
      :deep(em) {
        font-style: italic;
        color: var(--text-secondary, #6c757d);
      }
      
      :deep(code) {
        background: #ffeb3b;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'Courier New', Consolas, monospace;
        font-size: 0.85em;
        color: #000000;
        font-weight: 700;
        border: 1px solid #f57c00;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
      }
      
      :deep(pre) {
        background: #1a1a1a;
        border: 2px solid #ff6f00;
        border-radius: 6px;
        padding: 10px;
        margin: 0.5em 0;
        overflow-x: auto;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        
        code {
          background: none;
          padding: 0;
          // 设置默认的浅色文本，highlight.js 会覆盖特定元素的颜色
          color: #d4d4d4;
          font-size: 0.9em;
          line-height: 1.4;
          font-weight: 400;
          border: none;
          box-shadow: none;
          font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
          
          // highlight.js 语法高亮颜色（VSCode 风格）
          .hljs-keyword,
          .hljs-selector-tag,
          .hljs-literal,
          .hljs-section,
          .hljs-link {
            color: #569cd6; // 关键字 - 蓝色
          }
          
          .hljs-string,
          .hljs-attr,
          .hljs-template-variable,
          .hljs-variable {
            color: #ce9178; // 字符串 - 橙色
          }
          
          .hljs-number {
            color: #b5cea8; // 数字 - 浅绿色
          }
          
          .hljs-built_in,
          .hljs-builtin-name,
          .hljs-function,
          .hljs-title {
            color: #dcdcaa; // 函数 - 黄色
          }
          
          .hljs-comment {
            color: #6a9955; // 注释 - 绿色
          }
          
          .hljs-meta {
            color: #9cdcfe; // 元数据 - 浅蓝色
          }
          
          .hljs-name,
          .hljs-property {
            color: #9cdcfe; // 属性 - 浅蓝色
          }
          
          .hljs-regexp {
            color: #d16969; // 正则 - 红色
          }
        }
      }
      
      :deep(blockquote) {
        border-left: 4px solid var(--primary-color, rgba(165, 42, 42, 0.5));
        padding-left: 12px;
        margin: 0.8em 0;
        color: var(--text-secondary, #6c757d);
        font-style: italic;
      }
      
      :deep(ul), :deep(ol) {
        margin: 0.5em 0;
        padding-left: 1.5em;
        
        li {
          margin: 0.3em 0;
        }
      }
      
      :deep(a) {
        color: #0366d6;
        text-decoration: none;
        
        &:hover {
          text-decoration: underline;
        }
      }
      
      :deep(hr) {
        border: none;
        border-top: 1px solid #e1e4e8;
        margin: 1em 0;
      }
    }
  }
}

.file-message {
  padding: 0;
  margin: 0;
//   width: 100%;
//   max-width: 300px;
}

.file-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 图片预览容器样式 */
.image-preview-container {
  position: relative;
  max-height: 160px;
  max-width: 280px;
  min-width: 120px;
  width: auto;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  display: inline-block;

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
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
    backdrop-filter: blur(2px);

    .preview-icon {
      color: white;
      width: 28px;
      height: 28px;
      stroke-width: 1.5;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    }
  }

  &:hover .preview-overlay {
    opacity: 1;
  }
}

.chat-image-preview {
  max-width: 100%;
  max-height: 160px;
  width: auto;
  height: auto;
  border-radius: 10px;
  display: block;
  object-fit: contain;
  transition: all 0.3s ease;
}

/* 视频预览容器样式 */
.video-preview-container {
  position: relative;
  max-width: 300px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background: #000;

  .chat-video-preview {
    width: 100%;
    height: auto;
    display: block;
  }

  .preview-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 50px;
    height: 50px;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 20px;
  }
}

/* 文件链接容器样式 */
.file-link-container {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #f5f5f5;
  }

  .file-icon-container {
    position: relative;
    width: 48px;
    height: 48px;

    .file-icon-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .preview-overlay {
      position: absolute;
      top: 0;
      right: -4px;
      width: 16px;
      height: 16px;
      background: #007bff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 10px;
    }
  }

  .file-details {
    flex: 1;

    .file-name {
      font-weight: 500;
      margin-bottom: 4px;
      word-break: break-all;
    }

    .file-size {
      font-size: 12px;
      color: #666;
    }
  }
}

// 引用消息显示样式（仿微信样式）
.quoted-message-display {
  background: #b3b3b3;
  border-radius: 4px;
  padding: 4px 8px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  display: inline-block;
  width: fit-content;
  min-width: 60px;
  
  &:hover {
    background: #a8a8a8;
  }
  
  // 引用标识符
  &::before {
    content: '┃';
    position: absolute;
    left: 4px;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(255, 255, 255, 0.8);
    font-weight: bold;
    font-size: 14px;
  }
  
  .quoted-content-inline {
    display: flex;
    align-items: center;
    font-size: 12px;
    line-height: 1.3;
    white-space: nowrap;
    padding-left: 12px; // 为引用标识符留出空间
    
    .quoted-author {
      color: white;
      font-weight: 500;
      flex-shrink: 0;
      margin-right: 2px;
    }
    
    .quoted-separator {
      color: rgba(255, 255, 255, 0.8);
      margin-right: 4px;
      flex-shrink: 0;
    }
    
    .quoted-text-inline {
      color: white;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
    }
    
    .quoted-media-inline {
      color: rgba(255, 255, 255, 0.9);
      font-style: italic;
      flex-shrink: 0;
    }
  }

  // 在我的消息中的引用样式调整
  .me & {
    background: rgba(140, 140, 140, 0.8);
    
    &:hover {
      background: rgba(130, 130, 130, 0.9);
    }
    
    &::before {
      color: rgba(255, 255, 255, 0.9);
    }
    
    .quoted-content-inline {
      .quoted-author {
        color: rgba(255, 255, 255, 0.95);
      }
      
      .quoted-separator {
        color: rgba(255, 255, 255, 0.8);
      }
      
      .quoted-text-inline {
        color: rgba(255, 255, 255, 0.95);
      }
      
      .quoted-media-inline {
        color: rgba(255, 255, 255, 0.9);
      }
    }
  }
}

/* 语音消息样式 - 仿微信风格 */
.voice-message-bubble {
  cursor: pointer;
  user-select: none;
  min-width: 100px !important;
  max-width: 200px !important;
  position: relative;
  transition: all 0.2s ease;
  
  &:hover {
    opacity: 0.9;
  }
  
  &:active {
    transform: scale(0.98);
  }
  
  // 播放中的样式
  &.voice-playing {
    .voice-waves .wave {
      animation-play-state: running;
      background: currentColor;
    }
  }
  
  .voice-content {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0;
    position: relative;
    
    // 未读红点
    .voice-unread-dot {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 8px;
      height: 8px;
      background: #ff4d4f;
      border-radius: 50%;
      border: 2px solid white;
      z-index: 10;
      animation: pulse-dot 2s ease-in-out infinite;
    }
    
    .voice-icon-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      
      .voice-icon {
        width: 20px;
        height: 20px;
        stroke-width: 2;
        color: inherit;
        z-index: 2;
      }
      
      .voice-waves {
        position: absolute;
        right: -20px;
        display: flex;
        align-items: center;
        gap: 2px;
        
        .wave {
          width: 2px;
          background: currentColor;
          border-radius: 1px;
          animation: voice-wave 1.2s ease-in-out infinite;
          animation-play-state: paused;
          
          &:nth-child(1) {
            height: 8px;
            animation-delay: 0s;
          }
          
          &:nth-child(2) {
            height: 12px;
            animation-delay: 0.2s;
          }
          
          &:nth-child(3) {
            height: 6px;
            animation-delay: 0.4s;
          }
        }
      }
    }

    .voice-duration {
      font-size: 13px;
      color: inherit;
      font-weight: 400;
      margin-left: 16px;
      min-width: 20px;
      text-align: right;
    }
  }
}

// 自己发送的语音消息样式
.me .voice-message-bubble {
  .voice-content {
    flex-direction: row-reverse;
    
    .voice-unread-dot {
      right: auto;
      left: -4px;
    }
    
    .voice-icon-wrapper {
      .voice-waves {
        right: auto;
        left: -20px;
        flex-direction: row-reverse;
      }
    }
    
    .voice-duration {
      margin-left: 0;
      margin-right: 16px;
      text-align: left;
    }
  }
}

@keyframes voice-wave {
  0%, 100% {
    transform: scaleY(1);
  }
  50% {
    transform: scaleY(1.5);
  }
}

@keyframes pulse-dot {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

@keyframes highlight-pulse {
  0% { background-color: rgba(255, 235, 59, 0.3); }
  50% { background-color: rgba(255, 235, 59, 0.5); }
  100% { background-color: rgba(255, 235, 59, 0.3); }
}
</style>
