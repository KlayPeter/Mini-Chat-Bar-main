<template>
  <div class="invite-card" @click="handleJoinRoom">
    <div class="card-header">
      <div class="card-icon">
        <Code :size="28" />
      </div>
      <div class="card-title">
        <h4>技术聊天室邀请</h4>
        <span class="invite-badge">邀请卡片</span>
      </div>
    </div>
    
    <div class="card-body">
      <div class="room-name">{{ inviteData.roomName }}</div>
      <div class="room-meta">
        <span class="tech-tag" v-if="inviteData.techDirection">
          {{ inviteData.techDirection }}
        </span>
        <span class="member-count">{{ inviteData.memberCount }} 人参与</span>
      </div>
      <p v-if="inviteData.announcement" class="room-desc">
        {{ inviteData.announcement }}
      </p>
      <div class="time-info" v-if="inviteData.expiresAt">
        <Clock :size="14" />
        <span>{{ timeRemaining }}</span>
      </div>
    </div>
    
    <div class="card-footer">
      <button class="join-btn">
        <ArrowRight :size="16" />
        {{ joinButtonText }}
      </button>
    </div>
  </div>
  
  <!-- 加入确认弹窗 -->
  <JoinConfirmDialog
    v-if="showJoinDialog && roomInfo"
    :roomInfo="roomInfo"
    @close="showJoinDialog = false; roomInfo = null"
    @confirm="confirmJoin"
  />
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { Code, Clock, ArrowRight } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useToast } from '../composables/useToast'
import JoinConfirmDialog from './JoinConfirmDialog.vue'

const props = defineProps({
  inviteData: {
    type: Object,
    required: true
  }
})

const router = useRouter()
const toast = useToast()
const baseUrl = import.meta.env.VITE_BASE_URL

const timeRemaining = ref('')
const showJoinDialog = ref(false)
const roomInfo = ref(null)
let timeUpdateInterval = null

const joinButtonText = computed(() => {
  const joinType = props.inviteData.joinType || 'public'
  if (joinType === 'public') {
    return '点击进入聊天室'
  } else if (joinType === 'invite') {
    return '使用邀请码加入'
  } else if (joinType === 'password') {
    return '输入密码加入'
  }
  return '点击加入聊天室'
})

function updateTimeRemaining() {
  if (!props.inviteData.expiresAt) {
    timeRemaining.value = ''
    return
  }
  
  const now = new Date()
  const expires = new Date(props.inviteData.expiresAt)
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

async function handleJoinRoom() {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      toast.error('请先登录')
      return
    }
    
    const joinType = props.inviteData.joinType || 'public'
    // 先获取聊天室详细信息（预览模式，不自动加入）
    const res = await axios.get(`${baseUrl}/room/${props.inviteData.roomId}?preview=true`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (res.data.success && res.data.room) {
      roomInfo.value = res.data.room
      // 检查是否已经是成员
      if (res.data.isMember) {
        // 已经是成员，直接进入
        toast.success('进入聊天室')
        router.push({
          path: '/chatroom-detail',
          query: { roomId: props.inviteData.roomId }
        })
      } else {
        // 不是成员，显示加入确认弹窗
        showJoinDialog.value = true
      }
    }
  } catch (err) {
    console.error('❌ 获取聊天室信息失败:', err)
    toast.error(err.response?.data?.message || '获取聊天室信息失败')
  }
}

async function confirmJoin() {
  try {
    const token = localStorage.getItem('token')
    const joinType = props.inviteData.joinType || 'public'
    // 根据加入方式处理
    if (joinType === 'public') {
      // 公开聊天室：调用加入接口
      const res = await axios.get(`${baseUrl}/room/${props.inviteData.roomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.data.success) {
        toast.success('已加入聊天室')
        showJoinDialog.value = false
        roomInfo.value = null
        router.push({
          path: '/chatroom-detail',
          query: { roomId: props.inviteData.roomId }
        })
      }
    } else if (joinType === 'invite' && props.inviteData.inviteCode) {
      // 邀请码方式：使用邀请码加入
      const res = await axios.post(
        `${baseUrl}/room/join`,
        {
          inviteCode: props.inviteData.inviteCode
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      if (res.data.success) {
        toast.success('成功加入聊天室')
        showJoinDialog.value = false
        roomInfo.value = null
        router.push({
          path: '/chatroom-detail',
          query: { roomId: props.inviteData.roomId }
        })
      }
    } else if (joinType === 'password') {
      // 密码方式：关闭弹窗，跳转到聊天室详情页（会弹出密码输入框）
      showJoinDialog.value = false
      roomInfo.value = null
      router.push({
        path: '/chatroom-detail',
        query: { roomId: props.inviteData.roomId }
      })
      toast.info('请输入聊天室密码')
    }
  } catch (err) {
    console.error('❌ 加入聊天室失败:', err)
    toast.error(err.response?.data?.message || '加入聊天室失败')
    showJoinDialog.value = false
    roomInfo.value = null
  }
}

onMounted(() => {
  updateTimeRemaining()
  // 每分钟更新一次剩余时间
  timeUpdateInterval = setInterval(updateTimeRemaining, 60000)
})

onUnmounted(() => {
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval)
  }
})
</script>

<style scoped lang="scss">
.invite-card {
  max-width: 320px;
  background: linear-gradient(135deg, rgba(165, 42, 42, 0.05) 0%, rgba(165, 42, 42, 0.02) 100%);
  border: 1px solid rgba(165, 42, 42, 0.2);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(165, 42, 42, 0.15);
    border-color: rgba(165, 42, 42, 0.3);
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(165, 42, 42, 0.08) 0%, rgba(165, 42, 42, 0.04) 100%);
  border-bottom: 1px solid rgba(165, 42, 42, 0.1);
  
  .card-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, rgb(165, 42, 42) 0%, rgb(140, 30, 30) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
  }
  
  .card-title {
    flex: 1;
    min-width: 0;
    
    h4 {
      margin: 0 0 4px 0;
      font-size: 15px;
      font-weight: 600;
      color: #333;
    }
    
    .invite-badge {
      display: inline-block;
      font-size: 11px;
      padding: 2px 8px;
      background: rgb(165, 42, 42);
      color: white;
      border-radius: 4px;
      font-weight: 500;
    }
  }
}

.card-body {
  padding: 16px;
  
  .room-name {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 8px;
  }
  
  .room-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    
    .tech-tag {
      font-size: 11px;
      padding: 2px 8px;
      background: rgb(165, 42, 42);
      color: white;
      border-radius: 4px;
      font-weight: 500;
    }
    
    .member-count {
      font-size: 12px;
      color: #999;
    }
  }
  
  .room-desc {
    margin: 0 0 8px 0;
    font-size: 13px;
    color: #666;
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  
  .time-info {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #999;
    
    svg {
      flex-shrink: 0;
    }
  }
}

.card-footer {
  padding: 12px 16px;
  background: rgba(165, 42, 42, 0.03);
  border-top: 1px solid rgba(165, 42, 42, 0.1);
  
  .join-btn {
    width: 100%;
    padding: 10px 16px;
    border: none;
    border-radius: 8px;
    background: linear-gradient(135deg, rgb(165, 42, 42) 0%, rgb(140, 30, 30) 100%);
    color: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(165, 42, 42, 0.3);
    }
    
    &:active {
      transform: translateY(0);
    }
  }
}
</style>
