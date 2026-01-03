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

    <!-- 表情选择器 -->
    <div v-if="showEmojiPicker" class="emoji-picker">
      <div class="emoji-grid">
        <button
          v-for="emoji in commonEmojis"
          :key="emoji"
          @click="insertEmoji(emoji)"
          class="emoji-item"
        >
          {{ emoji }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { Emoji, Folder, Microphone, Pause, Xmark, Search } from '@iconoir/vue'

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
  }
})

const emit = defineEmits([
  'send-message',
  'send-file',
  'send-voice',
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

// 常用表情
const commonEmojis = [
  '😀', '😂', '🤣', '😊', '😍', '🥰', '😘', '😗', '😚', '😙',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖',
  '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯',
  '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
  '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤏', '💪',
  '🙏', '✍️', '💅', '🤳', '💃', '🕺', '👫', '👭', '👬', '💑'
]

// 计算属性
const canSend = computed(() => {
  return (inputText.value.trim().length > 0 || selectedFiles.value.length > 0) && !props.disabled
})

const getPlaceholder = () => {
  if (selectedFiles.value.length > 0) {
    return '添加文字消息（可选）'
  }
  return props.placeholder
}

// 处理键盘事件
function handleKeyDown(event) {
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
    files: selectedFiles.value
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
  if (!fileType) return '/images/icon/file.png'
  
  if (fileType.includes('pdf')) return '/images/icon/pdf.png'
  if (fileType.includes('word') || fileType.includes('doc')) return '/images/icon/word.png'
  if (fileType.includes('excel') || fileType.includes('sheet')) return '/images/icon/excel.png'
  if (fileType.includes('text')) return '/images/icon/txt.png'
  if (fileType.includes('zip') || fileType.includes('rar')) return '/images/icon/zip.png'
  
  return '/images/icon/file.png'
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
  focusInput: () => inputRef.value?.focus()
})
</script>

<style scoped lang="scss">
.chat-input {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  flex-shrink: 0;
  padding: 16px;
  backdrop-filter: blur(10px);
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
      border-color: rgba(0, 123, 255, 0.3);
      box-shadow: 0 4px 15px rgba(0, 123, 255, 0.1);
    }
    
    &:focus-within {
      border-color: #007bff;
      box-shadow: 0 4px 20px rgba(0, 123, 255, 0.15);
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
          background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
          color: white;
          font-weight: 600;
          box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
          
          &:hover:not(:disabled) {
            background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
            transform: translateY(-2px) scale(1.05);
            box-shadow: 0 8px 25px rgba(0, 123, 255, 0.4);
          }
          
          &:disabled {
            background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
            box-shadow: none;
          }
          
          &.active:not(:disabled) {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
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
</style>
