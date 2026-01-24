<template>
  <Transition name="slide-down">
    <div v-if="showStatus" class="socket-status-indicator" :class="statusClass">
      <div class="status-content">
        <component :is="statusIcon" class="status-icon" :class="{ spin: isReconnecting }" />
        <span class="status-text">{{ statusText }}</span>
        <button v-if="showRetry" @click="handleRetry" class="retry-btn">
          重试
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Wifi, WifiOff, RefreshCw } from 'lucide-vue-next'
import { socket } from '../../utils/socket'

const status = ref('connected') // connected, disconnected, reconnecting
const reconnectAttempt = ref(0)
const showStatus = ref(false)
let hideTimeout = null

const statusClass = computed(() => {
  return {
    'status-connected': status.value === 'connected',
    'status-disconnected': status.value === 'disconnected',
    'status-reconnecting': status.value === 'reconnecting'
  }
})

const statusIcon = computed(() => {
  switch (status.value) {
    case 'connected':
      return Wifi
    case 'disconnected':
      return WifiOff
    case 'reconnecting':
      return RefreshCw
    default:
      return Wifi
  }
})

const statusText = computed(() => {
  switch (status.value) {
    case 'connected':
      return '连接已恢复'
    case 'disconnected':
      return '连接已断开'
    case 'reconnecting':
      return `正在重连... (${reconnectAttempt.value})`
    default:
      return ''
  }
})

const isReconnecting = computed(() => status.value === 'reconnecting')
const showRetry = computed(() => status.value === 'disconnected')

function showStatusBar(duration = 3000) {
  showStatus.value = true
  
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }
  
  if (duration > 0) {
    hideTimeout = setTimeout(() => {
      showStatus.value = false
    }, duration)
  }
}

function hideStatusBar() {
  showStatus.value = false
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }
}

function handleRetry() {
  socket.connect()
  status.value = 'reconnecting'
  reconnectAttempt.value = 1
}

// 监听 Socket 事件
function handleDisconnected(event) {
  status.value = 'disconnected'
  showStatusBar(0) // 一直显示直到重连
}

function handleReconnecting(event) {
  status.value = 'reconnecting'
  reconnectAttempt.value = event.detail.attempt
  showStatusBar(0) // 一直显示直到重连成功
}

function handleReconnected(event) {
  status.value = 'connected'
  showStatusBar(3000) // 显示 3 秒后自动隐藏
}

function handleReconnectFailed() {
  status.value = 'disconnected'
  showStatusBar(0) // 一直显示
}

onMounted(() => {
  // 监听自定义事件
  window.addEventListener('socket-disconnected', handleDisconnected)
  window.addEventListener('socket-reconnecting', handleReconnecting)
  window.addEventListener('socket-reconnected', handleReconnected)
  window.addEventListener('socket-reconnect-failed', handleReconnectFailed)
})

onUnmounted(() => {
  window.removeEventListener('socket-disconnected', handleDisconnected)
  window.removeEventListener('socket-reconnecting', handleReconnecting)
  window.removeEventListener('socket-reconnected', handleReconnected)
  window.removeEventListener('socket-reconnect-failed', handleReconnectFailed)
  
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }
})
</script>

<style scoped lang="scss">
.socket-status-indicator {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  padding: 12px 24px;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  
  &.status-connected {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
  }
  
  &.status-disconnected {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
  }
  
  &.status-reconnecting {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
  }
  
  .status-content {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .status-icon {
      width: 20px;
      height: 20px;
      
      &.spin {
        animation: spin 1s linear infinite;
      }
    }
    
    .status-text {
      font-size: 14px;
      font-weight: 500;
    }
    
    .retry-btn {
      padding: 4px 12px;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: white;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    }
  }
}

// 动画
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  transform: translateX(-50%) translateY(-100%);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateX(-50%) translateY(-100%);
  opacity: 0;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
