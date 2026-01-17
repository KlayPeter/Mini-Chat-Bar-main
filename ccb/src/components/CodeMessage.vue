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
        <span>{{ message.content }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Copy, Check, FileCode, MessageCircle, Star } from 'lucide-vue-next'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'

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
</script>

<style scoped lang="scss">
.code-message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: flex-start;
  
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
}
</style>
