<template>
  <div class="detail-panel">
    <div class="detail-header">
      <h3>聊天室详情</h3>
      <button @click="close" class="close-btn">
        <X :size="20" />
      </button>
    </div>

    <div class="detail-body">
      <div class="room-info-section">
        <div class="room-icon-large">
          <Code :size="48" />
        </div>
        <h2>{{ room.RoomName }}</h2>
        <div class="tech-badge" v-if="room.techDirection">
          {{ room.techDirection }}
        </div>
      </div>

      <div class="info-section">
        <div class="info-item">
          <span class="label">聊天室类型</span>
          <span class="value">技术聊天室</span>
        </div>
        <div class="info-item">
          <span class="label">成员数量</span>
          <span class="value">{{ room.Members?.length || 0 }} 人</span>
        </div>
        <div class="info-item">
          <span class="label">加入方式</span>
          <span class="value">{{ joinTypeText }}</span>
        </div>
        <div class="info-item" v-if="room.expiresAt">
          <span class="label">剩余时间</span>
          <span class="value" :class="{ 'time-warning': timeRemaining.isWarning }">
            {{ timeRemaining.text }}
          </span>
        </div>
        <div class="info-item" v-if="room.inviteCode">
          <span class="label">邀请码</span>
          <span class="value code">{{ room.inviteCode }}</span>
          <button @click="copyInviteCode" class="copy-icon-btn">
            <Copy :size="16" />
          </button>
        </div>
      </div>

      <div class="announcement-section" v-if="room.Announcement">
        <h4>聊天室简介</h4>
        <p>{{ room.Announcement }}</p>
      </div>

      <div class="members-section">
        <h4>成员列表 ({{ room.Members?.length || 0 }})</h4>
        <div class="members-list">
          <div 
            v-for="member in room.Members" 
            :key="member.userID"
            class="member-item"
          >
            <img 
              :src="member.Avatar.startsWith('http') ? member.Avatar : baseUrl + member.Avatar" 
              alt="avatar" 
              class="member-avatar"
              @error="e => e.target.src = baseUrl + '/images/avatar/default-avatar.webp'"
            />
            <span class="member-name">{{ member.Nickname }}</span>
            <span class="member-role" v-if="member.userID === room.Creator">创建者</span>
          </div>
        </div>
      </div>
      
      <div class="actions-section">
        <button v-if="isCreator" @click="dissolveRoom" class="action-btn danger-btn">
          解散聊天室
        </button>
        <button v-else @click="leaveRoom" class="action-btn secondary-btn">
          退出聊天室
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { X, Code, Copy } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useToast } from '../composables/useToast'

const props = defineProps({
  room: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'update'])
const router = useRouter()
const toast = useToast()
const baseUrl = import.meta.env.VITE_BASE_URL

const currentUserId = ref('')
const timeRemaining = ref({ text: '', isWarning: false })
let timeUpdateInterval = null

const joinTypeText = computed(() => {
  const typeMap = {
    public: '公开',
    invite: '邀请码',
    password: '密码'
  }
  return typeMap[props.room.joinType] || '公开'
})

const isCreator = computed(() => {
  return currentUserId.value === props.room.Creator
})

function updateTimeRemaining() {
  if (!props.room.expiresAt) return
  
  const now = new Date()
  const expires = new Date(props.room.expiresAt)
  const diff = expires - now
  
  if (diff <= 0) {
    timeRemaining.value = { text: '已过期', isWarning: true }
    return
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours < 1) {
    timeRemaining.value = { 
      text: `${minutes} 分钟`, 
      isWarning: true 
    }
  } else if (hours < 24) {
    timeRemaining.value = { 
      text: `${hours} 小时 ${minutes} 分钟`, 
      isWarning: hours < 3 
    }
  } else {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    timeRemaining.value = { 
      text: `${days} 天 ${remainingHours} 小时`, 
      isWarning: false 
    }
  }
}

async function leaveRoom() {
  if (!confirm('确定要退出这个聊天室吗？')) return
  
  try {
    const token = localStorage.getItem('token')
    const res = await axios.post(
      `${baseUrl}/room/${props.room.RoomID}/leave`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    if (res.data.success) {
      toast.success('已退出聊天室')
      emit('close')
      router.push('/chatrooms')
    }
  } catch (err) {
    console.error('退出聊天室失败:', err)
    toast.error(err.response?.data?.message || '退出聊天室失败')
  }
}

async function dissolveRoom() {
  if (!confirm('确定要解散这个聊天室吗？解散后将无法恢复！')) return
  
  try {
    const token = localStorage.getItem('token')
    const res = await axios.delete(
      `${baseUrl}/room/${props.room.RoomID}/dissolve`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    if (res.data.success) {
      toast.success('聊天室已解散')
      emit('close')
      router.push('/chatrooms')
    }
  } catch (err) {
    console.error('解散聊天室失败:', err)
    toast.error(err.response?.data?.message || '解散聊天室失败')
  }
}

function close() {
  emit('close')
}

onMounted(async () => {
  // 获取当前用户ID
  const token = localStorage.getItem('token')
  const payload = JSON.parse(atob(token.split('.')[1]))
  currentUserId.value = payload.uid
  
  // 更新剩余时间
  updateTimeRemaining()
  
  // 每分钟更新一次剩余时间
  timeUpdateInterval = setInterval(updateTimeRemaining, 60000)
})

onUnmounted(() => {
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval)
  }
})

async function copyInviteCode() {
  try {
    await navigator.clipboard.writeText(props.room.inviteCode)
    toast.success('邀请码已复制')
  } catch (err) {
    toast.error('复制失败')
  }
}
</script>

<style scoped lang="scss">
.detail-panel {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 360px;
  background: white;
  border-left: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 50;
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  
  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
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
    color: var(--text-secondary);
    transition: all 0.2s;
    
    &:hover {
      background: var(--hover-bg);
      color: var(--text-primary);
    }
  }
}

.detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.room-info-section {
  text-align: center;
  margin-bottom: 32px;
  
  .room-icon-large {
    width: 80px;
    height: 80px;
    margin: 0 auto 16px;
    border-radius: 20px;
    background: var(--primary-gradient);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }
  
  h2 {
    margin: 0 0 12px;
    font-size: 22px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .tech-badge {
    display: inline-block;
    padding: 6px 16px;
    background: var(--primary-color);
    color: white;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
  }
}

.info-section {
  margin-bottom: 24px;
  
  .info-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid var(--border-color);
    
    &:last-child {
      border-bottom: none;
    }
    
    .label {
      font-size: 14px;
      color: var(--text-secondary);
    }
    
    .value {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
      
      &.code {
        font-family: 'Courier New', monospace;
        background: var(--bg-secondary);
        padding: 4px 8px;
        border-radius: 4px;
      }
    }
    
    .copy-icon-btn {
      margin-left: 8px;
      padding: 4px;
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--text-secondary);
      transition: all 0.2s;
      
      &:hover {
        color: var(--primary-color);
      }
    }
  }
}

.announcement-section {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
  
  h4 {
    margin: 0 0 12px;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-secondary);
  }
}

.members-section {
  h4 {
    margin: 0 0 16px;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .members-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .member-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    border-radius: 8px;
    transition: all 0.2s;
    
    &:hover {
      background: var(--hover-bg);
    }
    
    .member-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .member-name {
      flex: 1;
      font-size: 14px;
      color: var(--text-primary);
    }
    
    .member-role {
      font-size: 12px;
      padding: 3px 8px;
      background: var(--primary-color);
      color: white;
      border-radius: 4px;
    }
  }
}

.time-warning {
  color: #ff4d4f !important;
  font-weight: 600;
}

.actions-section {
  padding: 20px;
  border-top: 1px solid var(--border-color);
  
  .action-btn {
    width: 100%;
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    
    &.danger-btn {
      background: #ff4d4f;
      color: white;
      
      &:hover {
        background: #ff7875;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(255, 77, 79, 0.3);
      }
    }
    
    &.secondary-btn {
      background: #f5f5f5;
      color: #666;
      
      &:hover {
        background: #e8e8e8;
        color: #333;
      }
    }
  }
}
</style>
