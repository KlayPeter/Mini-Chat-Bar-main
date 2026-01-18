<template>
  <div class="message-content-wrapper">
    <span v-for="(part, index) in parsedContent" :key="index">
      <!-- 普通文本 -->
      <template v-if="part.type === 'text'">{{ part.content }}</template>
      
      <!-- GitHub 链接 -->
      <a 
        v-else-if="part.type === 'github'" 
        :href="part.url" 
        target="_blank" 
        rel="noopener noreferrer"
        class="code-link github-link"
        @click.stop
      >
        <Github :size="14" />
        <span>{{ part.display }}</span>
        <ExternalLink :size="12" />
      </a>
      
      <!-- StackOverflow 链接 -->
      <a 
        v-else-if="part.type === 'stackoverflow'" 
        :href="part.url" 
        target="_blank" 
        rel="noopener noreferrer"
        class="code-link stackoverflow-link"
        @click.stop
      >
        <MessageSquare :size="14" />
        <span>{{ part.display }}</span>
        <ExternalLink :size="12" />
      </a>
      
      <!-- 其他链接 -->
      <a 
        v-else-if="part.type === 'link'" 
        :href="part.url" 
        target="_blank" 
        rel="noopener noreferrer"
        class="normal-link"
        @click.stop
      >
        {{ part.display }}
        <ExternalLink :size="12" />
      </a>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Github, MessageSquare, ExternalLink } from 'lucide-vue-next'

const props = defineProps({
  content: {
    type: String,
    required: true
  }
})

// 解析文本内容，识别链接
const parsedContent = computed(() => {
  const text = props.content
  const parts = []
  
  // 匹配 URL 的正则表达式
  const urlRegex = /(https?:\/\/[^\s]+)/g
  
  let lastIndex = 0
  let match
  
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0]
    const startIndex = match.index
    
    // 添加 URL 之前的文本
    if (startIndex > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, startIndex)
      })
    }
    
    // 判断链接类型
    if (url.includes('github.com')) {
      parts.push({
        type: 'github',
        url: url,
        display: extractGithubInfo(url)
      })
    } else if (url.includes('stackoverflow.com') || url.includes('stackexchange.com')) {
      parts.push({
        type: 'stackoverflow',
        url: url,
        display: extractStackOverflowInfo(url)
      })
    } else {
      parts.push({
        type: 'link',
        url: url,
        display: url.length > 50 ? url.substring(0, 47) + '...' : url
      })
    }
    
    lastIndex = startIndex + url.length
  }
  
  // 添加剩余文本
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    })
  }
  
  return parts.length > 0 ? parts : [{ type: 'text', content: text }]
})

// 提取 GitHub 信息
function extractGithubInfo(url) {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter(p => p)
    
    if (pathParts.length >= 2) {
      const owner = pathParts[0]
      const repo = pathParts[1]
      
      // 如果是 issue 或 PR
      if (pathParts.length >= 4 && (pathParts[2] === 'issues' || pathParts[2] === 'pull')) {
        const type = pathParts[2] === 'issues' ? 'Issue' : 'PR'
        const number = pathParts[3]
        return `${owner}/${repo}#${number} (${type})`
      }
      
      // 如果是文件
      if (pathParts.length >= 4 && pathParts[2] === 'blob') {
        return `${owner}/${repo}/${pathParts.slice(3).join('/')}`
      }
      
      // 普通仓库链接
      return `${owner}/${repo}`
    }
    
    return 'GitHub'
  } catch (e) {
    return 'GitHub'
  }
}

// 提取 StackOverflow 信息
function extractStackOverflowInfo(url) {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter(p => p)
    
    if (pathParts.length >= 2 && pathParts[0] === 'questions') {
      const questionId = pathParts[1]
      return `SO #${questionId}`
    }
    
    return 'StackOverflow'
  } catch (e) {
    return 'StackOverflow'
  }
}
</script>

<style scoped lang="scss">
.message-content-wrapper {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.code-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
  margin: 0 2px;
  
  &.github-link {
    background: linear-gradient(135deg, #24292e 0%, #1a1e22 100%);
    color: white;
    border: 1px solid #24292e;
    
    &:hover {
      background: linear-gradient(135deg, #1a1e22 0%, #0d1117 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(36, 41, 46, 0.3);
    }
  }
  
  &.stackoverflow-link {
    background: linear-gradient(135deg, #f48024 0%, #e67422 100%);
    color: white;
    border: 1px solid #f48024;
    
    &:hover {
      background: linear-gradient(135deg, #e67422 0%, #d86820 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(244, 128, 36, 0.3);
    }
  }
  
  svg {
    flex-shrink: 0;
  }
  
  span {
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.normal-link {
  color: rgb(165, 42, 42);
  text-decoration: none;
  border-bottom: 1px solid rgba(165, 42, 42, 0.3);
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  
  &:hover {
    border-bottom-color: rgb(165, 42, 42);
    color: rgb(140, 30, 30);
  }
  
  svg {
    flex-shrink: 0;
  }
}
</style>
