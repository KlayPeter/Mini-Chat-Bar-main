<template>
  <div class="chat-input">
    <!-- 文件选择状态显示 -->
    <div v-if="selectedFiles.length > 0" class="file-preview-inline">
      <div v-for="(file, index) in selectedFiles" :key="index" class="file-item">
        <div class="file-icon-container">
          <!-- 图片文件显示缩略图 -->
          <img
            v-if="file.type.startsWith('image/')"
            :src="filePreviewUrls[index]"
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
        <button class="remove-file-btn" @click="removeFile(index)">
          <Cancel class="icon" />
        </button>
      </div>
      <div v-if="selectedFiles.length > 1" class="file-count">
        共选择了 {{ selectedFiles.length }} 个文件
      </div>
    </div>

    <!-- 引用消息显示区域 -->
    <div v-if="currentQuotedMessage" class="quoted-message-preview">
      <div class="quoted-header">
        <span class="quoted-label">回复 {{ currentQuotedMessage.fromName || '匿名用户' }}</span>
        <button class="clear-quote-btn" @click="clearQuotedMessage" title="取消引用">
          <Xmark class="icon" />
        </button>
      </div>
      <div class="quoted-content">
        <div v-if="currentQuotedMessage.messageType === 'text'" class="quoted-text">
          {{ currentQuotedMessage.content }}
        </div>
        <div v-else-if="currentQuotedMessage.messageType === 'image'" class="quoted-media">
          [图片]
        </div>
        <div v-else-if="currentQuotedMessage.messageType === 'file'" class="quoted-media">
          [文件] {{ currentQuotedMessage.fileName || '文件' }}
        </div>
        <div v-else-if="currentQuotedMessage.messageType === 'audio'" class="quoted-media">
          [语音]
        </div>
        <div v-else-if="currentQuotedMessage.messageType === 'video'" class="quoted-media">
          [视频]
        </div>
        <div v-else class="quoted-text">
          {{ currentQuotedMessage.content || '[消息]' }}
        </div>
      </div>
    </div>

    <!-- 文本输入区域 -->
    <div class="input-container">
      <textarea
        ref="inputRef"
        v-model="inputText"
        :placeholder="getPlaceholder()"
        :disabled="disabled"
        @keydown="handleKeyDown"
        @keyup="handleKeyUp"
        @paste="handlePaste"
        @focus="handleFocus"
        @blur="handleBlur"
        :class="{ 'with-file': selectedFiles.length > 0 }"
        rows="1"
      ></textarea>

      <!-- 工具栏 -->
      <div class="toolbar">
        <!-- 表情按钮 -->
        <button 
          v-if="showEmojiButton"
          @click="toggleEmojiPicker" 
          class="tool-btn emoji-btn"
          title="表情"
          :class="{ active: showEmojiPicker }"
        >
          <Emoji class="icon" />
        </button>

        <!-- 文件选择按钮 -->
        <input
          ref="fileInputRef"
          type="file"
          style="display: none"
          @change="handleFileChange"
          :multiple="allowMultipleFiles"
          :accept="acceptFileTypes"
        />
        <button 
          v-if="showFileButton"
          class="tool-btn file-btn" 
          @click="triggerFileInput" 
          title="文件"
          :disabled="disabled"
        >
          <Folder class="icon" />
        </button>

        <!-- 录音按钮 -->
        <template v-if="showVoiceButton">
          <button
            v-if="!isRecording"
            class="tool-btn voice-btn"
            @click="startRecording"
            title="录音"
            :disabled="disabled"
          >
            <Microphone class="icon" />
          </button>
          <button
            v-else
            class="tool-btn voice-recording"
            @click="stopRecording"
            title="点击发送"
          >
            <Pause class="icon" />
            {{ formatRecordingTime(recordingTime) }}
          </button>
          <button
            v-if="isRecording"
            class="tool-btn voice-cancel"
            @click="cancelRecording"
            title="取消录音"
          >
            <Xmark class="icon" />
          </button>
        </template>

        <!-- 搜索按钮 -->
        <button 
          v-if="showSearchButton"
          class="tool-btn search-btn"
          @click="$emit('search')"
          title="搜索历史记录"
        >
          <Search class="icon" />
        </button>

        <!-- 发送按钮 -->
        <button
          @click="handleSend"
          :disabled="!canSend || disabled"
          :class="{ active: canSend && !disabled }"
          class="tool-btn send-btn"
          title="发送"
        >
          {{ sendButtonText }}
        </button>
      </div>
    </div>

    <!-- @成员选择弹窗 -->
    <div v-if="showMentionList" class="mention-list-container" :style="mentionListStyle">
      <div class="mention-list">
        <!-- @全体成员选项（仅管理员可见） -->
        <div 
          v-if="canMentionAll" 
          class="mention-item"
          :class="{ active: selectedMentionIndex === -1 }"
          @click="selectMention({ id: 'all', name: '全体成员', isAll: true })"
        >
          <div class="member-avatar">
            <span class="all-icon">@</span>
          </div>
          <div class="member-info">
            <span class="member-name">全体成员</span>
            <span class="member-desc">通知所有群成员</span>
          </div>
        </div>
        
        <!-- 普通成员列表 -->
        <div 
          v-for="(member, index) in filteredMembers" 
          :key="member.id || member.userId"
          class="mention-item"
          :class="{ active: selectedMentionIndex === index }"
          @click="selectMention(member)"
        >
          <div class="member-avatar">
            <img :src="member.Avatar || member.avatar || '/images/avatar/default-avatar.webp'" :alt="member.Nickname" />
          </div>
          <div class="member-info">
            <span class="member-name">{{ member.Nickname || member.name || member.userName || member.uname || '未知用户' }}</span>
            <span v-if="member.role" class="member-role">{{ member.role }}</span>
          </div>
        </div>
        
        <!-- 无匹配结果 -->
        <div v-if="filteredMembers.length === 0 && !canMentionAll" class="no-results">
          没有找到匹配的成员
        </div>
      </div>
    </div>

    <!-- 表情选择器 -->
    <EmojiPicker 
      :show="showEmojiPicker"
      @select="insertEmoji"
      @select-sticker="handleSelectSticker"
      @close="showEmojiPicker = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { Emoji, Folder, Microphone, Pause, Xmark, Search } from '@iconoir/vue'
import EmojiPicker from '../EmojiPicker.vue'

const props = defineProps({
  // 基础配置
  disabled: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    default: '输入消息...'
  },
  maxLength: {
    type: Number,
    default: 5000
  },
  
  // 功能开关
  showEmojiButton: {
    type: Boolean,
    default: true
  },
  showFileButton: {
    type: Boolean,
    default: true
  },
  showVoiceButton: {
    type: Boolean,
    default: true
  },
  showSearchButton: {
    type: Boolean,
    default: false
  },
  
  // 文件上传配置
  allowMultipleFiles: {
    type: Boolean,
    default: true
  },
  acceptFileTypes: {
    type: String,
    default: '*/*'
  },
  maxFileSize: {
    type: Number,
    default: 100 * 1024 * 1024 // 100MB
  },
  
  // 引用消息
  quotedMessage: {
    type: Object,
    default: null
  },
  
  // 发送按钮
  sendButtonText: {
    type: String,
    default: 'Send'
  },
  
  
  // 录音相关
  isRecording: {
    type: Boolean,
    default: false
  },
  recordingTime: {
    type: Number,
    default: 0
  },
  
  // @提及相关
  groupMembers: {
    type: Array,
    default: () => []
  },
  currentUserId: {
    type: String,
    default: ''
  },
  userRole: {
    type: String,
    default: 'member' // member, admin, creator
  }
})

const emit = defineEmits([
  'send-message',
  'send-file',
  'send-voice',
  'send-sticker',
  'start-recording',
  'stop-recording',
  'cancel-recording',
  'typing-start',
  'typing-stop',
  'search',
])

// 响应式数据
const inputRef = ref(null)
const fileInputRef = ref(null)
const inputText = ref('')
const selectedFiles = ref([])
const filePreviewUrls = ref([])
const showEmojiPicker = ref(false)
const isTyping = ref(false)
const typingTimer = ref(null)

// @提及功能相关数据
const showMentionList = ref(false)
const mentionQuery = ref('')
const mentionStartPos = ref(0)

// 引用消息相关数据
const currentQuotedMessage = ref(null)
const selectedMentionIndex = ref(0)
const mentionListStyle = ref({})

// 计算属性
const canSend = computed(() => {
  return (inputText.value.trim().length > 0 || selectedFiles.value.length > 0) && !props.disabled
})

// @提及相关计算属性
const canMentionAll = computed(() => {
  return props.userRole === 'admin' || props.userRole === 'creator'
})

const filteredMembers = computed(() => {
  if (!props.groupMembers || props.groupMembers.length === 0) return []
  
  // 过滤掉自己
  let members = props.groupMembers.filter(member => 
    String(member.id || member.userId) !== String(props.currentUserId)
  )
  
  // 根据搜索关键词过滤
  if (mentionQuery.value.trim()) {
    const query = mentionQuery.value.toLowerCase()
    members = members.filter(member => 
      (member.Nickname || member.name || member.userName || member.uname || '').toLowerCase().includes(query)
    )
  }
  
  return members
})

const getPlaceholder = () => {
  if (selectedFiles.value.length > 0) {
    return '添加文字消息（可选）'
  }
  return props.placeholder
}

// 处理键盘事件
function handleKeyDown(event) {
  // 如果@成员列表显示中，处理方向键和回车
  if (showMentionList.value) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const maxIndex = (canMentionAll.value ? -1 : 0) + filteredMembers.value.length - 1
      selectedMentionIndex.value = Math.min(selectedMentionIndex.value + 1, maxIndex)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const minIndex = canMentionAll.value ? -1 : 0
      selectedMentionIndex.value = Math.max(selectedMentionIndex.value - 1, minIndex)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const member = selectedMentionIndex.value === -1 
        ? { id: 'all', name: '全体成员', isAll: true }
        : filteredMembers.value[selectedMentionIndex.value]
      if (member) {
        selectMention(member)
      }
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      hideMentionList()
      return
    }
  }

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSend()
  }
  
  // 开始输入
  if (!isTyping.value) {
    isTyping.value = true
    emit('typing-start')
  }
  
  // 重置输入计时器
  clearTimeout(typingTimer.value)
  typingTimer.value = setTimeout(() => {
    if (isTyping.value) {
      isTyping.value = false
      emit('typing-stop')
    }
  }, 1000)
}

function handleKeyUp() {
  // 自动调整文本框高度
  autoResizeTextarea()
  
  // 检测@符号输入
  checkMentionTrigger()
}

// 检测@提及触发
function checkMentionTrigger() {
  const textarea = inputRef.value
  if (!textarea) return
  
  const cursorPos = textarea.selectionStart
  const text = inputText.value
  
  // 从光标位置向前查找@符号
  let atPos = -1
  for (let i = cursorPos - 1; i >= 0; i--) {
    if (text[i] === '@') {
      // 检查@前面是否是空格或开头
      if (i === 0 || text[i - 1] === ' ' || text[i - 1] === '\n') {
        atPos = i
        break
      }
    } else if (text[i] === ' ' || text[i] === '\n') {
      // 遇到空格或换行，停止查找
      break
    }
  }
  
  if (atPos !== -1) {
    // 找到了@符号，显示成员列表
    const query = text.slice(atPos + 1, cursorPos)
    mentionStartPos.value = atPos
    mentionQuery.value = query
    selectedMentionIndex.value = canMentionAll.value ? -1 : 0
    showMentionList.value = true
    updateMentionListPosition()
  } else {
    // 没有找到@符号，隐藏成员列表
    hideMentionList()
  }
}

// 更新@成员列表位置
function updateMentionListPosition() {
  const textarea = inputRef.value
  if (!textarea) return
  
  // 显示在输入框上方，避免被遮挡
  const rect = textarea.getBoundingClientRect()
  const listHeight = 200 // 成员列表最大高度
  
  mentionListStyle.value = {
    position: 'absolute',
    bottom: `${rect.height + 10}px`, // 显示在输入框上方
    left: '10px',
    right: '10px',
    maxHeight: `${listHeight}px`,
    zIndex: 1000
  }
}

// 选择@提及成员
function selectMention(member) {
  const textarea = inputRef.value
  if (!textarea) return
  
  const text = inputText.value
  const beforeAt = text.slice(0, mentionStartPos.value)
  const afterCursor = text.slice(textarea.selectionStart)
  
  // 插入@标记
  const memberName = member.Nickname || member.name || member.userName || member.uname || '未知用户'
  const mentionText = member.isAll ? '@全体成员 ' : `@${memberName} `
  const newText = beforeAt + mentionText + afterCursor
  const newCursorPos = beforeAt.length + mentionText.length
  
  inputText.value = newText
  
  nextTick(() => {
    textarea.focus()
    textarea.setSelectionRange(newCursorPos, newCursorPos)
    autoResizeTextarea()
  })
  
  hideMentionList()
}

// 隐藏@成员列表
function hideMentionList() {
  showMentionList.value = false
  mentionQuery.value = ''
  selectedMentionIndex.value = 0
}

function handlePaste(event) {
  // 处理粘贴的文件
  const items = event.clipboardData?.items
  if (!items) return
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile()
      if (file) {
        addFiles([file])
      }
    }
  }
}

function handleFocus() {
  // 聚焦时的处理
}

function handleBlur() {
  // 失去焦点时停止输入状态
  if (isTyping.value) {
    isTyping.value = false
    emit('typing-stop')
  }
}

// 自动调整文本框高度
function autoResizeTextarea() {
  const textarea = inputRef.value
  if (!textarea) return
  
  textarea.style.height = 'auto'
  const newHeight = Math.min(textarea.scrollHeight, 120) // 最大120px
  textarea.style.height = newHeight + 'px'
}

// 发送消息
function handleSend() {
  if (!canSend.value) return
  
  const message = {
    content: inputText.value.trim(),
    files: selectedFiles.value,
    quotedMessage: currentQuotedMessage.value // 包含引用消息信息
  }
  
  // 发送文件消息
  if (selectedFiles.value.length > 0) {
    emit('send-file', message)
  } else {
    // 发送文本消息
    emit('send-message', message)
  }
  
  // 清空输入
  clearInput()
}

// 清空输入
function clearInput() {
  inputText.value = ''
  selectedFiles.value = []
  filePreviewUrls.value = []
  currentQuotedMessage.value = null // 清空引用消息
  autoResizeTextarea()
}

// 文件相关方法
function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileChange(event) {
  const files = Array.from(event.target.files || [])
  addFiles(files)
  // 清空input的value，允许重复选择同一文件
  event.target.value = ''
}

function addFiles(files) {
  const validFiles = files.filter(file => {
    if (file.size > props.maxFileSize) {
      console.warn(`文件 ${file.name} 超过大小限制`)
      return false
    }
    return true
  })
  
  selectedFiles.value.push(...validFiles)
  
  // 生成预览URL
  validFiles.forEach(file => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      filePreviewUrls.value.push(url)
    } else {
      filePreviewUrls.value.push('')
    }
  })
}

function removeFile(index) {
  // 释放预览URL
  if (filePreviewUrls.value[index]) {
    URL.revokeObjectURL(filePreviewUrls.value[index])
  }
  
  selectedFiles.value.splice(index, 1)
  filePreviewUrls.value.splice(index, 1)
}

// 引用消息相关方法
function setQuotedMessage(message) {
  currentQuotedMessage.value = message
}

function clearQuotedMessage() {
  currentQuotedMessage.value = null
}

// 表情相关方法
function toggleEmojiPicker() {
  showEmojiPicker.value = !showEmojiPicker.value
}

function insertEmoji(emoji) {
  const textarea = inputRef.value
  if (!textarea) return
  
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = inputText.value
  
  inputText.value = text.slice(0, start) + emoji + text.slice(end)
  
  // 恢复光标位置
  nextTick(() => {
    textarea.focus()
    textarea.setSelectionRange(start + emoji.length, start + emoji.length)
  })
  
  // 关闭表情选择器
  showEmojiPicker.value = false
}

// 处理表情包选择
function handleSelectSticker(sticker) {
  emit('send-sticker', sticker)
  showEmojiPicker.value = false
}

// 录音相关方法
function startRecording() {
  emit('start-recording')
}

function stopRecording() {
  emit('stop-recording')
}

function cancelRecording() {
  emit('cancel-recording')
}

function formatRecordingTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}


// 工具方法
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

// 监听输入变化，自动调整高度
watch(inputText, () => {
  nextTick(() => {
    autoResizeTextarea()
  })
})

// 点击外部关闭表情选择器
watch(showEmojiPicker, (newValue) => {
  if (newValue) {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.emoji-picker') && !event.target.closest('.emoji-btn')) {
        showEmojiPicker.value = false
        document.removeEventListener('click', handleClickOutside)
      }
    }
    
    nextTick(() => {
      document.addEventListener('click', handleClickOutside)
    })
  }
})

// 暴露方法给父组件
defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  clearInput,
  insertText: (text) => {
    inputText.value += text
    nextTick(() => autoResizeTextarea())
  },
  getText: () => inputText.value,
  getSelectedFiles: () => selectedFiles.value,
  setInputContent: (content) => {
    inputText.value = content
    nextTick(() => autoResizeTextarea())
  },
  focusInput: () => inputRef.value?.focus(),
  setQuotedMessage,
  clearQuotedMessage
})
</script>

<style scoped lang="scss">
.chat-input {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  flex-shrink: 0;
  padding: 16px;
  backdrop-filter: blur(10px);
  position: relative; // 为 EmojiPicker 提供定位上下文

  // 引用消息预览样式
  .quoted-message-preview {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
    position: relative;
    
    .quoted-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      
      .quoted-label {
        font-size: 12px;
        color: #6c757d;
        font-weight: 500;
      }
      
      .clear-quote-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        color: #6c757d;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        
        .icon {
          width: 14px;
          height: 14px;
        }
        
        &:hover {
          background: #dee2e6;
          color: #495057;
        }
      }
    }
    
    .quoted-content {
      .quoted-text {
        font-size: 13px;
        color: #495057;
        line-height: 1.4;
        max-height: 60px;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        line-clamp: 3; // 标准属性
        -webkit-box-orient: vertical;
      }
      
      .quoted-media {
        font-size: 13px;
        color: #6c757d;
        font-style: italic;
      }
    }
    
    // 左侧引用线条
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: #007bff;
      border-radius: 0 3px 3px 0;
    }
  }
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);

  .file-preview-inline {
    margin-bottom: 12px;
    padding: 12px 16px;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 12px;
    border: 2px dashed rgba(0, 123, 255, 0.3);
    animation: slideUp 0.3s ease-out;

    .file-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 0;

      &:not(:last-child) {
        border-bottom: 1px solid #e9ecef;
        margin-bottom: 6px;
        padding-bottom: 12px;
      }

      .file-icon-container {
        width: 40px;
        height: 40px;

        .file-icon-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 4px;

          &.image-thumbnail {
            border-radius: 8px;
          }
        }
      }

      .file-details {
        flex: 1;

        .file-name {
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 2px;
          word-break: break-all;
        }

        .file-size {
          font-size: 12px;
          color: #6c757d;
        }
      }

      .remove-file-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: background-color 0.2s;

        &:hover {
          background-color: rgba(255, 0, 0, 0.1);
        }
      }
    }

    .file-count {
      font-size: 12px;
      color: #6c757d;
      text-align: center;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #e9ecef;
    }
  }


  .input-container {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    position: relative;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.06);
    padding: 8px;
    transition: all 0.3s ease;
    
    &:hover {
      border-color: var(--primary-color, rgba(165, 42, 42, 0.3));
      box-shadow: 0 4px 15px var(--hover-bg, rgba(165, 42, 42, 0.1));
    }
    
    &:focus-within {
      border-color: var(--primary-color, rgba(165, 42, 42, 1));
      box-shadow: 0 4px 20px var(--hover-bg, rgba(165, 42, 42, 0.15));
      transform: translateY(-1px);
    }

    textarea {
      flex: 1;
      border: none;
      border-radius: 8px;
      padding: 14px 18px;
      resize: none;
      font-size: 15px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      min-height: 112px;
      max-height: 200px;
      background: transparent;
      color: #2c3e50;
      transition: all 0.3s ease;
      
      &::placeholder {
        color: #8e9aaf;
        font-weight: 400;
      }

      &:focus {
        outline: none;
        border-color: #007bff;
      }

      &:disabled {
        background-color: #f8f9fa;
        cursor: not-allowed;
      }

      &.with-file {
        border-color: #28a745;
      }
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 4px;

      .tool-btn {
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 10px;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
        
        &::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(0, 123, 255, 0.1) 0%, rgba(0, 123, 255, 0.05) 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        &:hover:not(:disabled) {
          background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
          transform: translateY(-2px) scale(1.08);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
          
          &::before {
            opacity: 1;
          }
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        &.active {
          background: #007bff;
          color: white;
        }

        .icon {
          width: 16px;
          height: 16px;
          stroke-width: 1.5;
        }

        &.voice-recording {
          background: #dc3545;
          color: white;
          border-radius: 18px;
          width: auto;
          padding: 0 12px;
          font-size: 12px;
        }

        &.voice-cancel {
          background: #6c757d;
          color: white;
        }

        &.send-btn {
          background: var(--primary-gradient, linear-gradient(135deg, rgba(165, 42, 42, 0.9) 0%, rgba(140, 35, 35, 0.95) 100%));
          color: var(--text-inverse, white);
          font-weight: 600;
          box-shadow: var(--shadow-primary, 0 4px 15px rgba(165, 42, 42, 0.3));
          
          &:hover:not(:disabled) {
            background: var(--primary-gradient, linear-gradient(135deg, rgba(145, 32, 32, 1) 0%, rgba(120, 25, 25, 1) 100%));
            transform: translateY(-2px) scale(1.05);
            box-shadow: var(--shadow-primary, 0 8px 25px rgba(165, 42, 42, 0.4));
          }
          
          &:disabled {
            background: var(--text-tertiary, linear-gradient(135deg, #6c757d 0%, #5a6268 100%));
            box-shadow: none;
          }
          
          &.active:not(:disabled) {
            background: var(--success-color, linear-gradient(135deg, #28a745 0%, #20c997 100%));
            animation: pulse 0.6s ease-in-out;
          }
        }
      }
    }
  }

  .emoji-picker {
    position: absolute;
    bottom: 100%;
    left: 12px;
    right: 12px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 12px;
    z-index: 1000;

    .emoji-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
      gap: 4px;
      max-height: 200px;
      overflow-y: auto;

      .emoji-item {
        width: 36px;
        height: 36px;
        border: none;
        background: none;
        cursor: pointer;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        transition: background-color 0.2s;

        &:hover {
          background-color: #f8f9fa;
        }
      }
    }
  }
}

/* CSS动画效果 */
@keyframes pulse {
  0% {
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 8px 25px rgba(40, 167, 69, 0.4);
  }
  50% {
    transform: translateY(-1px) scale(1.08);
    box-shadow: 0 10px 30px rgba(40, 167, 69, 0.6);
  }
  100% {
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 8px 25px rgba(40, 167, 69, 0.4);
  }
}

@keyframes slideUp {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-input {
    padding: 8px;

    .input-container {
      .toolbar {
        .tool-btn {
          width: 40px;
          height: 40px;
          font-size: 16px;
        }
      }
    }
  }
}

@media (max-width: 480px) {
  .chat-input {
    .input-container {
      .toolbar {
        gap: 2px;

        .tool-btn {
          width: 36px;
          height: 36px;
        }
      }
    }
  }
}

// @成员列表样式
.mention-list-container {
  position: absolute;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  
  .mention-list {
    max-height: 200px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #ccc transparent;
    
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    
    &::-webkit-scrollbar-thumb {
      background-color: #ccc;
      border-radius: 3px;
    }
    
    &::-webkit-scrollbar-thumb:hover {
      background-color: #999;
    }
    
    .mention-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      cursor: pointer;
      transition: background-color 0.2s ease;
      
      &:hover,
      &.active {
        background-color: #f5f5f5;
      }
      
      .member-avatar {
        width: 32px;
        height: 32px;
        margin-right: 10px;
        border-radius: 50%;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .all-icon {
          font-size: 18px;
          font-weight: bold;
          color: #007bff;
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
      }
      
      .member-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
        
        .member-name {
          font-size: 14px;
          font-weight: 500;
          color: #333;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .member-desc,
        .member-role {
          font-size: 12px;
          color: #666;
          margin-top: 2px;
        }
      }
    }
    
    .no-results {
      padding: 16px 12px;
      text-align: center;
      color: #999;
      font-size: 14px;
    }
  }
}
</style>
