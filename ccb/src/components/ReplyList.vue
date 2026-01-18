<template>
  <div v-if="visible" class="reply-list-overlay" @click.self="$emit('close')">
    <div class="reply-list-panel">
      <div class="panel-header">
        <div class="header-info">
          <MessageCircle :size="20" />
          <h3>回复列表</h3>
          <span class="reply-count">{{ replies.length }} 条回复</span>
          <!-- 显示问题状态 -->
          <span v-if="questionMessage?.isQuestion" class="question-status-indicator" :class="questionMessage.questionStatus">
            {{ questionMessage.questionStatus === 'solved' ? '✓ 已解决' : '○ 未解决' }}
          </span>
        </div>
        <button @click="$emit('close')" class="close-btn">×</button>
      </div>
      
      <div class="panel-body">
        <div v-if="replies.length === 0" class="empty-state">
          <MessageCircle :size="48" />
          <p>暂无回复</p>
        </div>
        
        <div v-else class="reply-item-list">
          <div 
            v-for="reply in replies" 
            :key="reply._id"
            class="reply-item"
            :class="{ 'is-solution': isSolutionForThisQuestion(reply) }"
          >
            <!-- 解决方案标记 -->
            <div v-if="isSolutionForThisQuestion(reply)" class="solution-badge">
              <CheckCircle :size="16" />
              <span>✓ 解决方案</span>
            </div>
            
            <div class="reply-header">
              <img 
                v-if="reply.fromAvatar"
                :src="reply.fromAvatar.startsWith('http') ? reply.fromAvatar : baseUrl + reply.fromAvatar" 
                class="user-avatar"
                @error="e => e.target.style.display = 'none'"
              />
              <div v-else class="user-avatar-placeholder">
                {{ (reply.fromName || '?')[0].toUpperCase() }}
              </div>
              <div class="reply-info">
                <span class="user-name">{{ reply.fromName }}</span>
                <span class="reply-time">{{ formatTime(reply.time || reply.createdAt) }}</span>
              </div>
              
              <!-- 点赞数 -->
              <div v-if="reply.upvoteCount > 0" class="upvote-badge">
                <ThumbsUp :size="14" />
                <span>{{ reply.upvoteCount }}</span>
              </div>
            </div>
            
            <div class="reply-content">
              {{ reply.content }}
            </div>
            
            <div class="reply-actions">
              <button @click="$emit('jump', reply._id)" class="action-btn">
                <ArrowRight :size="14" />
                <span>跳转到消息</span>
              </button>
              
              <!-- 标记为解决方案（仅提问者可见，且问题未解决时） -->
              <button 
                v-if="canMarkSolution && (!questionMessage.questionStatus || questionMessage.questionStatus !== 'solved')"
                @click="$emit('mark-solution', reply._id)" 
                class="action-btn solution-btn"
                title="标记此回复为解决方案"
              >
                <CheckCircle :size="14" />
                <span>标记为解决方案</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { MessageCircle, ThumbsUp, ArrowRight, CheckCircle } from 'lucide-vue-next'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  replies: {
    type: Array,
    default: () => []
  },
  questionMessage: {
    type: Object,
    default: null
  },
  currentUserId: {
    type: String,
    required: true
  }
})

defineEmits(['close', 'jump', 'mark-solution'])

const baseUrl = import.meta.env.VITE_BASE_URL

const canMarkSolution = computed(() => {
  // 只有问题的提问者可以标记解决方案
  const isQuestionOwner = props.questionMessage?.isQuestion && 
         String(props.questionMessage.from) === String(props.currentUserId)
  
  console.log('🔍 canMarkSolution check:', {
    isQuestion: props.questionMessage?.isQuestion,
    questionFrom: props.questionMessage?.from,
    currentUserId: props.currentUserId,
    isOwner: isQuestionOwner
  })
  
  return isQuestionOwner
})

function isBestAnswer(reply) {
  return false // 已移除最佳答案功能
}

function isSolutionForThisQuestion(reply) {
  // 检查这个回复是否是当前问题的解决方案
  return reply.isSolution && reply.solutionTo === props.questionMessage?._id
}

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
</script>

<style scoped lang="scss">
.reply-list-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.reply-list-panel {
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e8e8;
  
  .header-info {
    display: flex;
    align-items: center;
    gap: 12px;
    
    svg {
      color: rgb(165, 42, 42);
    }
    
    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
    
    .reply-count {
      font-size: 12px;
      color: #999;
      background: #f0f0f0;
      padding: 2px 8px;
      border-radius: 10px;
    }
    
    .question-status-indicator {
      font-size: 12px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 12px;
      
      &.open {
        color: #1a7f37;
        background: #ffffff;
        border: 1px solid #1a7f37;
      }
      
      &.solved {
        color: #ffffff;
        background: #8250df;
        border: 1px solid #8250df;
      }
    }
  }
  
  .close-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: #999;
    font-size: 28px;
    line-height: 1;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s;
    
    &:hover {
      background: #f5f5f5;
      color: #333;
    }
  }
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #d0d0d0;
    border-radius: 3px;
    
    &:hover {
      background: #b0b0b0;
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
  
  svg {
    margin-bottom: 16px;
    opacity: 0.5;
  }
  
  p {
    margin: 0;
    font-size: 14px;
  }
}

.reply-item-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reply-item {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  transition: all 0.2s;
  position: relative;
  
  &:hover {
    border-color: rgb(165, 42, 42);
    box-shadow: 0 2px 8px rgba(165, 42, 42, 0.1);
  }
  
  &.is-solution {
    background: linear-gradient(135deg, #f0e7ff 0%, #f5f0ff 100%);
    border-color: #8250df;
    box-shadow: 0 2px 12px rgba(130, 80, 223, 0.15);
  }
  
  &.is-best {
    background: #f8f9fa;
    border-color: #e0e0e0;
  }
  
  .solution-badge {
    position: absolute;
    top: -10px;
    right: 16px;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    background: linear-gradient(135deg, #8250df 0%, #7c3aed 100%);
    color: white;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(130, 80, 223, 0.3);
  }
  
  .reply-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    
    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .user-avatar-placeholder {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgb(165, 42, 42) 0%, rgb(140, 30, 30) 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
    }
    
    .reply-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      
      .user-name {
        font-size: 13px;
        font-weight: 600;
        color: #333;
      }
      
      .reply-time {
        font-size: 11px;
        color: #999;
      }
    }
    
    .upvote-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: rgba(165, 42, 42, 0.1);
      border-radius: 12px;
      color: rgb(165, 42, 42);
      font-size: 12px;
      font-weight: 600;
    }
  }
  
  .reply-content {
    font-size: 14px;
    line-height: 1.6;
    color: #333;
    margin-bottom: 12px;
    white-space: pre-wrap;
    word-break: break-word;
  }
  
  .reply-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    
    .action-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      border: 1px solid #e0e0e0;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      color: #666;
      transition: all 0.2s;
      
      &:hover {
        background: #f5f5f5;
        border-color: rgb(165, 42, 42);
        color: rgb(165, 42, 42);
        transform: translateY(-1px);
      }
      
      &.solution-btn {
        background: linear-gradient(135deg, #8250df 0%, #7c3aed 100%);
        color: white;
        border-color: #8250df;
        
        &:hover {
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
          border-color: #6d28d9;
          box-shadow: 0 2px 8px rgba(130, 80, 223, 0.3);
        }
      }
    }
  }
}
</style>
