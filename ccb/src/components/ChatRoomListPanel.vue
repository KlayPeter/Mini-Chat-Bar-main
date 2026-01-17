<template>
  <div class="chatroom-list-panel">
    <div class="list-header">
      <h2>技术聊天室</h2>
      <div class="header-actions">
        <button @click="showJoinDialog = true" class="join-btn" title="加入聊天室">
          <LogIn :size="18" />
        </button>
        <button @click="showCreateDialog = true" class="create-btn" title="创建聊天室">
          <Plus :size="20" />
        </button>
      </div>
    </div>
    
    <!-- Tab 切换栏 -->
    <div class="tab-bar">
      <button 
        :class="['tab-item', { active: activeTab === 'joined' }]"
        @click="activeTab = 'joined'"
      >
        我加入的
        <span class="tab-count">{{ joinedRooms.length }}</span>
      </button>
      <button 
        :class="['tab-item', { active: activeTab === 'all' }]"
        @click="activeTab = 'all'"
      >
        全部聊天室
        <span class="tab-count">{{ allRooms.length }}</span>
      </button>
    </div>

    <div class="search-bar">
      <Search :size="18" class="search-icon" />
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="搜索聊天室..."
        class="search-input"
      />
    </div>

    <div class="room-list">
      <div 
        v-for="room in displayRooms" 
        :key="room.RoomID"
        @click="selectRoom(room)"
        class="room-item"
        :class="{ active: selectedRoomId === room.RoomID }"
      >
        <div class="room-icon">
          <Code :size="24" />
        </div>
        <div class="room-info">
          <div class="room-name">{{ room.RoomName }}</div>
          <div class="room-meta">
            <span class="tech-tag" v-if="room.techDirection">
              {{ room.techDirection }}
            </span>
            <span class="online-count">
              <span class="online-dot"></span>
              {{ room.onlineCount || 0 }} 在线
            </span>
            <span class="member-count">{{ room.Members?.length || 0 }} 参与过</span>
          </div>
        </div>
        <div class="room-badge" v-if="room.joinType !== 'public'">
          <Lock :size="14" v-if="room.joinType === 'password'" title="需要密码" />
          <span v-else-if="room.joinType === 'invite'" class="invite-badge" title="需要邀请码">邀</span>
        </div>
      </div>
    </div>

    <!-- 创建聊天室对话框 -->
    <CreateChatRoomDialog 
      v-if="showCreateDialog"
      @close="showCreateDialog = false"
      @created="handleRoomCreated"
    />
    
    <!-- 加入聊天室对话框 -->
    <JoinChatRoomDialog 
      v-if="showJoinDialog"
      @close="showJoinDialog = false"
      @joined="handleRoomJoined"
    />
    
    <!-- 密码输入对话框 -->
    <PasswordInputDialog 
      v-if="showPasswordDialog && passwordRoomInfo"
      :roomId="passwordRoomInfo.roomId"
      :roomName="passwordRoomInfo.roomName"
      @close="showPasswordDialog = false; passwordRoomInfo = null"
      @joined="handlePasswordJoined"
    />
    
    <!-- 加入确认对话框 -->
    <JoinConfirmDialog
      v-if="showJoinConfirmDialog && pendingJoinRoom"
      :roomInfo="pendingJoinRoom"
      @close="showJoinConfirmDialog = false; pendingJoinRoom = null"
      @confirm="confirmJoinRoom"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Code, Plus, Search, Lock, LogIn } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { io } from 'socket.io-client'
import CreateChatRoomDialog from './CreateChatRoomDialog.vue'
import JoinChatRoomDialog from './JoinChatRoomDialog.vue'
import PasswordInputDialog from './PasswordInputDialog.vue'
import JoinConfirmDialog from './JoinConfirmDialog.vue'
import { useToast } from '../composables/useToast'

const router = useRouter()
const toast = useToast()

const rooms = ref([])
const searchQuery = ref('')
const selectedRoomId = ref('')
const showCreateDialog = ref(false)
const showJoinDialog = ref(false)
const showPasswordDialog = ref(false)
const showJoinConfirmDialog = ref(false)
const passwordRoomInfo = ref(null)
const pendingJoinRoom = ref(null)
const activeTab = ref('joined') // 'joined' 或 'all'
const currentUserId = ref('') // 存储当前用户ID
const baseUrl = import.meta.env.VITE_BASE_URL

let socket = null
let refreshInterval = null

// 我加入的聊天室
const joinedRooms = computed(() => {
  if (!currentUserId.value) {
    console.log('❌ 当前用户ID为空')
    return []
  }
  
  console.log('👤 当前用户ID:', currentUserId.value)
  console.log('📋 所有聊天室:', rooms.value.map(r => ({
    name: r.RoomName,
    members: r.Members?.map(m => m.userID)
  })))
  
  const joined = rooms.value.filter(room => {
    const isMember = room.Members?.some(m => 
      String(m.userID) === String(currentUserId.value)
    )
    return isMember
  })
  
  console.log('✅ 我加入的聊天室:', joined.map(r => r.RoomName))
  return joined
})

// 全部聊天室（包括公开和密码方式的）
const allRooms = computed(() => {
  return rooms.value
})

// 根据当前 tab 显示的聊天室列表
const displayRooms = computed(() => {
  const sourceRooms = activeTab.value === 'joined' ? joinedRooms.value : allRooms.value
  
  if (!searchQuery.value) return sourceRooms
  
  const query = searchQuery.value.toLowerCase()
  return sourceRooms.filter(room => 
    room.RoomName.toLowerCase().includes(query) ||
    room.techDirection?.toLowerCase().includes(query)
  )
})

const filteredRooms = computed(() => {
  if (!searchQuery.value) return rooms.value
  const query = searchQuery.value.toLowerCase()
  return rooms.value.filter(room => 
    room.RoomName.toLowerCase().includes(query) ||
    room.techDirection?.toLowerCase().includes(query)
  )
})

function selectRoom(room) {
  selectedRoomId.value = room.RoomID
  
  // 检查是否是成员
  const isMember = room.Members?.some(m => String(m.userID) === String(currentUserId.value))
  
  if (isMember) {
    // 已经是成员，直接进入
    router.push({
      path: '/chatroom-detail',
      query: { roomId: room.RoomID }
    })
  } else {
    // 不是成员，根据类型处理
    if (room.joinType === 'password') {
      // 密码方式：弹出密码输入框
      passwordRoomInfo.value = {
        roomId: room.RoomID,
        roomName: room.RoomName
      }
      showPasswordDialog.value = true
    } else {
      // 公开或邀请方式：显示加入确认弹窗
      pendingJoinRoom.value = room
      showJoinConfirmDialog.value = true
    }
  }
}

async function loadRooms() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${baseUrl}/room/chatrooms`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.data.success) {
      rooms.value = res.data.rooms || []
    }
  } catch (err) {
    console.error('加载聊天室失败:', err)
    toast.error('加载聊天室失败')
  }
}

function handleRoomCreated(newRoom) {
  rooms.value.unshift(newRoom)
  selectRoom(newRoom)
}

function handleRoomJoined(room) {
  showJoinDialog.value = false
  loadRooms()
  toast.success('成功加入聊天室')
  // 自动进入加入的聊天室
  if (room && room.RoomID) {
    router.push({
      path: '/chatroom-detail',
      query: { roomId: room.RoomID }
    })
  }
}

function handlePasswordJoined(room) {
  showPasswordDialog.value = false
  passwordRoomInfo.value = null
  loadRooms()
  // 自动进入加入的聊天室
  if (room && room.RoomID) {
    router.push({
      path: '/chatroom-detail',
      query: { roomId: room.RoomID }
    })
  }
}

async function confirmJoinRoom() {
  if (!pendingJoinRoom.value) return
  
  try {
    const token = localStorage.getItem('token')
    const room = pendingJoinRoom.value
    
    // 调用后端加入接口
    const res = await axios.get(`${baseUrl}/room/${room.RoomID}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (res.data.success) {
      toast.success('已加入聊天室')
      showJoinConfirmDialog.value = false
      pendingJoinRoom.value = null
      
      // 刷新列表
      await loadRooms()
      
      // 跳转到聊天室详情页
      router.push({
        path: '/chatroom-detail',
        query: { roomId: room.RoomID }
      })
    }
  } catch (err) {
    console.error('加入聊天室失败:', err)
    toast.error(err.response?.data?.message || '加入聊天室失败')
    showJoinConfirmDialog.value = false
    pendingJoinRoom.value = null
  }
}

function initSocket() {
  socket = io(baseUrl, {
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: true
  })

  socket.on('connect', () => {
    console.log('✅ ChatRoomListPanel Socket 已连接')
  })

  // 监听全局的聊天室在线人数更新
  socket.on('chatroom-online-update', (data) => {
    console.log('👥 聊天室在线人数更新:', data)
    // 更新对应聊天室的在线人数
    const room = rooms.value.find(r => r.RoomID === data.roomId)
    if (room) {
      room.onlineCount = data.count
    }
  })

  socket.on('disconnect', () => {
    console.log('❌ ChatRoomListPanel Socket 已断开')
  })
}

function cleanupSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

onMounted(() => {
  // 获取当前用户ID
  loadCurrentUser()
  
  loadRooms()
  initSocket()
  
  // 每10秒刷新一次聊天室列表（作为备份机制）
  refreshInterval = setInterval(() => {
    loadRooms()
  }, 10000)
})

async function loadCurrentUser() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${baseUrl}/api/user/info`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    currentUserId.value = String(res.data.user?.uID || res.data.id || res.data.uID)
    console.log('✅ 加载当前用户ID:', currentUserId.value)
  } catch (err) {
    console.error('❌ 获取用户信息失败:', err)
  }
}

onUnmounted(() => {
  cleanupSocket()
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped lang="scss">
.chatroom-list-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-secondary);
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px;
  border-bottom: 1px solid var(--border-color);
  
  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .header-actions {
    display: flex;
    gap: 8px;
  }
  
  .join-btn,
  .create-btn {
    width: 36px;
    height: 36px;
    border: none;
    background: linear-gradient(135deg, rgb(185, 62, 62) 0%, rgb(165, 42, 42) 100%);
    color: white;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(165, 42, 42, 0.3);
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(165, 42, 42, 0.4);
    }
  }
}

.tab-bar {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  
  .tab-item {
    flex: 1;
    padding: 12px 16px;
    border: none;
    background: transparent;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    position: relative;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    
    &:hover {
      color: var(--text-primary);
      background: var(--hover-bg);
    }
    
    &.active {
      color: var(--primary-color);
      
      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--primary-gradient);
      }
    }
    
    .tab-count {
      font-size: 12px;
      padding: 2px 6px;
      background: var(--bg-secondary);
      border-radius: 10px;
      color: var(--text-tertiary);
      
      .active & {
        background: rgba(165, 42, 42, 0.1);
        color: var(--primary-color);
      }
    }
  }
}

.search-bar {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  
  .search-icon {
    color: var(--text-tertiary);
  }
  
  .search-input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 14px;
    color: var(--text-primary);
    
    &:focus {
      outline: none;
    }
    
    &::placeholder {
      color: var(--text-tertiary);
    }
  }
}

.room-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.room-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  
  &:hover {
    background: var(--hover-bg);
  }
  
  &.active {
    background: var(--active-bg);
    
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: linear-gradient(135deg, rgb(185, 62, 62) 0%, rgb(165, 42, 42) 100%);
    }
  }
  
  .room-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, rgb(185, 62, 62) 0%, rgb(165, 42, 42) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
  }
  
  .room-info {
    flex: 1;
    min-width: 0;
    
    .room-name {
      font-size: 15px;
      font-weight: 500;
      color: var(--text-primary);
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .room-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      
      .tech-tag {
        padding: 2px 8px;
        background: var(--primary-color);
        color: white;
        border-radius: 4px;
        font-weight: 500;
      }
      
      .online-count {
        color: #52c41a;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 4px;
        
        .online-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #52c41a;
          animation: pulse 2s infinite;
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
      
      .member-count {
        color: var(--text-tertiary);
      }
    }
  }
  
  .room-badge {
    color: var(--text-tertiary);
    display: flex;
    align-items: center;
    
    .invite-badge {
      width: 20px;
      height: 20px;
      background: rgb(165, 42, 42);
      color: white;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
    }
  }
}
</style>
