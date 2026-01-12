<template>
  <div
    v-if="show"
    class="message-context-menu"
    :style="{ left: x + 'px', top: y + 'px' }"
    @click.stop
  >
    <!-- 多选模式 -->
    <div v-if="!selectionMode" class="context-menu-item" @click="$emit('enter-selection-mode')">
      <i><Check class="menu-icon" /></i>
      <span>多选</span>
    </div>

    <!-- 转发消息 -->
    <div class="context-menu-item" @click="$emit('forward-message', message)">
      <i><Send class="menu-icon" /></i>
      <span>转发</span>
    </div>

    <!-- 下载文件 (仅文件/图片消息) -->
    <div
      v-if="canDownloadFile"
      class="context-menu-item"
      @click="$emit('download-file', message.fileInfo)"
    >
      <i><Download class="menu-icon" /></i>
      <span>下载</span>
    </div>

    <!-- 复制文本 (仅文本消息) -->
    <div
      v-if="message.messageType === 'text' || !message.messageType"
      class="context-menu-item"
      @click="copyText"
    >
      <i><Copy class="menu-icon" /></i>
      <span>复制</span>
    </div>

    <!-- 撤回消息 (仅自己的消息且时间在2分钟内) -->
    <div
      v-if="canRecallMessage"
      class="context-menu-item"
      @click="$emit('recall-message', messageIndex)"
    >
      <i><Undo class="menu-icon" /></i>
      <span>撤回</span>
    </div>

    <!-- 删除消息 -->
    <div class="context-menu-item delete" @click="$emit('delete-message', messageIndex)">
      <i><Trash class="menu-icon" /></i>
      <span>删除</span>
    </div>

    <!-- 引用回复 (群聊和私聊) -->
    <div
      v-if="messageType !== 'ai'"
      class="context-menu-item"
      @click="$emit('quote-reply', message)"
    >
      <i><ChatBubble class="menu-icon" /></i>
      <span>引用</span>
    </div>

  </div>

  <!-- 遮罩层 -->
  <div v-if="show" class="context-menu-overlay" @click="$emit('close')"></div>
</template>

<script setup>
import { computed } from 'vue'
import { Check, Send, Download, Copy, Undo, Trash, ChatBubble } from '@iconoir/vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  x: {
    type: Number,
    default: 0
  },
  y: {
    type: Number,
    default: 0
  },
  message: {
    type: Object,
    default: null
  },
  messageIndex: {
    type: Number,
    default: -1
  },
  messageType: {
    type: String,
    default: 'normal' // 'normal', 'group', 'ai'
  },
  selectionMode: {
    type: Boolean,
    default: false
  },
  currentUserId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits([
  'close',
  'enter-selection-mode',
  'forward-message',
  'download-file',
  'delete-message',
  'recall-message',
  'quote-reply',
])

// 是否可以下载文件
const canDownloadFile = computed(() => {
  return props.message?.fileInfo && 
         (props.message.messageType === 'image' || 
          props.message.messageType === 'file' ||
          props.message.messageType === 'voice')
})

// 是否可以撤回消息
const canRecallMessage = computed(() => {
  if (!props.message) return false
  
  // 只能撤回自己的消息
  const isMyMessage = props.messageType === 'ai' 
    ? props.message.from === 'user'
    : props.messageType === 'group'
    ? String(props.message.from) === String(props.currentUserId)
    : props.message.from !== props.message.to
  
  if (!isMyMessage) return false
  
  // 检查时间是否在2分钟内
  const messageTime = new Date(props.message.time)
  const now = new Date()
  const diffMinutes = (now - messageTime) / (1000 * 60)
  
  return diffMinutes <= 2
})

// 复制文本
async function copyText() {
  if (!props.message?.content) return
  
  try {
    await navigator.clipboard.writeText(props.message.content)
    // 可以通过事件通知父组件显示成功提示
    emit('copy-success', props.message.content)
  } catch (err) {
    console.error('复制失败:', err)
    // 降级方案：使用传统方法
    const textArea = document.createElement('textarea')
    textArea.value = props.message.content
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }
  
  emit('close')
}
</script>

<style scoped lang="scss">
.message-context-menu {
  position: fixed;
  background: var(--bg-tertiary, white);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  min-width: 140px;
  padding: 8px 0;
  font-size: 14px;

  .context-menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    cursor: pointer;
    transition: background-color 0.2s ease;
    user-select: none;

    &:hover {
      background-color: #f5f5f5;
    }

    &.delete {
      color: #ff4d4f;

      &:hover {
        background-color: #fff1f0;
      }
    }

    i {
      font-size: 16px;
      width: 20px;
      text-align: center;
      font-style: normal;
      display: flex;
      align-items: center;
      justify-content: center;

      .menu-icon {
        width: 16px;
        height: 16px;
        stroke-width: 1.5;
      }
    }

    span {
      flex: 1;
      font-size: 14px;
    }
  }

  /* 分隔线 */
  .context-menu-item + .context-menu-item {
    border-top: 1px solid #f0f0f0;
  }

  /* 危险操作前添加分隔线 */
  .context-menu-item.delete {
    border-top: 1px solid #f0f0f0;
    margin-top: 4px;
    padding-top: 12px;
  }
}

.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: transparent;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .message-context-menu {
    min-width: 160px;
    font-size: 16px;

    .context-menu-item {
      padding: 12px 20px;

      i {
        font-size: 18px;
        width: 24px;
      }

      span {
        font-size: 16px;
      }
    }
  }
}

/* 防止菜单超出屏幕 */
@media (max-height: 600px) {
  .message-context-menu {
    max-height: 300px;
    overflow-y: auto;
  }
}
</style>
