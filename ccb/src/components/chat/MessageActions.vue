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
      <span>提问</span>
    </button>

    <!-- 标记最佳答案（仅问题作者可见） -->
    <button
      v-if="canMarkBestAnswer"
      @click="$emit('mark-best-answer')"
      class="action-btn best-answer-btn"
      title="标记为最佳答案"
    >
      <Award :size="16" />
      <span>最佳</span>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { MessageCircle, HelpCircle, Award } from 'lucide-vue-next'

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
  questionAuthorId: {
    type: String,
    default: null
  }
})

defineEmits(['reply', 'mark-question', 'mark-best-answer'])

const canMarkQuestion = computed(() => {
  return props.isMyMessage && !props.message.isQuestion && props.message.messageType === 'text'
})

const canMarkBestAnswer = computed(() => {
  // 只有当消息是答案，且当前用户是问题作者时才显示
  return props.message.isSolution &&
         props.questionAuthorId &&
         props.currentUserId === props.questionAuthorId &&
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
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
  transition: all 0.2s;

  &:hover {
    background: var(--hover-bg);
    border-color: var(--primary-color);
    color: var(--primary-color);
    transform: translateY(-1px);
  }

  &.question-btn:hover {
    background: #fff3cd;
    border-color: #ffc107;
    color: #856404;
  }

  &.solution-btn:hover {
    background: #d4edda;
    border-color: #28a745;
    color: #155724;
  }

  &.best-answer-btn:hover {
    background: #fff3cd;
    border-color: #ffc107;
    color: #856404;
  }

  &.upvote-btn {
    &.active {
      background: rgba(165, 42, 42, 0.1);
      border-color: var(--primary-color);
      color: var(--primary-color);
    }
  }
}
</style>
