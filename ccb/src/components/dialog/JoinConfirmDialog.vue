<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog-container">
      <div class="dialog-header">
        <h3>加入聊天室</h3>
        <button @click="$emit('close')" class="close-btn">
          <X :size="20" />
        </button>
      </div>
      
      <div class="dialog-body">
        <div class="room-preview">
          <div class="room-icon-large">
            <Code :size="48" />
          </div>
          <h2 class="room-name">{{ roomInfo.RoomName }}</h2>
          
          <div class="room-meta">
            <span v-if="roomInfo.techDirection" class="tech-tag">
              {{ roomInfo.techDirection }}
            </span>
            <span class="join-type-badge" :class="joinTypeClass">
              {{ joinTypeText }}
            </span>
          </div>
          
          <div class="room-stats">
            <div class="stat-item">
              <Users :size="20" />
              <span>{{ roomInfo.Members?.length || 0 }} 人参与过</span>
            </div>
            <div class="stat-item" v-if="roomInfo.onlineCount !== undefined">
              <span class="online-dot"></span>
              <span>{{ roomInfo.onlineCount }} 人在线</span>
            </div>
            <div class="stat-item" v-if="timeRemaining">
              <Clock :size="20" />
              <span :class="{ 'time-warning': isTimeWarning }">{{ timeRemaining }}</span>
            </div>
          </div>
          
          <div v-if="roomInfo.announcement || roomInfo.Announcement" class="room-announcement">
            <h4>聊天室公告</h4>
            <p>{{ roomInfo.announcement || roomInfo.Announcement }}</p>
          </div>
        </div>
      </div>
      
      <div class="dialog-footer">
        <button @click="$emit('close')" class="cancel-btn">取消</button>
        <button @click="handleJoin" class="join-btn" :disabled="loading">
          <span v-if="loading">加入中...</span>
          <span v-else>确认加入</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { Code, X, Users, Clock } from 'lucide-vue-next'

const props = defineProps({
  roomInfo: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'confirm'])

const loading = ref(false)
const timeRemaining = ref('')

const joinTypeText = computed(() => {
  const type = props.roomInfo.joinType || 'public'
  const map = {
    public: '公开',
    invite: '邀请制',
    password: '密码保护'
  }
  return map[type] || '公开'
})

const joinTypeClass = computed(() => {
  const type = props.roomInfo.joinType || 'public'
  return `type-${type}`
})

const isTimeWarning = computed(() => {
  if (!props.roomInfo.expiresAt) return false
  const now = new Date()
  const expires = new Date(props.roomInfo.expiresAt)
  const diff = expires - now
  const hours = diff / (1000 * 60 * 60)
  return hours < 3
})

function updateTimeRemaining() {
  if (!props.roomInfo.expiresAt) {
    timeRemaining.value = ''
    return
  }
  
  const now = new Date()
  const expires = new Date(props.roomInfo.expiresAt)
  const diff = expires - now
  
  if (diff <= 0) {
    timeRemaining.value = '已过期'
    return
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours < 1) {
    timeRemaining.value = `剩余 ${minutes} 分钟`
  } else if (hours < 24) {
    timeRemaining.value = `剩余 ${hours} 小时`
  } else {
    const days = Math.floor(hours / 24)
    timeRemaining.value = `剩余 ${days} 天`
  }
}

function handleJoin() {
  loading.value = true
  emit('confirm')
}

onMounted(() => {
  updateTimeRemaining()
})
</script>

<style scoped lang="scss">
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.dialog-container {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  
  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }
  
  .close-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    transition: all 0.2s;
    
    &:hover {
      background: #f5f5f5;
      color: #333;
    }
  }
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.room-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  
  .room-icon-large {
    width: 80px;
    height: 80px;
    border-radius: 20px;
    background: linear-gradient(135deg, rgb(185, 62, 62) 0%, rgb(165, 42, 42) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    margin-bottom: 16px;
    box-shadow: 0 8px 20px rgba(165, 42, 42, 0.3);
  }
  
  .room-name {
    margin: 0 0 12px 0;
    font-size: 24px;
    font-weight: 600;
    color: #333;
  }
  
  .room-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
    
    .tech-tag {
      font-size: 12px;
      padding: 4px 12px;
      background: rgb(165, 42, 42);
      color: white;
      border-radius: 6px;
      font-weight: 500;
    }
    
    .join-type-badge {
      font-size: 12px;
      padding: 4px 12px;
      border-radius: 6px;
      font-weight: 500;
      
      &.type-public {
        background: #e8f5e9;
        color: #2e7d32;
      }
      
      &.type-invite {
        background: #fff3e0;
        color: #e65100;
      }
      
      &.type-password {
        background: #fce4ec;
        color: #c2185b;
      }
    }
  }
  
  .room-stats {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    padding: 16px;
    background: #f9f9f9;
    border-radius: 12px;
    margin-bottom: 20px;
    
    .stat-item {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 14px;
      color: #666;
      
      svg {
        color: #999;
      }
      
      .online-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #52c41a;
        animation: pulse 2s infinite;
      }
      
      .time-warning {
        color: #f5222d;
        font-weight: 600;
      }
    }
  }
  
  .room-announcement {
    width: 100%;
    text-align: left;
    padding: 16px;
    background: #fff9e6;
    border-left: 3px solid #faad14;
    border-radius: 8px;
    
    h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 600;
      color: #d48806;
    }
    
    p {
      margin: 0;
      font-size: 13px;
      color: #666;
      line-height: 1.6;
    }
  }
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
  
  button {
    flex: 1;
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
  
  .cancel-btn {
    background: #f5f5f5;
    color: #666;
    
    &:hover:not(:disabled) {
      background: #e8e8e8;
    }
  }
  
  .join-btn {
    background: linear-gradient(135deg, rgb(185, 62, 62) 0%, rgb(165, 42, 42) 100%);
    color: white;
    
    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(165, 42, 42, 0.4);
    }
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
