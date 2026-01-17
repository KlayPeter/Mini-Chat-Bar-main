<template>
  <div class="chatroom-list">
    <div class="list-header">
      <h2>技术聊天室</h2>
      <button @click="showCreateDialog = true" class="create-btn" title="创建聊天室">
        <Plus :size="20" />
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
        v-for="room in filteredRooms" 
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Code, Plus, Search, Lock } from 'lucide-vue-next'
import axios from 'axios'
import CreateChatRoomDialog from './CreateChatRoomDialog.vue'
import { useToast } from '../composables/useToast'

const emit = defineEmits(['select-room'])
const toast = useToast()

const rooms = ref([])
const searchQuery = ref('')
const selectedRoomId = ref('')
const showCreateDialog = ref(false)
const baseUrl = import.meta.env.VITE_BASE_URL

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
  emit('select-room', room)
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

// 通过 roomId 选择房间（供父组件调用）
function selectRoomById(roomId) {
  const room = rooms.value.find(r => r.RoomID === roomId)
  if (room) {
    selectRoom(room)
  }
}

// 暴露方法给父组件
defineExpose({
  selectRoomById,
  loadRooms
})

onMounted(() => {
  loadRooms()
})
</script>

<style scoped lang="scss">
.chatroom-list {
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
  
  .create-btn {
    width: 36px;
    height: 36px;
    border: none;
    background: var(--primary-gradient);
    color: white;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    box-shadow: var(--shadow-sm);
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-primary);
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
      background: var(--primary-gradient);
    }
  }
  
  .room-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: var(--primary-gradient);
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
