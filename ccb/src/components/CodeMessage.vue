<template>
  <div class="code-message" :class="{ 'is-mine': isMyMessage }">
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
        <button @click="copyCode" class="copy-btn" :class="{ copied }">
          <Check v-if="copied" :size="16" />
          <Copy v-else :size="16" />
          <span>{{ copied ? '已复制' : '复制代码' }}</span>
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
import { ref, computed, onMounted } from 'vue'
import { Copy, Check, FileCode, MessageCircle } from 'lucide-vue-next'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
// 导入常用语言支持
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-php'
import 'prismjs/components/prism-ruby'
import 'prismjs/components/prism-swift'
import 'prismjs/components/prism-kotlin'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-bash'

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

const emit = defineEmits(['reply'])

const baseUrl = import.meta.env.VITE_BASE_URL
const copied = ref(false)

// 获取头像 URL（处理完整 URL 和相对路径）
const avatarUrl = computed(() => {
  const avatar = props.isMyMessage ? props.myAvatar : props.message.fromAvatar
  if (!avatar) return ''
  // 如果是完整 URL，直接返回
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar
  }
  // 否则加上 baseUrl
  return baseUrl + avatar
})

// 调试日志
console.log('🎨 CodeMessage 组件数据:', {
  isMyMessage: props.isMyMessage,
  myAvatar: props.myAvatar,
  fromName: props.message.fromName,
  fromAvatar: props.message.fromAvatar,
  messageType: props.message.messageType,
  avatarUrl: avatarUrl.value
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
    json: 'JSON'
  }
  return langMap[lang] || lang.toUpperCase()
})

const highlightedCode = computed(() => {
  const code = props.message.codeInfo?.code || ''
  const language = props.message.codeInfo?.language || 'javascript'
  
  try {
    return Prism.highlight(code, Prism.languages[language] || Prism.languages.javascript, language)
  } catch (e) {
    return code
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
    
    .reply-btn-code {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      border: 1px solid #d0d0d0;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      color: #666;
      transition: all 0.2s;
      flex-shrink: 0;
      
      &:hover {
        background: #f5f5f5;
        border-color: rgb(165, 42, 42);
        color: rgb(165, 42, 42);
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
        color: #d4d4d4;
        
        // 确保 Prism 高亮样式生效
        &[class*="language-"] {
          color: #d4d4d4;
          text-shadow: none;
        }
      }
    }
  }
  
  // 增强 Prism 高亮颜色
  :deep(.token) {
    &.comment,
    &.prolog,
    &.doctype,
    &.cdata {
      color: #6a9955;
    }
    
    &.punctuation {
      color: #d4d4d4;
    }
    
    &.property,
    &.tag,
    &.boolean,
    &.number,
    &.constant,
    &.symbol,
    &.deleted {
      color: #b5cea8;
    }
    
    &.selector,
    &.attr-name,
    &.string,
    &.char,
    &.builtin,
    &.inserted {
      color: #ce9178;
    }
    
    &.operator,
    &.entity,
    &.url {
      color: #d4d4d4;
    }
    
    &.atrule,
    &.attr-value,
    &.keyword {
      color: #c586c0;
    }
    
    &.function,
    &.class-name {
      color: #dcdcaa;
    }
    
    &.regex,
    &.important,
    &.variable {
      color: #d16969;
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
