<template>
  <div class="ai-message-wrapper">
    <div class="ai-message">
      <div class="ai-header">
        <div class="ai-avatar">
          <img src="/images/ds.jpg" alt="AI" />
          <span class="ai-badge">AI</span>
        </div>
        <div class="ai-info">
          <span class="ai-name">AI 助手</span>
          <span class="ai-time">{{ formatTime(message.time) }}</span>
        </div>
      </div>
      
      <!-- AI 内容 - 可展开/收起 -->
      <div class="ai-content-wrapper">
        <div 
          class="ai-content" 
          :class="{ collapsed: !isExpanded && isLongContent }"
          v-html="formattedContent"
        ></div>
        
        <!-- 展开/收起按钮 -->
        <button 
          v-if="isLongContent" 
          @click="isExpanded = !isExpanded" 
          class="expand-btn"
        >
          <ChevronDown :size="16" :class="{ rotated: isExpanded }" />
          {{ isExpanded ? '收起' : '展开全部' }}
        </button>
      </div>
      
      <!-- 来源信息 -->
      <div v-if="message.sources && message.sources.length > 0" class="ai-sources">
        <div class="sources-header" @click="showSources = !showSources">
          <Database :size="14" />
          <span>参考了 {{ message.sources.length }} 条历史讨论</span>
          <ChevronDown :size="14" :class="{ rotated: showSources }" />
        </div>
        <div v-if="showSources" class="sources-list">
          <div v-for="(source, index) in message.sources" :key="index" class="source-item">
            <div class="source-sender">{{ source.sender }}</div>
            <div class="source-content">{{ source.content }}</div>
            <div class="source-relevance">相关度: {{ Math.round(source.relevance * 100) }}%</div>
          </div>
        </div>
      </div>
      
      <!-- 操作按钮 -->
      <div class="ai-actions">
        <button @click="$emit('copy', message.content)" class="action-btn" title="复制">
          <Copy :size="16" />
        </button>
        <button @click="helpful = true" class="action-btn" :class="{ active: helpful }" title="有帮助">
          <ThumbsUp :size="16" />
        </button>
        <button @click="helpful = false" class="action-btn" :class="{ active: helpful === false }" title="没帮助">
          <ThumbsDown :size="16" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Database, ChevronDown, Copy, ThumbsUp, ThumbsDown } from 'lucide-vue-next'
import { marked } from 'marked'

const props = defineProps({
  message: {
    type: Object,
    required: true
  }
})

defineEmits(['copy'])

const showSources = ref(false)
const helpful = ref(null)
const isExpanded = ref(false)

// 判断内容是否过长（超过 500 字符）
const isLongContent = computed(() => {
  return (props.message.content || '').length > 500
})

const formattedContent = computed(() => {
  try {
    return marked(props.message.content || '')
  } catch (err) {
    return props.message.content || ''
  }
})

function formatTime(time) {
  if (!time) return ''
  const date = new Date(time)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped lang="scss">
.ai-message-wrapper {
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%);
  border-left: 3px solid #6366f1;
  margin: 12px 0;
  border-radius: 8px;
}

.ai-message {
  max-width: 100%;
}

.ai-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  
  .ai-avatar {
    position: relative;
    width: 40px;
    height: 40px;
    
    img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .ai-badge {
      position: absolute;
      bottom: -2px;
      right: -2px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 10px;
      border: 2px solid white;
    }
  }
  
  .ai-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    
    .ai-name {
      font-weight: 600;
      color: #6366f1;
      font-size: 14px;
    }
    
    .ai-time {
      font-size: 12px;
      color: #999;
    }
  }
}

.ai-content-wrapper {
  position: relative;
}

.ai-content {
  color: #333;
  line-height: 1.8;
  font-size: 14px;
  transition: max-height 0.3s ease;
  overflow: hidden;
  
  &.collapsed {
    max-height: 300px;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 80px;
      background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.95));
      pointer-events: none;
    }
  }
  
  :deep(pre) {
    background: #f5f5f5;
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 8px 0;
    
    code {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px;
    }
  }
  
  :deep(code) {
    background: #f0f0f0;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
    color: #e83e8c;
  }
  
  :deep(p) {
    margin: 8px 0;
  }
  
  :deep(ul), :deep(ol) {
    margin: 8px 0;
    padding-left: 24px;
  }
  
  :deep(li) {
    margin: 4px 0;
  }
  
  :deep(h1), :deep(h2), :deep(h3), :deep(h4) {
    margin: 16px 0 8px 0;
    font-weight: 600;
    color: #333;
  }
  
  :deep(h1) { font-size: 18px; }
  :deep(h2) { font-size: 16px; }
  :deep(h3) { font-size: 15px; }
  :deep(h4) { font-size: 14px; }
}

.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  padding: 8px;
  margin-top: 8px;
  border: 1px solid rgba(99, 102, 241, 0.3);
  background: white;
  border-radius: 6px;
  color: #6366f1;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  svg {
    transition: transform 0.2s;
    
    &.rotated {
      transform: rotate(180deg);
    }
  }
  
  &:hover {
    background: rgba(99, 102, 241, 0.05);
    border-color: #6366f1;
  }
}

.ai-sources {
  margin-top: 12px;
  border-top: 1px solid rgba(99, 102, 241, 0.2);
  padding-top: 12px;
  
  .sources-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #6366f1;
    cursor: pointer;
    user-select: none;
    
    svg {
      transition: transform 0.2s;
      
      &.rotated {
        transform: rotate(180deg);
      }
    }
    
    &:hover {
      color: #4f46e5;
    }
  }
  
  .sources-list {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .source-item {
    background: white;
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid rgba(99, 102, 241, 0.2);
    
    .source-sender {
      font-size: 12px;
      font-weight: 600;
      color: #6366f1;
      margin-bottom: 4px;
    }
    
    .source-content {
      font-size: 12px;
      color: #666;
      line-height: 1.5;
      margin-bottom: 4px;
    }
    
    .source-relevance {
      font-size: 11px;
      color: #999;
    }
  }
}

.ai-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  
  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px 12px;
    border: 1px solid #e0e0e0;
    background: white;
    border-radius: 6px;
    cursor: pointer;
    color: #666;
    transition: all 0.2s;
    
    &:hover {
      border-color: #6366f1;
      color: #6366f1;
      background: rgba(99, 102, 241, 0.05);
    }
    
    &.active {
      border-color: #6366f1;
      color: #6366f1;
      background: rgba(99, 102, 241, 0.1);
    }
  }
}
</style>
