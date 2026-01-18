<template>
  <div v-if="suggestions.length > 0" class="ai-insights-card">
    <div class="insights-header" @click="toggleExpand">
      <div class="header-left">
        <Sparkles :size="20" class="ai-icon" />
        <span class="title">AI 智能助手</span>
      </div>
      <button class="toggle-btn">
        <ChevronDown v-if="!isExpanded" :size="16" />
        <ChevronUp v-else :size="16" />
      </button>
    </div>
    
    <transition name="expand">
      <div v-if="isExpanded" class="insights-body">
        <div 
          v-for="(suggestion, index) in suggestions" 
          :key="index"
          class="suggestion-item"
          :class="`type-${suggestion.type}`"
        >
          <div class="suggestion-header">
            <span class="icon">{{ suggestion.icon }}</span>
            <span class="text">{{ suggestion.text }}</span>
          </div>
          
          <!-- 紧急问题列表 -->
          <div v-if="suggestion.type === 'urgent' && suggestion.questions" class="question-list">
            <div 
              v-for="q in suggestion.questions.slice(0, 3)" 
              :key="q.id"
              class="question-item"
              @click="$emit('jump-to-question', q.id)"
            >
              <div class="question-content">
                <span class="from">{{ q.fromName }}:</span>
                <span class="content">{{ q.content }}</span>
              </div>
              <div class="question-meta">
                <Clock :size="12" />
                <span>{{ q.minutesAgo }} 分钟前</span>
                <MessageCircle :size="12" />
                <span>{{ q.replyCount }} 回复</span>
              </div>
            </div>
          </div>
          
          <!-- AI 可帮助的问题 -->
          <div v-if="suggestion.type === 'ai_help' && suggestion.questions" class="ai-help-actions">
            <button 
              v-for="q in suggestion.questions.slice(0, 2)" 
              :key="q.id"
              class="help-btn"
              @click="$emit('ai-answer', q.id)"
            >
              <Bot :size="14" />
              <span>让 AI 回答: {{ q.content.substring(0, 30) }}...</span>
            </button>
          </div>
          
          <!-- 查看所有问题按钮 -->
          <button 
            v-if="suggestion.action === 'show_all'"
            class="action-btn"
            @click="$emit('show-all-questions')"
          >
            查看所有未解决问题
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Sparkles, ChevronDown, ChevronUp, Clock, MessageCircle, Bot } from 'lucide-vue-next'

const props = defineProps({
  suggestions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['jump-to-question', 'ai-answer', 'show-all-questions'])

const isExpanded = ref(true)

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}
</script>

<style scoped lang="scss">
.ai-insights-card {
  margin: 16px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.insights-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover {
    background: rgba(99, 102, 241, 0.05);
  }
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
    
    .ai-icon {
      color: #6366f1;
      animation: pulse 2s infinite;
    }
    
    .title {
      font-size: 14px;
      font-weight: 600;
      color: #6366f1;
    }
  }
  
  .toggle-btn {
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6366f1;
    transition: all 0.2s;
    
    &:hover {
      background: rgba(99, 102, 241, 0.1);
    }
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.insights-body {
  padding: 0 16px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  max-height: 500px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.suggestion-item {
  padding: 12px;
  background: white;
  border-radius: 8px;
  border-left: 3px solid #6366f1;
  
  &.type-urgent {
    border-left-color: #ef4444;
    background: linear-gradient(90deg, rgba(239, 68, 68, 0.05) 0%, white 100%);
  }
  
  &.type-ai_help {
    border-left-color: #8b5cf6;
    background: linear-gradient(90deg, rgba(139, 92, 246, 0.05) 0%, white 100%);
  }
  
  .suggestion-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    
    .icon {
      font-size: 16px;
    }
    
    .text {
      font-size: 13px;
      font-weight: 600;
      color: #333;
    }
  }
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.question-item {
  padding: 10px;
  background: #f8f9fa;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #e8e9ea;
    transform: translateX(2px);
  }
  
  .question-content {
    display: flex;
    gap: 6px;
    margin-bottom: 6px;
    font-size: 12px;
    
    .from {
      font-weight: 600;
      color: rgb(165, 42, 42);
      flex-shrink: 0;
    }
    
    .content {
      color: #333;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  
  .question-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #999;
    
    svg {
      flex-shrink: 0;
    }
  }
}

.ai-help-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.help-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  }
  
  svg {
    flex-shrink: 0;
  }
  
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.action-btn {
  width: 100%;
  padding: 8px 12px;
  background: white;
  border: 1px solid #6366f1;
  color: #6366f1;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
  margin-top: 8px;
  
  &:hover {
    background: #6366f1;
    color: white;
  }
}
</style>
