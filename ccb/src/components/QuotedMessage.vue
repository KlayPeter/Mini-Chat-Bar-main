<template>
  <div 
    v-if="quotedMessage" 
    class="quoted-message"
    @click="$emit('jump-to', quotedMessage.id)"
  >
    <div class="quote-indicator"></div>
    <div class="quote-content">
      <div class="quote-header">
        <span class="quote-author">{{ quotedMessage.fromName }}</span>
        <span class="quote-type">{{ messageTypeText }}</span>
      </div>
      <div class="quote-text">
        {{ displayContent }}
      </div>
    </div>
    <button 
      v-if="canRemove"
      @click.stop="$emit('remove')" 
      class="remove-quote-btn"
      title="移除引用"
    >
      <X :size="14" />
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  quotedMessage: {
    type: Object,
    default: null
  },
  canRemove: {
    type: Boolean,
    default: false
  }
})

defineEmits(['jump-to', 'remove'])

const messageTypeText = computed(() => {
  const typeMap = {
    text: '文本',
    code: '代码',
    image: '图片',
    file: '文件',
    video: '视频'
  }
  return typeMap[props.quotedMessage?.messageType] || ''
})

const displayContent = computed(() => {
  if (!props.quotedMessage) return ''
  const content = props.quotedMessage.content || ''
  return content.length > 100 ? content.substring(0, 100) + '...' : content
})
</script>

<style scoped lang="scss">
.quoted-message {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #e9ecef;
    
    .quote-indicator {
      background: rgb(165, 42, 42);
    }
  }
  
  .quote-indicator {
    width: 3px;
    height: 100%;
    background: rgb(165, 42, 42);
    border-radius: 2px;
    flex-shrink: 0;
    transition: all 0.2s;
  }
  
  .quote-content {
    flex: 1;
    min-width: 0;
    
    .quote-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
      
      .quote-author {
        font-size: 12px;
        font-weight: 600;
        color: rgb(165, 42, 42);
      }
      
      .quote-type {
        font-size: 11px;
        color: #999;
        padding: 2px 6px;
        background: white;
        border-radius: 4px;
      }
    }
    
    .quote-text {
      font-size: 13px;
      color: #666;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  
  .remove-quote-btn {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    border: none;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    transition: all 0.2s;
    
    &:hover {
      background: rgba(0, 0, 0, 0.2);
      color: #333;
    }
  }
}
</style>
