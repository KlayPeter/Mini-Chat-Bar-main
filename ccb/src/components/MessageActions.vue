<template>
  <div class="message-actions">
    <!-- 回复 -->
    <button @click="$emit('reply')" class="action-btn" title="回复">
      <MessageCircle :size="16" />
      <span>回复</span>
    </button>
    
    <!-- 标记为问题（仅自己的消息且不是问题时显示） -->
    <button 
      v-if="canMarkQuestion"
      @click="$emit('mark-question')" 
      class="action-btn question-btn"
      title="标记为问题"
    >
      <HelpCircle :size="16" />
      <span>标记问题</span>
    </button>
    
    <!-- 收藏 -->
    <button 
      @click="$emit('favorite')" 
      class="action-btn favorite-btn"
      :class="{ active: isFavorited }"
      title="收藏"
    >
      <Star :size="16" :fill="isFavorited ? 'currentColor' : 'none'" />
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { MessageCircle, HelpCircle, CheckCircle, Star } from 'lucide-vue-next'

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
  isFavorited: {
    type: Boolean,
    default: false
  }
})

defineEmits(['reply', 'mark-question', 'favorite'])

const canMarkQuestion = computed(() => {
  return props.isMyMessage && !props.message.isQuestion && props.message.messageType === 'text'
})
</script>

<style scoped lang="scss">
.message-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
  opacity: 0;
  transition: opacity 0.2s;
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
  
  &.question-btn {
    &:hover {
      background: #fff3cd;
      border-color: #ffc107;
      color: #856404;
    }
  }
  
  &.solved-btn {
    &:hover {
      background: #d4edda;
      border-color: #28a745;
      color: #155724;
    }
  }
  
  &.favorite-btn {
    &.active {
      background: rgba(165, 42, 42, 0.1);
      border-color: rgb(165, 42, 42);
      color: rgb(165, 42, 42);
    }
  }
}
</style>
