<template>
  <div class="message-list" ref="messageListRef" @mouseup="handleTextSelection" @scroll="handleScroll">
    <!-- 加载更多提示 -->
    <div v-if="loadingMore" class="loading-more">
      <i class="spin"><Refresh class="loading-icon-small" /></i>
      <span>加载更多...</span>
    </div>
    <div v-else-if="!hasMore && messages.length > 0" class="no-more-messages">
      <span>没有更多消息了</span>
    </div>
    
    <!-- 文本选择工具栏 -->
    <TextSelectionToolbar
      :show="showSelectionToolbar"
      :position="toolbarPosition"
      :selectedText="selectedText"
      @ai-explain="handleAIExplain"
      @quote="handleQuote"
      @close="hideSelectionToolbar"
    />

    <!-- AI 解释浮窗 -->
    <AIExplainDialog
      :show="showExplainDialog"
      :selectedText="selectedText"
      :position="explainPopupPosition"
      @close="showExplainDialog = false"
    />

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

    <!-- 虚拟滚动消息列表 - 使用 DynamicScroller 支持动态高度 -->
    <DynamicScroller
      v-else
      ref="dynamicScrollerRef"
      class="message-scroller"
      :items="messagesWithId"
      :min-item-size="50"
      key-field="id"
      :emit-update="true"
    >
      <template v-slot="{ item: message, index, active }">
        <DynamicScrollerItem
          :item="message"
          :active="active"
          :size-dependencies="[
            message.content,
            message.messageType,
          ]"
          :data-index="index"
        >
          <ChatMessage
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
            :hideTime="shouldHideTime(message, index)"
            @click="handleMessageClick"
            @contextmenu="handleMessageContextMenu"
            @toggle-selection="handleToggleSelection"
            @preview-image="handlePreviewImage"
            @preview-video="handlePreviewVideo"
            @preview-file="handlePreviewFile"
            @play-voice="handlePlayVoice"
            @re-edit-message="handleReEditMessage"
            @jump-to-quoted-message="handleJumpToQuotedMessage"
          />
        </DynamicScrollerItem>
      </template>
    </DynamicScroller>

    <!-- 右键菜单 -->
    <MessageContextMenu
      v-if="contextMenu.show"
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :message="contextMenu.message"
      :messageIndex="contextMenu.messageIndex"
      :messageType="messageType"
      :currentUserId="currentUserId"
      :selectionMode="selectionMode"
      @close="hideContextMenu"
      @enter-selection-mode="enterSelectionMode"
      @forward-message="handleForwardMessage"
      @download-file="handleDownloadFile"
      @delete-message="handleDeleteMessage"
      @recall-message="handleRecallMessage"
      @quote-reply="handleQuoteReply"
      @favorite="handleFavorite"
    />
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, watch, onMounted, onUnmounted, onUpdated, nextTick, computed } from 'vue'
import { DynamicScroller, DynamicScrollerItem } from 'vue3-virtual-scroller'
import 'vue3-virtual-scroller/dist/vue3-virtual-scroller.css'
import ChatMessage from './ChatMessage.vue'
import { Xmark, ChatBubble, Refresh } from '@iconoir/vue'
import MessageContextMenu from './MessageContextMenu.vue'
import TextSelectionToolbar from '../TextSelectionToolbar.vue'
import AIExplainDialog from '../AIExplainDialog.vue'
import { throttle } from '../../utils/performance'

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
  },
  loadingMore: {
    type: Boolean,
    default: false
  },
  hasMore: {
    type: Boolean,
    default: true
  }
})

// 虚拟滚动配置 - 使用 DynamicScroller 不需要固定高度
// const estimatedItemSize = 80 // 移除固定高度
// const buffer = 200 // 移除缓冲区配置

// 为虚拟滚动准备消息数据（确保每条消息都有 id 字段）
const messagesWithId = computed(() => {
  return props.messages.map((msg, index) => {
    if (!msg) return { id: `msg-${index}`, ...msg }
    return {
      ...msg,
      id: msg._id || msg.id || `msg-${index}`
    }
  })
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
  'quote-reply',
  'jump-to-quoted-message',
  'scroll-to-bottom',
  'load-more',
  'favorite'
])

const messageListRef = ref(null)
const dynamicScrollerRef = ref(null)
const selectionMode = ref(false)
const selectedMessages = ref([])
const isShowingContextMenu = ref(false)
const preventAutoScroll = ref(false)
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  message: null,
  messageIndex: -1
})

// 文本选择相关状态
const showSelectionToolbar = ref(false)
const showExplainDialog = ref(false)
const selectedText = ref('')
const toolbarPosition = ref({ x: 0, y: 0 })
const explainPopupPosition = ref({ x: 0, y: 0 })
const selectionRect = ref({ left: 0, right: 0, top: 0, bottom: 0, width: 0 })

// 获取消息唯一key
function getMessageKey(message, index) {
  if (!message) return `msg-${index}`
  return message._id || message.id || `msg-${index}`
}

// 判断是否应该隐藏时间显示（类似微信的时间合并功能）
function shouldHideTime(message, index) {
  if (!message || index === 0) return false // 第一条消息总是显示时间
  
  const previousMessage = props.messages[index - 1]
  if (!previousMessage || !previousMessage.time || !message.time) return false
  
  const currentTime = new Date(message.time).getTime()
  const previousTime = new Date(previousMessage.time).getTime()
  
  // 如果两条消息时间间隔小于2分钟（120000毫秒），则隐藏当前消息的时间
  const timeDiff = currentTime - previousTime
  
  return timeDiff < 120000 && timeDiff >= 0 // 2分钟 = 120000毫秒，且时间差为正数
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
  event.preventDefault()
  event.stopPropagation()
  
  // 记录当前滚动位置
  const currentScrollTop = messageListRef.value?.scrollTop || 0
  
  // 标记正在显示右键菜单，阻止自动滚动
  isShowingContextMenu.value = true
  preventAutoScroll.value = true
  
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    message,
    messageIndex
  }
  emit('message-contextmenu', event, message, messageIndex)
  
  // 恢复滚动位置，防止意外滚动
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = currentScrollTop
    }
  })
}

// 隐藏右键菜单
function hideContextMenu() {
  contextMenu.value.show = false
  
  // 立即重置右键菜单显示状态
  isShowingContextMenu.value = false
  
  // 延迟重置自动滚动阻止标记，防止取消菜单后立即触发滚动
  setTimeout(() => {
    preventAutoScroll.value = false
  }, 300) // 增加延迟时间，防止意外滚动
}

// 进入选择模式
function enterSelectionMode() {
  // 进入选择模式时阻止自动滚动
  preventAutoScroll.value = true
  
  selectionMode.value = true
  selectedMessages.value = []
  hideContextMenu()
  
  // 延迟恢复自动滚动
  setTimeout(() => {
    preventAutoScroll.value = false
  }, 50)
}

// 退出选择模式
function exitSelectionMode() {
  // 退出选择模式时阻止自动滚动
  preventAutoScroll.value = true
  
  selectionMode.value = false
  selectedMessages.value = []
  emit('selection-change', [])
  
  // 延迟恢复自动滚动
  setTimeout(() => {
    preventAutoScroll.value = false
  }, 50)
}

// 切换消息选择状态
function handleToggleSelection(messageIndex) {
  // 在选择操作期间阻止自动滚动
  preventAutoScroll.value = true
  
  const index = selectedMessages.value.indexOf(messageIndex)
  if (index > -1) {
    selectedMessages.value.splice(index, 1)
  } else {
    selectedMessages.value.push(messageIndex)
  }
  emit('selection-change', selectedMessages.value)
  
  // 短暂延迟后恢复自动滚动
  setTimeout(() => {
    preventAutoScroll.value = false
  }, 50) // 50ms足够防止选择操作引起的滚动
}

// 全选消息
function selectAllMessages() {
  // 在全选操作期间阻止自动滚动
  preventAutoScroll.value = true
  
  selectedMessages.value = props.messages.map((_, index) => index)
  emit('selection-change', selectedMessages.value)
  
  // 短暂延迟后恢复自动滚动
  setTimeout(() => {
    preventAutoScroll.value = false
  }, 50)
}

// 清空选择
function clearSelection() {
  // 在清空选择操作期间阻止自动滚动
  preventAutoScroll.value = true
  
  selectedMessages.value = []
  emit('selection-change', [])
  
  // 短暂延迟后恢复自动滚动
  setTimeout(() => {
    preventAutoScroll.value = false
  }, 50)
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

// 处理引用回复消息
function handleQuoteReply(message) {
  emit('quote-reply', message)
  hideContextMenu()
}

// 处理收藏消息
function handleFavorite(message) {
  emit('favorite', message)
  hideContextMenu()
}

// 处理跳转到被引用的消息
function handleJumpToQuotedMessage(quotedMessage) {
  emit('jump-to-quoted-message', quotedMessage)
}

// 处理文本选择
function handleTextSelection(event) {
  const selection = window.getSelection()
  const text = selection?.toString().trim()

  if (text && text.length > 0) {
    // 选择文本时阻止自动滚动
    preventAutoScroll.value = true
    
    selectedText.value = text

    // 获取选择范围的位置
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()

    // 计算工具栏位置（在选中文本上方居中）
    const toolbarWidth = 160 // 工具栏估算宽度
    let toolbarX = rect.left + rect.width / 2 - toolbarWidth / 2
    
    // 确保不超出屏幕左右边界
    toolbarX = Math.max(10, Math.min(toolbarX, window.innerWidth - toolbarWidth - 10))
    
    toolbarPosition.value = {
      x: toolbarX,
      y: rect.top - 50 // 工具栏高度 + 间距
    }

    // 保存选中文本的位置，用于浮窗定位
    selectionRect.value = {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width
    }

    // 延迟显示工具栏，避免与其他事件冲突
    setTimeout(() => {
      showSelectionToolbar.value = true
    }, 100)
  } else {
    hideSelectionToolbar()
  }
}

// 隐藏选择工具栏
function hideSelectionToolbar() {
  showSelectionToolbar.value = false
  
  // 延迟恢复自动滚动，避免立即触发滚动
  setTimeout(() => {
    preventAutoScroll.value = false
  }, 300)
}

// 处理 AI 解释
function handleAIExplain() {
  preventAutoScroll.value = true
  const popupWidth = 320
  const popupHeight = 300
  let popupX = selectionRect.value.left + selectionRect.value.width / 2 - popupWidth / 2
  let popupY = selectionRect.value.bottom + 15
  popupX = Math.max(10, Math.min(popupX, window.innerWidth - popupWidth - 10))
  if (popupY + popupHeight > window.innerHeight - 20) {
    popupY = selectionRect.value.top - popupHeight - 15
  }
  explainPopupPosition.value = { x: popupX, y: popupY }
  showExplainDialog.value = true
  hideSelectionToolbar()
}

// 处理引用
function handleQuote(text) {
  // 触发引用回复事件
  emit('quote-reply', { content: text })
}

// 滚动到底部 - 兼容 DynamicScroller
function scrollToBottom(force = false) {
  if (!messageListRef.value) return
  if (!force && (!props.autoScroll || preventAutoScroll.value)) return
  
  // 如果是强制滚动，重置 preventAutoScroll
  if (force) {
    preventAutoScroll.value = false
  }
  
  nextTick(() => {
    // 方法1: 使用 DynamicScroller 的 scrollToBottom 方法
    if (dynamicScrollerRef.value && typeof dynamicScrollerRef.value.scrollToBottom === 'function') {
      dynamicScrollerRef.value.scrollToBottom()
    }
    
    // 方法2: 直接操作外层容器的 scrollTop
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
    
    // 方法3: 延迟再次尝试（确保 DynamicScroller 渲染完成）
    setTimeout(() => {
      if (dynamicScrollerRef.value && typeof dynamicScrollerRef.value.scrollToBottom === 'function') {
        dynamicScrollerRef.value.scrollToBottom()
      }
      if (messageListRef.value) {
        messageListRef.value.scrollTop = messageListRef.value.scrollHeight
      }
    }, 100)
    
    // 方法4: 再次延迟确保滚动到底部
    setTimeout(() => {
      if (messageListRef.value) {
        messageListRef.value.scrollTop = messageListRef.value.scrollHeight
      }
    }, 300)
  })
}

// 滚动到指定消息 - 兼容 DynamicScroller
function scrollToMessage(messageId) {
  if (!messageListRef.value || !messageId) return
  
  // 查找消息索引
  const messageIndex = props.messages.findIndex(msg => 
    (msg._id || msg.id) === messageId
  )
  
  if (messageIndex !== -1) {
    // 使用 DynamicScroller 的 scrollToItem 方法
    if (dynamicScrollerRef.value && typeof dynamicScrollerRef.value.scrollToItem === 'function') {
      dynamicScrollerRef.value.scrollToItem(messageIndex)
    } else {
      // 降级方案：使用 DOM 查询
      nextTick(() => {
        const targetElement = messageListRef.value.querySelector(`[data-message-id="${messageId}"]`)
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          })
        }
      })
    }
  }
}

// 监听消息变化，自动滚动
watch(() => props.messages, (newMessages, oldMessages) => {
  // 只有在消息数量增加时才自动滚动（新消息到达）
  if (props.autoScroll && !preventAutoScroll.value && newMessages.length > oldMessages.length) {
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

// 处理滚动事件 - 使用节流优化性能
let scrollTimeout = null
const handleScroll = throttle(function() {
  if (!messageListRef.value) return
  
  const { scrollTop, scrollHeight, clientHeight } = messageListRef.value
  const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
  const isAtTop = scrollTop < 100
  
  // 滚动到顶部时加载更多
  if (isAtTop && props.hasMore && !props.loadingMore) {
    emit('load-more')
  }
  
  // 如果用户向上滚动（不在底部），阻止自动滚动
  if (!isAtBottom) {
    preventAutoScroll.value = true
    
    // 清除之前的定时器
    if (scrollTimeout) clearTimeout(scrollTimeout)
    
    // 5秒后恢复自动滚动（如果没有其他操作）
    scrollTimeout = setTimeout(() => {
      // 检查是否仍然不在底部，且没有打开任何弹窗
      if (!isShowingContextMenu.value && !showSelectionToolbar.value && !showExplainDialog.value) {
        const currentIsAtBottom = messageListRef.value.scrollHeight - messageListRef.value.scrollTop - messageListRef.value.clientHeight < 50
        if (currentIsAtBottom) {
          preventAutoScroll.value = false
        }
      }
    }, 5000)
  } else {
    // 用户滚动到底部，恢复自动滚动
    if (!isShowingContextMenu.value && !showSelectionToolbar.value && !showExplainDialog.value) {
      preventAutoScroll.value = false
    }
  }
}, 100) // 节流 100ms

onMounted(() => {
  // 初始加载时滚动到底部
  setTimeout(() => {
    scrollToBottom(true)
  }, 300)
  
  // 点击其他地方隐藏各种弹窗
  document.addEventListener('mousedown', (e) => {
    // 隐藏文本选择工具栏
    if (showSelectionToolbar.value && !e.target.closest('.text-selection-toolbar')) {
      hideSelectionToolbar()
    }
    // 隐藏解释弹窗
    if (showExplainDialog.value && !e.target.closest('.explain-popup')) {
      showExplainDialog.value = false
      // 延迟恢复自动滚动
      setTimeout(() => {
        if (!isShowingContextMenu.value && !showSelectionToolbar.value) {
          preventAutoScroll.value = false
        }
      }, 300)
    }
    // 隐藏右键菜单
    if (contextMenu.value.show && !e.target.closest('.message-context-menu')) {
      hideContextMenu()
    }
  })
})

onUpdated(() => {
  // 当组件更新时，如果应该自动滚动，则滚动到底部
  if (props.autoScroll && !preventAutoScroll.value) {
    nextTick(() => {
      scrollToBottom()
    })
  }
})

onUnmounted(() => {
  // 清理定时器
  if (scrollTimeout) clearTimeout(scrollTimeout)
})

// 不再在 onUpdated 中自动滚动，避免任何更新都触发滚动
// onUpdated(() => {
//   if (props.autoScroll && !preventAutoScroll.value) {
//     scrollToBottom()
//   }
// })

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
  position: relative;
  display: flex;
  flex-direction: column;
  
  // 虚拟滚动容器样式 - 关键修复（DynamicScroller）
  .message-scroller {
    flex: 1;
    width: 100%;
    min-height: 0; // 关键：允许flex子元素收缩
    
    // 确保虚拟滚动容器内部样式正确
    :deep(.vue-recycle-scroller) {
      height: 100% !important;
    }
    
    :deep(.vue-recycle-scroller__slot) {
      padding: 0;
    }
    
    :deep(.vue-recycle-scroller__item-wrapper) {
      overflow: visible;
      box-sizing: border-box;
    }
    
    :deep(.vue-recycle-scroller__item-view) {
      overflow: visible;
      width: 100%;
    }
    
    // DynamicScrollerItem 样式
    :deep(.vue-recycle-scroller__item-view) {
      .dynamic-scroller-item {
        overflow: visible;
      }
    }
  }

  // 加载更多样式
  .loading-more {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    color: #999;
    font-size: 13px;
    
    .loading-icon-small {
      width: 16px;
      height: 16px;
      animation: spin 1s linear infinite;
    }
  }
  
  .no-more-messages {
    text-align: center;
    padding: 12px;
    color: #ccc;
    font-size: 12px;
  }

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
