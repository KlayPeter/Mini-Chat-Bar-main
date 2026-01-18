<template>
  <div 
    class="code-message" 
    :class="{ 'is-mine': isMyMessage }"
    @contextmenu.prevent="handleContextMenu"
  >
    <div class="message-avatar">
      <img 
        v-if="avatarUrl"
        :src="avatarUrl" 
        alt="avatar"
        @error="e => e.target.style.display = 'none'"
      />
      <div v-else class="avatar-placeholder">
        {{ (message.fromName || '?')[0].toUpperCase() }}
      </div>
    </div>
    
    <div class="code-content">
      <div class="code-header">
        <div class="sender-info">
          <span class="sender-name" :class="{ 'is-me': isMyMessage }">
            {{ message.fromName || '未知用户' }}
          </span>
          <span class="time">{{ formatTime(message.time || message.createdAt) }}</span>
        </div>
        <div class="code-meta">
          <span class="language-badge">{{ languageDisplay }}</span>
          <span class="file-name" v-if="message.codeInfo?.fileName">
            <FileCode :size="14" />
            {{ message.codeInfo.fileName }}
          </span>
        </div>
        <button @click="handleReply" class="reply-btn-code" title="回复">
          <MessageCircle :size="16" />
        </button>
        <button @click="toggleFavorite" class="favorite-btn" :class="{ favorited: isFavorited }" title="收藏代码">
          <Star :size="16" :fill="isFavorited ? 'currentColor' : 'none'" />
        </button>
        <button 
          v-if="canRunCode"
          @click="runCode" 
          class="run-btn" 
          :class="{ running: isRunning }"
          :disabled="isRunning"
          title="运行代码"
        >
          <Loader v-if="isRunning" :size="16" class="spin" />
          <Play v-else :size="16" />
          <span>{{ isRunning ? '运行中...' : '运行' }}</span>
        </button>
        <button @click="copyCode" class="copy-btn" :class="{ copied }">
          <Check v-if="copied" :size="16" />
          <Copy v-else :size="16" />
          <span>{{ copied ? '已复制' : '复制' }}</span>
        </button>
      </div>
      
      <div class="code-body">
        <div class="line-numbers">
          <span v-for="n in lineCount" :key="n" class="line-number">{{ n }}</span>
        </div>
        <pre><code :class="`language-${message.codeInfo?.language || 'javascript'}`" v-html="highlightedCode"></code></pre>
      </div>
      
      <div class="code-description" v-if="message.content && message.content !== '发送了一段代码'">
        <MessageCircle :size="14" />
        <MessageContent :content="message.content" />
      </div>
      
      <!-- 代码执行结果 -->
      <div v-if="executionResult" class="execution-result">
        <div class="result-header">
          <Terminal :size="16" />
          <span>执行结果</span>
          <span class="execution-time">{{ executionResult.executionTime }}ms</span>
          <button @click="executionResult = null" class="close-result-btn">
            <X :size="14" />
          </button>
        </div>
        
        <div class="result-body">
          <!-- 控制台输出 -->
          <div v-if="executionResult.logs && executionResult.logs.length > 0" class="output-section">
            <div class="output-label">
              <CheckCircle :size="14" />
              Console Output
            </div>
            <pre class="output-content">{{ executionResult.logs.join('\n') }}</pre>
          </div>
          
          <!-- 返回值 -->
          <div v-if="executionResult.result !== null && executionResult.result !== undefined" class="output-section">
            <div class="output-label">
              <ArrowRight :size="14" />
              Return Value
            </div>
            <pre class="output-content">{{ formatResult(executionResult.result) }}</pre>
          </div>
          
          <!-- 警告 -->
          <div v-if="executionResult.warnings && executionResult.warnings.length > 0" class="output-section warning">
            <div class="output-label">
              <AlertTriangle :size="14" />
              Warnings
            </div>
            <pre class="output-content">{{ executionResult.warnings.join('\n') }}</pre>
          </div>
          
          <!-- 错误 -->
          <div v-if="executionResult.error" class="output-section error">
            <div class="output-label">
              <XCircle :size="14" />
              Error
            </div>
            <pre class="output-content">{{ executionResult.error.message }}</pre>
          </div>
          
          <!-- 运行时错误 -->
          <div v-if="executionResult.errors && executionResult.errors.length > 0" class="output-section error">
            <div class="output-label">
              <XCircle :size="14" />
              Console Errors
            </div>
            <pre class="output-content">{{ executionResult.errors.join('\n') }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Copy, Check, FileCode, MessageCircle, Star, Play, Loader, Terminal, CheckCircle, ArrowRight, AlertTriangle, XCircle, X } from 'lucide-vue-next'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import axios from 'axios'
import MessageContent from './MessageContent.vue'

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  isMyMessage: {
    type: Boolean,
    default: false
  },
  myAvatar: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['reply', 'favorite', 'contextmenu'])

const baseUrl = import.meta.env.VITE_BASE_URL
const copied = ref(false)
const isFavorited = ref(false)
const isRunning = ref(false)
const executionResult = ref(null)

// 获取头像 URL
const avatarUrl = computed(() => {
  const avatar = props.isMyMessage ? props.myAvatar : props.message.fromAvatar
  if (!avatar) return ''
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar
  }
  return baseUrl + avatar
})

const lineCount = computed(() => {
  const code = props.message.codeInfo?.code || ''
  return code.split('\n').length
})

// 判断是否可以运行代码（目前只支持 JavaScript）
const canRunCode = computed(() => {
  const language = props.message.codeInfo?.language || 'javascript'
  return language === 'javascript' || language === 'js'
})

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

const languageDisplay = computed(() => {
  const lang = props.message.codeInfo?.language || 'javascript'
  const langMap = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    java: 'Java',
    cpp: 'C++',
    csharp: 'C#',
    go: 'Go',
    rust: 'Rust',
    php: 'PHP',
    ruby: 'Ruby',
    swift: 'Swift',
    kotlin: 'Kotlin',
    html: 'HTML',
    css: 'CSS',
    sql: 'SQL',
    bash: 'Bash',
    json: 'JSON',
    vue: 'Vue'
  }
  return langMap[lang] || lang.toUpperCase()
})

const highlightedCode = computed(() => {
  const code = props.message.codeInfo?.code || ''
  const language = props.message.codeInfo?.language || 'javascript'
  
  try {
    // 使用 highlight.js 进行语法高亮
    const result = hljs.highlight(code, { 
      language: language,
      ignoreIllegals: true 
    })
    return result.value
  } catch (e) {
    // 如果指定语言失败，尝试自动检测
    try {
      const result = hljs.highlightAuto(code)
      return result.value
    } catch (err) {
      return code
    }
  }
})

async function copyCode() {
  try {
    await navigator.clipboard.writeText(props.message.codeInfo?.code || '')
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('复制失败:', err)
  }
}

function handleReply() {
  emit('reply', props.message)
}

function toggleFavorite() {
  isFavorited.value = !isFavorited.value
  emit('favorite', {
    messageId: props.message._id,
    isFavorited: isFavorited.value
  })
}

function handleContextMenu(event) {
  emit('contextmenu', event)
}

// 运行代码
async function runCode() {
  if (isRunning.value) return
  
  try {
    isRunning.value = true
    executionResult.value = null
    
    const token = localStorage.getItem('token')
    const code = props.message.codeInfo?.code || ''
    
    const response = await axios.post(
      `${baseUrl}/api/code/execute`,
      { code, timeout: 5000 },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    if (response.data.success || response.data.output) {
      executionResult.value = response.data.output
    } else {
      executionResult.value = {
        error: { message: response.data.message || '代码执行失败' }
      }
    }
    
  } catch (err) {
    console.error('运行代码失败:', err)
    executionResult.value = {
      error: { 
        message: err.response?.data?.message || err.message || '代码执行失败' 
      }
    }
  } finally {
    isRunning.value = false
  }
}

// 格式化返回值
function formatResult(result) {
  if (typeof result === 'object') {
    try {
      return JSON.stringify(result, null, 2)
    } catch (e) {
      return String(result)
    }
  }
  return String(result)
}

</script>

<style scoped lang="scss">
.code-message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: flex-start;
  
  &.is-mine {
    flex-direction: row-reverse;
    
    .code-content {
      align-items: flex-end;
    }
    
    .code-header {
      background: linear-gradient(135deg, #fef5f5 0%, #fff 100%);
      border: 1px solid rgba(165, 42, 42, 0.15);
    }
  }
  
  .message-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    flex-shrink: 0;
    position: relative;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }
    
    .avatar-placeholder {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgb(165, 42, 42) 0%, rgb(140, 30, 30) 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 600;
    }
  }
  
  .code-content {
    max-width: 70%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .code-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: #f8f9fa;
    border-bottom: 1px solid #e0e0e0;
    border-radius: 8px 8px 0 0;
    flex-wrap: wrap;
    
    .sender-info {
      display: flex;
      align-items: center;
      gap: 8px;
      
      .sender-name {
        font-size: 13px;
        font-weight: 600;
        color: #333;
        
        &.is-me {
          color: rgb(165, 42, 42);
        }
      }
      
      .time {
        font-size: 11px;
        color: #999;
      }
    }
    
    .code-meta {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      
      .language-badge {
        padding: 3px 10px;
        background: linear-gradient(135deg, rgb(165, 42, 42) 0%, rgb(140, 30, 30) 100%);
        color: white;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        flex-shrink: 0;
      }
      
      .file-name {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: #666;
        font-family: 'Courier New', monospace;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    
    .reply-btn-code,
    .favorite-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: 1px solid #d0d0d0;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      color: #666;
      transition: all 0.2s;
      flex-shrink: 0;
      
      &:hover {
        background: #f5f5f5;
        border-color: rgb(165, 42, 42);
        color: rgb(165, 42, 42);
      }
    }
    
    .favorite-btn {
      &.favorited {
        background: #fef3c7;
        border-color: #fbbf24;
        color: #f59e0b;
      }
      
      &:hover {
        background: #fef3c7;
        border-color: #fbbf24;
        color: #f59e0b;
      }
    }
    
    .run-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: 1px solid rgba(165, 42, 42, 0.3);
      background: linear-gradient(135deg, rgb(165, 42, 42) 0%, rgb(140, 30, 30) 100%);
      color: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
      font-weight: 500;
      flex-shrink: 0;
      
      &:hover:not(:disabled) {
        background: linear-gradient(135deg, rgb(140, 30, 30) 0%, rgb(120, 20, 20) 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(165, 42, 42, 0.4);
      }
      
      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
      
      &.running {
        background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
      }
      
      .spin {
        animation: spin 1s linear infinite;
      }
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .copy-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: 1px solid #d0d0d0;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      color: #666;
      transition: all 0.2s;
      font-weight: 500;
      flex-shrink: 0;
      
      &:hover {
        background: #f5f5f5;
        border-color: rgb(165, 42, 42);
        color: rgb(165, 42, 42);
      }
      
      &.copied {
        background: #4caf50;
        color: white;
        border-color: #4caf50;
      }
    }
  }
  
  .code-body {
    position: relative;
    background: #1e1e1e;
    border-radius: 0 0 8px 8px;
    overflow: hidden;
    display: flex;
    
    .line-numbers {
      display: flex;
      flex-direction: column;
      padding: 16px 8px;
      background: #252525;
      border-right: 1px solid #3a3a3a;
      user-select: none;
      
      .line-number {
        font-family: 'Courier New', 'Consolas', monospace;
        font-size: 12px;
        line-height: 1.6;
        color: #858585;
        text-align: right;
        min-width: 30px;
      }
    }
    
    pre {
      flex: 1;
      margin: 0;
      padding: 16px;
      overflow-x: auto;
      background: #1e1e1e;
      
      code {
        font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
        font-size: 13px;
        line-height: 1.6;
        
        // highlight.js 样式会自动应用
      }
    }
  }
  
  .code-description {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 12px 16px;
    background: #f8f9fa;
    border-radius: 8px;
    font-size: 14px;
    color: #333;
    line-height: 1.5;
    border-left: 3px solid rgb(165, 42, 42);
    
    svg {
      flex-shrink: 0;
      margin-top: 2px;
      color: rgb(165, 42, 42);
    }
  }
  
  .execution-result {
    margin-top: 12px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e0e0e0;
    background: white;
    
    .result-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: linear-gradient(135deg, rgb(165, 42, 42) 0%, rgb(140, 30, 30) 100%);
      color: white;
      font-size: 13px;
      font-weight: 600;
      
      .execution-time {
        margin-left: auto;
        font-size: 11px;
        opacity: 0.9;
        background: rgba(255, 255, 255, 0.2);
        padding: 2px 8px;
        border-radius: 4px;
      }
      
      .close-result-btn {
        width: 24px;
        height: 24px;
        border: none;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        transition: all 0.2s;
        
        &:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      }
    }
    
    .result-body {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 400px;
      overflow-y: auto;
      
      .output-section {
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid #e0e0e0;
        
        &.warning {
          border-color: #fbbf24;
          
          .output-label {
            background: #fef3c7;
            color: #92400e;
          }
        }
        
        &.error {
          border-color: #ef4444;
          
          .output-label {
            background: #fee2e2;
            color: #991b1b;
          }
        }
        
        .output-label {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #f3f4f6;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: rgb(165, 42, 42);
        }
        
        .output-content {
          margin: 0;
          padding: 12px;
          background: #1e1e1e;
          color: #d4d4d4;
          font-family: 'Courier New', 'Consolas', monospace;
          font-size: 12px;
          line-height: 1.5;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-word;
        }
      }
    }
  }
}
</style>
