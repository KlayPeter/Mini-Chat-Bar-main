<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="text-selection-toolbar"
      :style="{ top: position.y + 'px', left: position.x + 'px' }"
      @mousedown.stop
    >
      <button class="toolbar-btn ai-btn" @click="handleAIExplain" title="AI 解释">
        <Sparks class="btn-icon" />
        <span>AI</span>
      </button>
      <button class="toolbar-btn quote-btn" @click="handleQuote" title="引用回复">
        <ChatBubbleQuestion class="btn-icon" />
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Sparks, ChatBubbleQuestion } from '@iconoir/vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  selectedText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['ai-explain', 'quote', 'close'])

function handleAIExplain() {
  emit('ai-explain', props.selectedText)
  emit('close')
}

function handleQuote() {
  emit('quote', props.selectedText)
  emit('close')
}
</script>

<style scoped lang="scss">
.text-selection-toolbar {
  position: fixed;
  z-index: 9999;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 6px;
  display: flex;
  gap: 4px;
  animation: fadeInUp 0.2s ease;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.2s ease;
  white-space: nowrap;

  .btn-icon {
    width: 16px;
    height: 16px;
    stroke-width: 2;
  }

  &:hover {
    background: #f5f5f5;
    color: #333;
  }

  &.ai-btn {
    color: var(--primary-color, coral);
    font-weight: 500;

    &:hover {
      background: rgba(var(--primary-rgb, 255, 127, 80), 0.1);
      color: var(--primary-color, coral);
    }
  }

  &.quote-btn {
    &:hover {
      background: rgba(var(--primary-rgb, 255, 127, 80), 0.1);
      color: var(--primary-color, coral);
    }
  }
}
</style>
