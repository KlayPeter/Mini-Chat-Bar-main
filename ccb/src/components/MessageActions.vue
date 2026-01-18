<template>
  <div class="message-actions">
    <!-- 点赞 -->
    <button 
      @click="$emit('upvote')" 
      class="action-btn" 
      :class="{ active: hasUpvoted }"
      title="点赞"
    >
      <ThumbsUp :size="16" :fill="hasUpvoted ? 'currentColor' : 'none'" />
      <span v-if="message.upvoteCount > 0">{{ message.upvoteCount }}</span>
    </button>
    
    <!-- 回复 -->
    <button @click="$emit('reply')" class="action-btn" title="回复">
      <MessageCircle :size="16" />
      <span>回复</span>
    </button>
    
    <!-- 标记为问题 -->
    <button 
      v-if="canMarkQuestion"
      @click="$emit('mark-question')" 
      class="action-btn question-btn"
      title="标记为问题"
    >
      <HelpCircle :size="16" />
      <span>标记问题</span>
    </button>
    
    <!-- 标记为答案 -->
    <button 
      v-if="showMarkSolution"
      @click="$emit('mark-solution')" 
      class="action-btn solution-btn"
      title="标记为答案"
    >
      <CheckCircle :size="16" />
      <span>标记答案</span>
    </button>
    
    <!-- 标记最佳答案 -->
    <button 
      v-if="canMarkBestAnswer"
      @click="$emit('mark-best-answer')" 
      class="action-btn best-answer-btn"
      title="标记为最佳答案"
    >
      <Award :size="16" />
      <span>最佳答案</span>
    </button>
    
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { MessageCircle, ThumbsUp, HelpCircle, CheckCircle, Award } from 'lucide-vue-next'

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  isMyMessage: {
    type: Boolean,
    default: false
  },
  currentUserId: {
    type: String,
    required: true
  },
  replyingToQuestion: {
    type: String,
    default: null
  }
})

defineEmits(['reply', 'upvote', 'mark-question', 'mark-solution', 'mark-best-answer'])

const hasUpvoted = computed(() => {
  return props.message.upvotes?.includes(props.currentUserId) || false
})

const canMarkQuestion = computed(() => {
  return props.isMyMessage && !props.message.isQuestion && props.message.messageType === 'text'
})

const showMarkSolution = computed(() => {
  return props.replyingToQuestion && !props.message.isSolution
})

const canMarkBestAnswer = computed(() => {
  // 只有提问者可以标记最佳答案
  return props.message.isSolution && 
         props.message.solutionTo && 
         !props.message.bestAnswer
})
</script>

<style scoped lang="scss">
.message-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.action-btn {
  display: inline-flex;
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
  
  &.active {
    background: rgba(165, 42, 42, 0.1);
    border-color: rgb(165, 42, 42);
    color: rgb(165, 42, 42);
  }
  
  &.question-btn {
    border-color: #ffc107;
    color: #856404;
    
    &:hover {
      background: #fff3cd;
      border-color: #ffc107;
    }
  }
  
  &.solution-btn {
    border-color: #17a2b8;
    color: #0c5460;
    
    &:hover {
      background: #d1ecf1;
      border-color: #17a2b8;
    }
  }
  
  &.best-answer-btn {
    border-color: #ffc107;
    color: #856404;
    background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%);
    
    &:hover {
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
      border-color: #ffc107;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(255, 193, 7, 0.3);
    }
  }
}
</style>
