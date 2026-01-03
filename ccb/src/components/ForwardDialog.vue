<template>
  <div class="forward-overlay" @click="$emit('close')">
    <div class="forward-dialog" @click.stop>
      <div class="dialog-header">
        <h3>转发消息</h3>
        <button class="close-btn" @click="$emit('close')">
          <Xmark class="close-icon" />
        </button>
      </div>

      <div class="dialog-body">
        <!-- 转发预览 -->
        <div class="forward-preview">
          <p class="preview-text">将转发 {{ messages.length }} 条消息{{ summaryText }}</p>
        </div>

        <!-- 搜索框 -->
        <div class="search-section">
          <div class="search-input-wrapper">
            <Search class="search-icon" />
            <input
              v-model="searchText"
              type="text"
              placeholder="搜索好友或群聊"
              class="search-input"
            />
          </div>
        </div>

        <!-- 最近聊天 -->
        <div class="recent-chats">
          <h4>最近聊天</h4>
          <div class="chat-list">
            <div
              v-for="chat in filteredChats"
              :key="chat.id"
              class="chat-item"
              :class="{ selected: selectedTargets.includes(chat.id) }"
              @click="toggleTarget(chat)"
            >
              <img :src="chat.avatar || '/images/avatar/default-avatar.webp'" :alt="chat.name" />
              <div class="chat-info">
                <div class="chat-name">{{ chat.name }}</div>
                <div class="chat-type">{{ chat.type === 'group' ? '群聊' : '好友' }}</div>
              </div>
              <div v-if="selectedTargets.includes(chat.id)" class="selected-mark">
                <Check class="check-icon" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="cancel-btn" @click="$emit('close')">取消</button>
        <button 
          class="forward-btn" 
          :disabled="selectedTargets.length === 0"
          @click="handleForward"
        >
          转发({{ selectedTargets.length }})
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Xmark, Search, Check } from '@iconoir/vue'
import axios from 'axios'
import { useToast } from '../composables/useToast'

const props = defineProps({
  messages: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['close', 'forward-complete'])

const baseUrl = import.meta.env.VITE_BASE_URL
const toast = useToast()

const searchText = ref('')
const allChats = ref([])
const selectedTargets = ref([])

// 转发预览文本
const summaryText = computed(() => {
  const hasImages = props.messages.some(msg => msg.messageType === 'image')
  const hasFiles = props.messages.some(msg => msg.messageType === 'file')
  
  if (hasImages && hasFiles) {
    return '（包含图片和文件）'
  } else if (hasImages) {
    return '（包含图片）'  
  } else if (hasFiles) {
    return '（包含文件）'
  }
  return ''
})

// 过滤聊天列表
const filteredChats = computed(() => {
  if (!searchText.value) return allChats.value
  
  return allChats.value.filter(chat => 
    chat.name.toLowerCase().includes(searchText.value.toLowerCase())
  )
})

// 加载最近聊天列表
async function loadRecentChats() {
  try {
    const token = localStorage.getItem('token')
    
    // 获取好友列表
    const friendsRes = await axios.get(`${baseUrl}/api/friends`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    // 获取群聊列表
    const groupsRes = await axios.get(`${baseUrl}/room/list`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    const chats = []
    
    // 添加好友
    if (friendsRes.data.success && friendsRes.data.friends) {
      friendsRes.data.friends.forEach(friend => {
        chats.push({
          id: `friend_${friend.uID}`,
          type: 'friend',
          name: friend.Nickname || friend.Username,
          avatar: friend.Avatar,
          targetId: friend.uID
        })
      })
    }
    
    // 添加群聊
    if (groupsRes.data.success && groupsRes.data.rooms) {
      groupsRes.data.rooms.forEach(group => {
        chats.push({
          id: `group_${group.RoomID}`,
          type: 'group',
          name: group.RoomName,
          avatar: null, // 群聊使用GroupAvatar组件
          targetId: group.RoomID
        })
      })
    }
    
    allChats.value = chats
  } catch (err) {
    console.error('加载聊天列表失败:', err)
    toast.error('加载聊天列表失败')
  }
}

// 切换选择目标
function toggleTarget(chat) {
  const index = selectedTargets.value.indexOf(chat.id)
  if (index === -1) {
    selectedTargets.value.push(chat.id)
  } else {
    selectedTargets.value.splice(index, 1)
  }
}

// 执行转发
async function handleForward() {
  if (selectedTargets.value.length === 0) return
  
  try {
    const token = localStorage.getItem('token')
    
    for (const targetId of selectedTargets.value) {
      const target = allChats.value.find(chat => chat.id === targetId)
      if (!target) continue
      
      for (const message of props.messages) {
        const forwardData = {
          content: message.content,
          messageType: message.messageType,
          fileInfo: message.fileInfo || null
        }
        
        if (target.type === 'friend') {
          // 转发给好友
          await axios.post(`${baseUrl}/api/messages/send`, {
            to: target.targetId,
            ...forwardData
          }, {
            headers: { Authorization: `Bearer ${token}` }
          })
        } else if (target.type === 'group') {
          // 转发到群聊
          await axios.post(`${baseUrl}/room/${target.targetId}/send`, forwardData, {
            headers: { Authorization: `Bearer ${token}` }
          })
        }
      }
    }
    
    toast.success(`已转发到${selectedTargets.value.length}个聊天`)
    emit('forward-complete')
    emit('close')
  } catch (err) {
    console.error('转发失败:', err)
    toast.error('转发失败')
  }
}

onMounted(() => {
  loadRecentChats()
})
</script>

<style scoped lang="scss">
.forward-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.forward-dialog {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.dialog-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h3 {
    margin: 0;
    font-size: 18px;
    color: #333;
  }
  
  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    
    .close-icon {
      width: 20px;
      height: 20px;
      color: #666;
    }
    
    &:hover {
      background: #f5f5f5;
    }
  }
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.forward-preview {
  margin-bottom: 20px;
  padding: 15px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px;
  border: 1px solid #dee2e6;
  
  .preview-text {
    margin: 0;
    color: #495057;
    font-size: 14px;
  }
}

.search-section {
  margin-bottom: 20px;
  
  .search-input-wrapper {
    position: relative;
    
    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      color: #999;
    }
    
    .search-input {
      width: 100%;
      padding: 10px 12px 10px 40px;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      
      &:focus {
        outline: none;
        border-color: #007bff;
      }
    }
  }
}

.recent-chats {
  h4 {
    margin: 0 0 15px 0;
    font-size: 16px;
    color: #333;
  }
}

.chat-list {
  max-height: 300px;
  overflow-y: auto;
}

.chat-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  
  &:hover {
    background: #f8f9fa;
  }
  
  &.selected {
    background: #e3f2fd;
    border-color: #2196f3;
  }
  
  img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    margin-right: 12px;
  }
  
  .chat-info {
    flex: 1;
    
    .chat-name {
      font-size: 14px;
      color: #333;
      margin-bottom: 2px;
    }
    
    .chat-type {
      font-size: 12px;
      color: #999;
    }
  }
  
  .selected-mark {
    width: 20px;
    height: 20px;
    background: #2196f3;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    
    .check-icon {
      width: 12px;
      height: 12px;
      color: white;
    }
  }
}

.dialog-footer {
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  
  button {
    padding: 8px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  
  .cancel-btn {
    background: #f8f9fa;
    color: #6c757d;
    border: 1px solid #dee2e6;
    
    &:hover {
      background: #e9ecef;
    }
  }
  
  .forward-btn {
    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
    color: white;
    
    &:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }
    
    &:not(:disabled):hover {
      background: linear-gradient(135deg, #0056b3 0%, #003d82 100%);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
    }
  }
}
</style>
