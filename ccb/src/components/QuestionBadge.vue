<template>
  <div class="question-badge-container">
    <!-- 问题标记 -->
    <div v-if="message.isQuestion" class="question-badge" :class="statusClass">
      <HelpCircle :size="14" />
      <span>{{ statusText }}</span>
      <CheckCircle v-if="message.questionStatus === 'solved'" :size="14" class="solved-icon" />
    </div>
    
    <!-- 最佳答案标记 -->
    <div v-if="isBestAnswer" class="best-answer-badge">
      <Award :size="14" />
      <span>最佳答案</span>
    </div>
    
    <!-- 答案标记 -->
    <div v-else-if="message.isSolution" class="solution-badge">
      <MessageSquare :size="14" />
      <span>答案</span>
    </div>
    
    <!-- 点赞数 -->
    <div v-if="message.upvoteCount > 0" class="upvote-count">
      <ThumbsUp :size="14" />
      <span>{{ message.upvoteCount }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { HelpCircle, CheckCircle, Award, MessageSquare, ThumbsUp } from 'lucide-vue-next'

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  isBestAnswer: {
    type: Boolean,
    default: false
  }
})

const statusClass = computed(() => {
  if (!props.message.isQuestion) return ''
  return `status-${props.message.questionStatus || 'open'}`
})

const statusText = computed(() => {
  if (!props.message.isQuestion) return ''
  const statusMap = {
    open: '未解决',
    solved: '已解决',
    closed: '已关闭'
  }
  return statusMap[props.message.questionStatus] || '问题'
})
</script>

<style scoped lang="scss">
.question-badge-container {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.question-badge,
.best-answer-badge,
.solution-badge,
.upvote-count {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.question-badge {
  background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%);
  color: #856404;
  border: 1px solid #ffc107;
  
  &.status-solved {
    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
    color: #155724;
    border: 1px solid #28a745;
  }
  
  &.status-closed {
    background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
    color: #721c24;
    border: 1px solid #dc3545;
  }
  
  .solved-icon {
    color: #28a745;
  }
}

.best-answer-badge {
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  color: #856404;
  border: 1px solid #ffc107;
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.4);
  animation: shine 2s infinite;
}

@keyframes shine {
  0%, 100% {
    box-shadow: 0 2px 8px rgba(255, 215, 0, 0.4);
  }
  50% {
    box-shadow: 0 2px 12px rgba(255, 215, 0, 0.6);
  }
}

.solution-badge {
  background: linear-gradient(135deg, #e7f3ff 0%, #d1ecf1 100%);
  color: #004085;
  border: 1px solid #b8daff;
}

.upvote-count {
  background: linear-gradient(135deg, rgba(165, 42, 42, 0.1) 0%, rgba(165, 42, 42, 0.05) 100%);
  color: rgb(165, 42, 42);
  border: 1px solid rgba(165, 42, 42, 0.2);
}
</style>
