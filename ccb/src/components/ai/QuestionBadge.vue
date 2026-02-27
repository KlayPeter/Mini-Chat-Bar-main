<template>
  <div 
    class="question-status-badge" 
    :class="statusClass"
    @click="handleClick"
    :style="{ cursor: message.questionStatus === 'solved' ? 'pointer' : 'default' }"
  >
    <span class="status-icon">{{ statusIcon }}</span>
    <span class="status-text">{{ statusText }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  message: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['jump-to-solution'])

const statusClass = computed(() => {
  if (!props.message.isQuestion) return ''
  return props.message.questionStatus === 'solved' ? 'solved' : 'open'
})

const statusIcon = computed(() => {
  if (!props.message.isQuestion) return ''
  return props.message.questionStatus === 'solved' ? '✓' : '○'
})

const statusText = computed(() => {
  if (!props.message.isQuestion) return ''
  return props.message.questionStatus === 'solved' ? 'Solved' : 'Open'
})

function handleClick() {
  if (props.message.questionStatus === 'solved') {
    emit('jump-to-solution', props.message._id)
  }
}
</script>

<style scoped lang="scss">
.question-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid transparent;
  
  &.open {
    background: #ffffff;
    color: #1a7f37;
    border-color: #1a7f37;
    
    .status-icon {
      font-size: 14px;
      font-weight: bold;
    }
  }
  
  &.solved {
    background: #8250df;
    color: #ffffff;
    border-color: #8250df;
    
    .status-icon {
      font-size: 14px;
      font-weight: bold;
    }
  }
  
  .status-text {
    font-size: 12px;
    letter-spacing: 0.3px;
  }
}
</style>
