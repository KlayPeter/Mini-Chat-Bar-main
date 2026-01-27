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
      <!-- Markdown 预览面板 - 放在最上方 -->
      <div v-if="showMarkdownPreview && inputText.trim()" class="markdown-preview-panel">
        <div class="preview-header">
          <span class="preview-title">预览效果</span>
          <button class="close-preview-btn" @click="showMarkdownPreview = false" title="关闭预览">
            <Xmark class="icon" />
          </button>
        </div>
        <div class="preview-content" v-html="renderMarkdownPreview(inputText)"></div>
      </div>

      <!-- 工具栏 - 放在上方 -->
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
          <!-- 未录音状态：显示录音按钮 -->
          <button
            v-if="!isRecording && !hasRecordedAudio"
            class="tool-btn voice-btn"
            @click="startRecording"
            title="录音"
            :disabled="disabled"
          >
            <Microphone class="icon" />
          </button>
          
          <!-- 录音中状态：显示停止按钮和取消按钮 -->
          <button
            v-if="isRecording"
            class="tool-btn voice-recording"
            @click="stopRecording"
            title="停止录音"
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
          
          <!-- 录音完成状态：显示发送和取消按钮 -->
          <button
            v-if="!isRecording && hasRecordedAudio"
            class="tool-btn voice-send"
            @click="sendVoiceRecording"
            title="发送语音"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            {{ formatRecordingTime(recordingTime) }}"
          </button>
          <button
            v-if="!isRecording && hasRecordedAudio"
            class="tool-btn voice-cancel"
            @click="cancelRecording"
            title="取消"
          >
            <Xmark class="icon" />
          </button>
        </template>

        <!-- Markdown 格式化按钮 -->
        <button 
          class="tool-btn markdown-btn"
          @click="toggleMarkdownMenu"
          title="Markdown 格式"
          :class="{ active: showMarkdownMenu }"
          :disabled="disabled"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="5" width="18" height="14" rx="2" ry="2"/>
            <path d="M7 15V9l2 2 2-2v6M17 11l-2 4h4l-2-4z"/>
          </svg>
        </button>

        <!-- Markdown 预览按钮 -->
        <button 
          class="tool-btn preview-btn"
          @click="toggleMarkdownPreview"
          title="预览效果"
          :class="{ active: showMarkdownPreview }"
          :disabled="disabled || !inputText.trim()"
        >
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>

        <!-- 搜索按钮 -->
        <button 
          v-if="showSearchButton"
          class="tool-btn search-btn"
          @click="$emit('search')"
          title="搜索历史记录"
        >
          <Search class="icon" />
        </button>
      </div>

      <!-- Markdown 格式菜单 -->
      <div v-if="showMarkdownMenu" class="markdown-menu">
        <button @click="insertMarkdown('bold')" class="md-btn" title="加粗">
          <strong>B</strong>
        </button>
        <button @click="insertMarkdown('italic')" class="md-btn" title="斜体">
          <em>I</em>
        </button>
        <button @click="insertMarkdown('heading')" class="md-btn" title="标题">
          H
        </button>
        <button @click="insertMarkdown('code')" class="md-btn" title="行内代码">
          <code>&lt;/&gt;</code>
        </button>
        <button @click="insertMarkdown('codeblock')" class="md-btn" title="代码块">
          <span style="font-family: monospace;">{ }</span>
        </button>
        <button @click="insertMarkdown('quote')" class="md-btn" title="引用">
          <span style="font-size: 18px;">"</span>
        </button>
        <button @click="insertMarkdown('list')" class="md-btn" title="列表">
          ≡
        </button>
        <button @click="insertMarkdown('link')" class="md-btn" title="链接">
          🔗
        </button>
      </div>

      <!-- 输入框和发送按钮 - 放在下方同一行 -->
      <div class="input-row">
        <!-- 普通文本输入框 -->
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
import { marked } from 'marked'
import hljs from 'highlight.js'
import EmojiPicker from '../EmojiPicker.vue'

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true,
})

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
  'input-focus',
])

// 响应式数据
const inputRef = ref(null)
const fileInputRef = ref(null)
const inputText = ref('')
const selectedFiles = ref([])
const filePreviewUrls = ref([])
const showEmojiPicker = ref(false)
const showMarkdownMenu = ref(false)
const showMarkdownPreview = ref(false)
const isTyping = ref(false)
const typingTimer = ref(null)
const hasRecordedAudio = ref(false) // 是否有录制好的音频待发送

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
  // 聚焦时通知父组件，用于滚动到底部
  emit('input-focus')
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
  const newHeight = Math.min(textarea.scrollHeight, 120)
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
  currentQuotedMessage.value = null
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
  if (showEmojiPicker.value) {
    showMarkdownMenu.value = false
  }
}

// Markdown 格式化相关方法
function toggleMarkdownMenu() {
  showMarkdownMenu.value = !showMarkdownMenu.value
  if (showMarkdownMenu.value) {
    showEmojiPicker.value = false
  }
}

// 切换 Markdown 预览
function toggleMarkdownPreview() {
  showMarkdownPreview.value = !showMarkdownPreview.value
}

// 渲染 Markdown 预览
function renderMarkdownPreview(content) {
  if (!content || typeof content !== 'string') return ''
  
  try {
    // 使用 marked 解析 Markdown
    let html = marked.parse(content)
    
    // 手动高亮代码块
    html = html.replace(/<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g, (match, lang, code) => {
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
    
    // 处理没有语言标识的代码块
    html = html.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, (match, code) => {
      // 解码 HTML 实体
      const decodedCode = code
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
      
      // 自动检测语言并高亮
      const highlightedCode = hljs.highlightAuto(decodedCode).value
      
      return `<pre><code class="hljs">${highlightedCode}</code></pre>`
    })
    
    return html
  } catch (err) {
    console.error('Markdown preview render error:', err)
    return content
  }
}

function insertMarkdown(type) {
  const textarea = inputRef.value
  if (!textarea) return
  
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = inputText.value
  const selectedText = text.slice(start, end)
  
  let before = ''
  let after = ''
  let newCursorPos = start
  
  switch (type) {
    case 'bold':
      before = '**'
      after = '**'
      newCursorPos = start + 2 + selectedText.length
      break
    case 'italic':
      before = '*'
      after = '*'
      newCursorPos = start + 1 + selectedText.length
      break
    case 'heading':
      before = '### '
      after = ''
      newCursorPos = start + 4 + selectedText.length
      break
    case 'code':
      before = '`'
      after = '`'
      newCursorPos = start + 1 + selectedText.length
      break
    case 'codeblock':
      before = '```\n'
      after = '\n```'
      newCursorPos = start + 4 + selectedText.length
      break
    case 'quote':
      before = '> '
      after = ''
      newCursorPos = start + 2 + selectedText.length
      break
    case 'list':
      before = '- '
      after = ''
      newCursorPos = start + 2 + selectedText.length
      break
    case 'link':
      before = '['
      after = '](url)'
      newCursorPos = start + 1 + selectedText.length
      break
  }
  
  const newText = text.slice(0, start) + before + selectedText + after + text.slice(end)
  inputText.value = newText
  
  nextTick(() => {
    textarea.focus()
    textarea.setSelectionRange(newCursorPos, newCursorPos)
    autoResizeTextarea()
  })
  
  // 关闭菜单
  showMarkdownMenu.value = false
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
  hasRecordedAudio.value = false
  emit('start-recording')
}

function stopRecording() {
  emit('stop-recording')
  // 停止录音后，设置为有录音待发送状态
  hasRecordedAudio.value = true
}

function cancelRecording() {
  hasRecordedAudio.value = false
  emit('cancel-recording')
}

function sendVoiceRecording() {
  hasRecordedAudio.value = false
  emit('send-voice')
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
  border-top: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  background: var(--bg-tertiary, #ffffff);
  flex-shrink: 0;
  padding: 16px;
  backdrop-filter: blur(10px);
  position: relative; // 为 EmojiPicker 提供定位上下文

  // 引用消息预览样式
  .quoted-message-preview {
    background: var(--bg-secondary, #f8f9fa);
    border: 1px solid var(--border-color-light, #e9ecef);
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
        color: var(--text-secondary, #6c757d);
        font-weight: 500;
      }
      
      .clear-quote-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        color: var(--text-secondary, #6c757d);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        
        .icon {
          width: 14px;
          height: 14px;
        }
        
        &:hover {
          background: var(--active-bg, #dee2e6);
          color: var(--text-primary, #495057);
        }
      }
    }
    
    .quoted-content {
      .quoted-text {
        font-size: 13px;
        color: var(--text-primary, #495057);
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
        color: var(--text-secondary, #6c757d);
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
    background: var(--bg-secondary, linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%));
    border-radius: 12px;
    border: 2px dashed var(--border-color, rgba(0, 123, 255, 0.3));
    animation: slideUp 0.3s ease-out;

    .file-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 0;

      &:not(:last-child) {
        border-bottom: 1px solid var(--border-color, #e9ecef);
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
          color: var(--text-primary);
        }

        .file-size {
          font-size: 12px;
          color: var(--text-secondary, #6c757d);
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
      color: var(--text-secondary, #6c757d);
      text-align: center;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--border-color, #e9ecef);
    }
  }


  .input-container {
    display: flex;
    flex-direction: column;
    gap: 0;
    position: relative;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.95) 100%);
    border-radius: 12px;
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.06));
    overflow: visible;
    transition: all 0.3s ease;
    
    &:hover {
      border-color: var(--primary-color, rgba(165, 42, 42, 0.25));
      box-shadow: 0 4px 16px rgba(165, 42, 42, 0.08);
    }
    
    &:focus-within {
      border-color: var(--primary-color, rgba(165, 42, 42, 0.4));
      box-shadow: 0 4px 20px rgba(165, 42, 42, 0.12);
    }

    // Markdown 预览面板
    .markdown-preview-panel {
      background: linear-gradient(135deg, rgba(248, 249, 250, 0.95) 0%, rgba(233, 236, 239, 0.9) 100%);
      border-top: 1px solid var(--border-color, rgba(0, 0, 0, 0.06));
      border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.06));
      border-radius: 12px 12px 0 0; // 顶部圆角
      padding: 12px 16px;
      max-height: 200px;
      overflow-y: auto;
      animation: slideDown 0.3s ease-out;
      pointer-events: auto; // 确保可以交互
      user-select: text; // 允许选择文本
      
      // 阻止所有链接的默认行为
      * {
        pointer-events: none;
      }
      
      .preview-header {
        pointer-events: auto;
        
        .close-preview-btn {
          pointer-events: auto;
        }
      }
      
      .preview-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        
        .preview-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary, #6c757d);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .close-preview-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          color: var(--text-secondary, #6c757d);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          
          .icon {
            width: 14px;
            height: 14px;
          }
          
          &:hover {
            background: rgba(165, 42, 42, 0.08);
            color: var(--primary-color, rgba(165, 42, 42, 0.9));
          }
        }
      }
      
      .preview-content {
        font-size: 14px;
        line-height: 1.6;
        color: #000000;
        font-weight: 500;
        
        :deep(h1), :deep(h2), :deep(h3) {
          margin: 0.5em 0 0.3em;
          font-weight: 700;
          line-height: 1.3;
          color: #000000;
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          
          &:first-child {
            margin-top: 0;
          }
        }
        
        :deep(h1) { font-size: 1.8em; }
        :deep(h2) { font-size: 1.6em; }
        :deep(h3) { font-size: 1.4em; }
        
        :deep(p) {
          margin: 0.5em 0;
          color: #000000;
          
          &:first-child {
            margin-top: 0;
          }
          
          &:last-child {
            margin-bottom: 0;
          }
        }
        
        :deep(strong) {
          font-weight: 900;
          color: #d32f2f;
          text-shadow: 0 0 1px rgba(211, 47, 47, 0.3);
        }
        
        :deep(em) {
          font-style: italic;
          color: #1976d2;
          font-weight: 600;
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
            // 设置默认浅色文本，让代码可见
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
          border-left: 5px solid #ff6f00;
          background: #fff3e0;
          padding: 10px 12px;
          margin: 0.8em 0;
          color: #e65100;
          font-style: italic;
          font-weight: 600;
          border-radius: 0 4px 4px 0;
        }
        
        :deep(ul), :deep(ol) {
          margin: 0.5em 0;
          padding-left: 1.5em;
          color: #000000;
          
          li {
            margin: 0.3em 0;
            font-weight: 500;
            
            &::marker {
              color: #1976d2;
              font-weight: 700;
            }
          }
        }
        
        :deep(a) {
          color: #0d47a1;
          text-decoration: underline;
          font-weight: 600;
          
          &:hover {
            color: #1565c0;
            text-decoration: underline;
          }
        }
        
        :deep(hr) {
          border: none;
          border-top: 3px solid #ff6b6b;
          margin: 1em 0;
        }
      }
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 8px 12px;
      background: linear-gradient(135deg, rgba(248, 249, 250, 0.6) 0%, rgba(233, 236, 239, 0.4) 100%);
      border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.04));
      border-radius: 12px 12px 0 0; // 添加圆角
      position: relative; // 为 markdown-menu 提供定位上下文

      .tool-btn {
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: var(--text-secondary, #6c757d);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        
        &:hover:not(:disabled) {
          background: rgba(165, 42, 42, 0.08);
          color: var(--primary-color, rgba(165, 42, 42, 0.9));
          transform: scale(1.1);
        }
        
        &:active:not(:disabled) {
          transform: scale(0.95);
        }

        &:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        &.active {
          background: rgba(165, 42, 42, 0.12);
          color: var(--primary-color, rgba(165, 42, 42, 1));
        }

        .icon {
          width: 20px;
          height: 20px;
          stroke-width: 2;
        }

        &.voice-recording {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
          color: white;
          border-radius: 18px;
          width: auto;
          padding: 0 14px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
          animation: recordingPulse 1.5s ease-in-out infinite;
        }
        
        &.voice-send {
          background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
          color: white;
          border-radius: 18px;
          width: auto;
          padding: 0 14px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(7, 193, 96, 0.3);
          
          &:hover:not(:disabled) {
            background: linear-gradient(135deg, #06ad56 0%, #059748 100%);
          }
        }

        &.voice-cancel {
          background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
          color: white;
          box-shadow: 0 2px 6px rgba(108, 117, 125, 0.25);
        }
      }
    }

    .input-row {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 0 0 12px 12px;
      position: relative;

      textarea {
        flex: 1;
        border: none;
        padding: 0;
        resize: none;
        font-size: 15px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
        line-height: 1.5;
        min-height: 44px;
        max-height: 180px;
        background: transparent;
        color: var(--text-primary, #2c3e50);
        transition: all 0.2s ease;
        
        &::placeholder {
          color: var(--text-tertiary, #a0aec0);
          font-weight: 400;
        }

        &:focus {
          outline: none;
        }

        &:disabled {
          background-color: var(--bg-secondary, #f8f9fa);
          cursor: not-allowed;
          opacity: 0.6;
        }

        &.with-file {
          background: linear-gradient(135deg, rgba(40, 167, 69, 0.02) 0%, rgba(40, 167, 69, 0.01) 100%);
        }
      }

      .send-btn {
        flex-shrink: 0;
        width: auto;
        min-width: 70px;
        height: 40px;
        border: none;
        border-radius: 8px;
        background: linear-gradient(135deg, rgba(165, 42, 42, 0.95) 0%, rgba(140, 35, 35, 1) 100%);
        color: white;
        font-weight: 600;
        font-size: 14px;
        letter-spacing: 0.3px;
        padding: 0 20px;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(165, 42, 42, 0.25);
        
        &:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(145, 32, 32, 1) 0%, rgba(120, 25, 25, 1) 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(165, 42, 42, 0.35);
        }
        
        &:active:not(:disabled) {
          transform: translateY(0);
        }
        
        &:disabled {
          background: linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%);
          box-shadow: none;
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        &.active:not(:disabled) {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          animation: sendPulse 0.8s ease-in-out;
        }
      }
    }
  }

  .emoji-picker {
    position: absolute;
    bottom: 100%;
    left: 12px;
    right: 12px;
    background: var(--bg-tertiary, white);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.15));
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
          background-color: var(--hover-bg, #f8f9fa);
        }
      }
    }
  }

  // Markdown 格式菜单样式
  .markdown-menu {
    position: absolute;
    bottom: calc(100% + 8px); // 在工具栏上方显示，增加间距
    left: 12px;
    background: white;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    padding: 8px;
    display: flex;
    gap: 4px;
    z-index: 2000; // 提高 z-index
    animation: slideUpFade 0.2s ease-out;
    
    .md-btn {
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: var(--text-primary, #333);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 600;
      transition: all 0.2s ease;
      
      &:hover {
        background: rgba(165, 42, 42, 0.08);
        color: var(--primary-color, rgba(165, 42, 42, 0.9));
        transform: scale(1.1);
      }
      
      &:active {
        transform: scale(0.95);
      }
      
      strong, em, code {
        font-size: 16px;
      }
      
      em {
        font-style: italic;
      }
      
      code {
        font-family: 'Courier New', monospace;
        font-size: 14px;
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

@keyframes slideDown {
  from {
    max-height: 0;
    opacity: 0;
  }
  to {
    max-height: 200px;
    opacity: 1;
  }
}

@keyframes slideUpFade {
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
  background: var(--bg-tertiary, white);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.1));
  overflow: hidden;
  
  .mention-list {
    max-height: 200px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--text-tertiary, #ccc) transparent;
    
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    
    &::-webkit-scrollbar-thumb {
      background-color: var(--text-tertiary, #ccc);
      border-radius: 3px;
    }
    
    &::-webkit-scrollbar-thumb:hover {
      background-color: var(--text-secondary, #999);
    }
    
    .mention-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      cursor: pointer;
      transition: background-color 0.2s ease;
      
      &:hover,
      &.active {
        background-color: var(--hover-bg, #f5f5f5);
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
          color: var(--primary-color, #007bff);
          background: var(--hover-bg, linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%));
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
          color: var(--text-primary, #333);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .member-desc,
        .member-role {
          font-size: 12px;
          color: var(--text-secondary, #666);
          margin-top: 2px;
        }
      }
    }
    
    .no-results {
      padding: 16px 12px;
      text-align: center;
      color: var(--text-tertiary, #999);
      font-size: 14px;
    }
  }
}
</style>
