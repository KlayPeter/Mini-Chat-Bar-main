<template>
  <div class="message-list" ref="messageListRef">
    <!-- 多选工具栏 -->
    <div v-if="selectionMode" class="selection-toolbar">
      <div class="selection-info">
        <button class="cancel-btn" @click="exitSelectionMode">
          <Xmark class="cancel-icon" />
        </button>
        <span class="selection-count">已选择 {{ selectedMessages.length }} 条消息</span>
      </div>
      <div class="selection-actions">
        <button 
          class="action-btn" 
          @click="selectAllMessages" 
          :disabled="selectedMessages.length === messages.length"
        >
          全选
        </button>
        <button 
          class="action-btn" 
          @click="clearSelection"
          :disabled="selectedMessages.length === 0"
        >
          清空
        </button>
        <button 
          class="action-btn forward-btn" 
          @click="handleForwardSelected"
          :disabled="selectedMessages.length === 0"
        >
          转发
        </button>
        <button 
          class="action-btn delete-btn" 
          @click="handleDeleteSelected"
          :disabled="selectedMessages.length === 0"
        >
          删除
        </button>
      </div>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <i class="spin"><Refresh class="loading-icon" /></i>
      <p>加载中...</p>
    </div>

    <!-- 空消息状态 -->
    <div v-else-if="messages.length === 0" class="empty-messages">
      <i><ChatBubble class="empty-icon" /></i>
      <p>{{ emptyMessage }}</p>
    </div>

    <!-- 消息列表 -->
    <template v-else>
      <ChatMessage
        v-for="(message, index) in messages"
        :key="getMessageKey(message, index)"
        :message="message"
        :messageIndex="index"
        :currentUserId="currentUserId"
        :myAvatar="myAvatar"
        :otherUserAvatar="otherUserAvatar"
        :baseUrl="baseUrl"
        :messageType="messageType"
        :showAvatar="showAvatar"
        :showSenderName="showSenderName"
        :showSelectionMode="selectionMode"
        :isSelected="selectedMessages.includes(index)"
        :isHighlighted="message && highlightedMessageId === (message._id || message.id)"
        @click="handleMessageClick"
        @contextmenu="handleMessageContextMenu"
        @toggle-selection="handleToggleSelection"
        @preview-image="handlePreviewImage"
        @preview-video="handlePreviewVideo"
        @preview-file="handlePreviewFile"
        @play-voice="handlePlayVoice"
        @re-edit-message="handleReEditMessage"
      />
    </template>

    <!-- 右键菜单 -->
    <MessageContextMenu
      v-if="contextMenu.show"
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :message="contextMenu.message"
      :messageIndex="contextMenu.messageIndex"
      :messageType="messageType"
      :selectionMode="selectionMode"
      @close="hideContextMenu"
      @enter-selection-mode="enterSelectionMode"
      @forward-message="handleForwardMessage"
      @download-file="handleDownloadFile"
      @delete-message="handleDeleteMessage"
      @recall-message="handleRecallMessage"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUpdated, nextTick, watch } from 'vue'
import ChatMessage from './ChatMessage.vue'
import { Xmark, ChatBubble, Refresh } from '@iconoir/vue'
import MessageContextMenu from './MessageContextMenu.vue'

const props = defineProps({
  messages: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  emptyMessage: {
    type: String,
    default: '暂无消息，发送第一条消息吧~'
  },
  currentUserId: {
    type: String,
    default: ''
  },
  myAvatar: {
    type: String,
    default: '/images/avatar/default-avatar.webp'
  },
  otherUserAvatar: {
    type: String,
    default: '/images/avatar/default-avatar.webp'
  },
  baseUrl: {
    type: String,
    default: ''
  },
  messageType: {
    type: String,
    default: 'normal' // 'normal', 'group', 'ai'
  },
  showAvatar: {
    type: Boolean,
    default: true
  },
  showSenderName: {
    type: Boolean,
    default: false
  },
  autoScroll: {
    type: Boolean,
    default: true
  },
  highlightedMessageId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits([
  'message-click',
  'message-contextmenu',
  'selection-change',
  'preview-image',
  'preview-video', 
  'preview-file',
  'play-voice',
  'forward-message',
  'forward-messages',
  'download-file',
  'delete-message',
  'delete-messages',
  'recall-message',
  're-edit-message',
  'scroll-to-bottom'
])

const messageListRef = ref(null)
const selectionMode = ref(false)
const selectedMessages = ref([])
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  message: null,
  messageIndex: -1
})

// 获取消息唯一key
function getMessageKey(message, index) {
  if (!message) return `msg-${index}`
  return message._id || message.id || `msg-${index}`
}

// 处理消息点击
function handleMessageClick(message, messageIndex) {
  if (selectionMode.value) {
    handleToggleSelection(messageIndex)
  } else {
    emit('message-click', message, messageIndex)
  }
}

// 处理右键菜单
function handleMessageContextMenu(event, message, messageIndex) {
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    message,
    messageIndex
  }
  emit('message-contextmenu', event, message, messageIndex)
}

// 隐藏右键菜单
function hideContextMenu() {
  contextMenu.value.show = false
}

// 进入选择模式
function enterSelectionMode() {
  selectionMode.value = true
  selectedMessages.value = []
  hideContextMenu()
}

// 退出选择模式
function exitSelectionMode() {
  selectionMode.value = false
  selectedMessages.value = []
  emit('selection-change', [])
}

// 切换消息选择状态
function handleToggleSelection(messageIndex) {
  const index = selectedMessages.value.indexOf(messageIndex)
  if (index > -1) {
    selectedMessages.value.splice(index, 1)
  } else {
    selectedMessages.value.push(messageIndex)
  }
  emit('selection-change', selectedMessages.value)
}

// 全选消息
function selectAllMessages() {
  selectedMessages.value = props.messages.map((_, index) => index)
  emit('selection-change', selectedMessages.value)
}

// 清空选择
function clearSelection() {
  selectedMessages.value = []
  emit('selection-change', [])
}

// 转发选中的消息
function handleForwardSelected() {
  if (selectedMessages.value.length === 0) return
  
  const selectedMessageData = selectedMessages.value.map(index => props.messages[index])
  emit('forward-messages', selectedMessageData)
  exitSelectionMode()
}

// 删除选中的消息
function handleDeleteSelected() {
  if (selectedMessages.value.length === 0) return
  
  const selectedMessageData = selectedMessages.value.map(index => props.messages[index])
  emit('delete-messages', selectedMessageData)
  exitSelectionMode()
}

// 处理预览图片
function handlePreviewImage(fileInfo) {
  emit('preview-image', fileInfo)
}

// 处理预览视频
function handlePreviewVideo(fileInfo) {
  emit('preview-video', fileInfo)
}

// 处理预览文件
function handlePreviewFile(fileInfo) {
  emit('preview-file', fileInfo)
}

// 处理播放语音
function handlePlayVoice(fileInfo) {
  emit('play-voice', fileInfo)
}

// 处理转发消息
function handleForwardMessage(message) {
  emit('forward-message', message)
  hideContextMenu()
}

// 处理下载文件
function handleDownloadFile(fileInfo) {
  emit('download-file', fileInfo)
  hideContextMenu()
}

// 处理删除消息
function handleDeleteMessage(messageIndex) {
  emit('delete-message', messageIndex)
  hideContextMenu()
}

// 处理撤回消息
function handleRecallMessage(messageIndex) {
  emit('recall-message', messageIndex)
  hideContextMenu()
}

// 处理重新编辑消息
function handleReEditMessage(message) {
  emit('re-edit-message', message)
}

// 滚动到底部
function scrollToBottom() {
  if (!props.autoScroll || !messageListRef.value) return
  
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

// 滚动到指定消息
function scrollToMessage(messageId) {
  if (!messageListRef.value || !messageId) return
  
  const targetElement = messageListRef.value.querySelector(`[data-message-id="${messageId}"]`)
  if (targetElement) {
    targetElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })
  }
}

// 监听消息变化，自动滚动
watch(() => props.messages, () => {
  if (props.autoScroll) {
    scrollToBottom()
  }
}, { deep: true })

// 监听高亮消息变化
watch(() => props.highlightedMessageId, (newId) => {
  if (newId) {
    nextTick(() => {
      scrollToMessage(newId)
    })
  }
})

onMounted(() => {
  scrollToBottom()
})

onUpdated(() => {
  if (props.autoScroll) {
    scrollToBottom()
  }
})

// 暴露方法给父组件
defineExpose({
  scrollToBottom,
  scrollToMessage,
  enterSelectionMode,
  exitSelectionMode,
  selectAllMessages,
  clearSelection,
  getSelectedMessages: () => selectedMessages.value,
  getSelectionMode: () => selectionMode.value
})
</script>

<style scoped lang="scss">
.message-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  background: transparent;
  border-radius: 1rem;
  -webkit-app-region: no-drag;

  // 多选工具栏样式
  .selection-toolbar {
    position: sticky;
    top: 0;
    z-index: 10;
    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
    color: white;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 12px 12px 0 0;
    box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
    margin-bottom: 8px;

    .selection-info {
      display: flex;
      align-items: center;
      gap: 12px;

      .cancel-btn {
        background: none;
        border: none;
        font-size: 18px;
        color: #666;
        cursor: pointer;
        padding: 4px;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;

        .cancel-icon {
          width: 16px;
          height: 16px;
          stroke-width: 1.5;
        }

        &:hover {
          background: rgba(0, 0, 0, 0.1);
          color: #333;
        }
      }

      .selection-count {
        font-weight: 600;
        font-size: 14px;
      }
    }

    .selection-actions {
      display: flex;
      gap: 8px;

      .action-btn {
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s;

        &:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.25);
          transform: translateY(-1px);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        &.forward-btn:not(:disabled) {
          background: rgba(40, 167, 69, 0.8);
          border-color: rgba(40, 167, 69, 0.9);

          &:hover {
            background: rgba(40, 167, 69, 0.9);
          }
        }

        &.delete-btn:not(:disabled) {
          background: rgba(220, 53, 69, 0.8);
          border-color: rgba(220, 53, 69, 0.9);

          &:hover {
            background: rgba(220, 53, 69, 0.9);
          }
        }
      }
    }
  }

  .loading-state,
  .empty-messages {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #999;

    i {
      font-size: 48px;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      justify-content: center;

      .loading-icon,
      .empty-icon {
        width: 48px;
        height: 48px;
        stroke-width: 1.5;
      }
    }

    p {
      font-size: 14px;
    }
  }

  .empty-messages {
    padding: 60px 20px;
    font-size: 16px;

    i {
      font-size: 48px;
      margin-bottom: 16px;
      color: #ccc;
    }
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .message-list {
    padding: 15px 10px;
    padding-bottom: 10px;
  }
}

@media (max-width: 768px) {
  .message-list {
    padding: 12px 8px;
  }
}

@media (max-width: 480px) {
  .message-list {
    padding: 10px 6px;
  }
}
</style>
