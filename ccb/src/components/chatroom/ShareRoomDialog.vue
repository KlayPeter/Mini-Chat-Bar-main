<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog-content">
      <div class="dialog-header">
        <h3>分享聊天室邀请</h3>
        <button @click="$emit('close')" class="close-btn">×</button>
      </div>
      
      <div class="dialog-body">
        <!-- 聊天室预览卡片 -->
        <div class="room-preview-card">
          <div class="card-icon">
            <Code :size="32" />
          </div>
          <div class="card-info">
            <h4>{{ room.RoomName }}</h4>
            <div class="card-meta">
              <span class="tech-tag" v-if="room.techDirection">{{ room.techDirection }}</span>
              <span class="member-count">{{ room.Members?.length || 0 }} 人参与</span>
            </div>
            <p v-if="room.Announcement" class="card-desc">{{ room.Announcement }}</p>
          </div>
        </div>
        
        <!-- 选择转发目标 -->
        <div class="share-section">
          <h4>转发到</h4>
          
          <!-- Tab 切换 -->
          <div class="tab-bar">
            <button 
              :class="['tab-item', { active: shareTab === 'friends' }]"
              @click="shareTab = 'friends'"
            >
              好友
            </button>
            <button 
              :class="['tab-item', { active: shareTab === 'groups' }]"
              @click="shareTab = 'groups'"
            >
              群聊
            </button>
          </div>
          
          <!-- 搜索框 -->
          <div class="search-box">
            <Search :size="16" />
            <input 
              v-model="searchQuery" 
              type="text" 
              :placeholder="shareTab === 'friends' ? '搜索好友...' : '搜索群聊...'"
            />
          </div>
          
          <!-- 列表 -->
          <div class="target-list">
            <!-- 空状态 -->
            <div v-if="filteredTargets.length === 0" class="empty-state">
              <div class="empty-icon">
                <Search :size="32" />
              </div>
              <p>{{ searchQuery ? '未找到匹配的结果' : (shareTab === 'friends' ? '暂无好友' : '暂无群聊') }}</p>
            </div>
            
            <!-- 列表项 -->
            <div 
              v-for="target in filteredTargets" 
              :key="target.id"
              @click="selectTarget(target)"
              class="target-item"
              :class="{ selected: selectedTargets.includes(target.id) }"
            >
              <div class="target-avatar-wrapper">
                <!-- 好友头像 -->
                <img 
                  v-if="target.type === 'friend'"
                  :src="target.avatar" 
                  :alt="target.name"
                  class="target-avatar"
                  @error="handleAvatarError"
                />
                <!-- 群聊组合头像 -->
                <GroupAvatar 
                  v-else
                  :members="target.members"
                  :size="44"
                />
              </div>
              <div class="target-info">
                <span class="target-name">{{ target.name }}</span>
                <span class="target-type">{{ target.type === 'friend' ? '好友' : '群聊' }}</span>
              </div>
              <div class="checkbox" v-if="selectedTargets.includes(target.id)">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M13.5 4L6 11.5L2.5 8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="dialog-footer">
        <button @click="$emit('close')" class="cancel-btn">取消</button>
        <button 
          @click="shareInvite" 
          class="submit-btn" 
          :disabled="selectedTargets.length === 0"
        >
          发送 ({{ selectedTargets.length }})
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Code, Search } from 'lucide-vue-next'
import axios from 'axios'
import { useToast } from '../../composables/useToast'
import GroupAvatar from '../contact/GroupAvatar.vue'

const props = defineProps({
  room: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])
const toast = useToast()
const baseUrl = import.meta.env.VITE_BASE_URL

const shareTab = ref('friends')
const searchQuery = ref('')
const selectedTargets = ref([])
const friends = ref([])
const groups = ref([])
const failedAvatars = new Set() // 记录加载失败的头像，避免循环请求

const filteredTargets = computed(() => {
  const source = shareTab.value === 'friends' ? friends.value : groups.value
  if (!searchQuery.value) return source
  
  const query = searchQuery.value.toLowerCase()
  return source.filter(item => item.name.toLowerCase().includes(query))
})

function selectTarget(target) {
  const index = selectedTargets.value.indexOf(target.id)
  if (index > -1) {
    selectedTargets.value.splice(index, 1)
  } else {
    selectedTargets.value.push(target.id)
  }
}

// 处理头像加载错误 - 避免循环请求
function handleAvatarError(event) {
  const imgSrc = event.target.src
  
  // 如果已经是默认头像了，不再处理
  if (imgSrc.includes('default-avatar.webp')) {
    return
  }
  
  // 如果这个 URL 已经失败过，不再重试
  if (failedAvatars.has(imgSrc)) {
    return
  }
  
  failedAvatars.add(imgSrc)
  event.target.src = baseUrl + '/images/avatar/default-avatar.webp'
}

async function loadFriends() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${baseUrl}/api/user/friends`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    const friendList = Array.isArray(res.data) ? res.data : (res.data.friends || [])
    
    friends.value = friendList.map(f => {
      let avatarUrl = f.uAvatar || '/images/avatar/default-avatar.webp'
      
      if (!avatarUrl.startsWith('http')) {
        avatarUrl = baseUrl + avatarUrl
      }
      
      return {
        id: f.uID,
        name: f.uName,
        avatar: avatarUrl,
        type: 'friend'
      }
    })
  } catch (err) {
    console.error('加载好友列表失败:', err)
    toast.error('加载好友列表失败')
  }
}

async function loadGroups() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${baseUrl}/room/list`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    const groupList = res.data.groups || []
    
    groups.value = groupList.map(g => {
      return {
        id: g.RoomID,
        name: g.RoomName,
        avatar: null, // 不使用单一头像
        members: g.Members || [], // 保存成员信息用于生成组合头像
        type: 'group'
      }
    })
  } catch (err) {
    console.error('加载群聊列表失败:', err)
    toast.error('加载群聊列表失败')
  }
}

async function shareInvite() {
  if (selectedTargets.value.length === 0) {
    toast.error('请选择转发目标')
    return
  }
  
  try {
    const token = localStorage.getItem('token')
    
    // 构建邀请卡片消息 - 根据聊天室类型处理
    const inviteCard = {
      type: 'chatroom_invite',
      roomId: props.room.RoomID,
      roomName: props.room.RoomName,
      techDirection: props.room.techDirection,
      memberCount: props.room.Members?.length || 0,
      announcement: props.room.Announcement,
      expiresAt: props.room.expiresAt,
      joinType: props.room.joinType
    }
    
    // 根据加入方式决定是否包含邀请码
    // public: 公开，直接加入，不需要邀请码
    // invite: 邀请码方式，需要邀请码
    // password: 密码方式，不透露密码，只分享聊天室信息
    if (props.room.joinType === 'invite' && props.room.inviteCode) {
      inviteCard.inviteCode = props.room.inviteCode
    }
    
    // 发送到选中的目标
    for (const targetId of selectedTargets.value) {
      const target = [...friends.value, ...groups.value].find(t => t.id === targetId)
      
      if (target.type === 'friend') {
        // 发送私聊消息 - 正确的路径是 /api/chat/messages/:id
        await axios.post(
          `${baseUrl}/api/chat/messages/${targetId}`,
          {
            content: JSON.stringify(inviteCard),
            messageType: 'chatroom_invite'
          },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      } else {
        // 发送群聊消息
        await axios.post(
          `${baseUrl}/room/${targetId}/messages`,
          {
            content: JSON.stringify(inviteCard),
            messageType: 'chatroom_invite'
          },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      }
    }
    
    toast.success(`已发送到 ${selectedTargets.value.length} 个目标`)
    emit('close')
  } catch (err) {
    console.error('分享失败:', err)
    toast.error('分享失败')
  }
}

onMounted(() => {
  loadFriends()
  loadGroups()
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
  z-index: 2000;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.dialog-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e8e8e8;
  
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
    font-size: 24px;
    color: #999;
    cursor: pointer;
    border-radius: 6px;
    
    &:hover {
      background: #f5f5f5;
      color: #333;
    }
  }
}

.dialog-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}

.room-preview-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(165, 42, 42, 0.05) 0%, rgba(165, 42, 42, 0.02) 100%);
  border-radius: 12px;
  border: 1px solid rgba(165, 42, 42, 0.1);
  margin-bottom: 20px;
  
  .card-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    background: linear-gradient(135deg, rgb(165, 42, 42) 0%, rgb(140, 30, 30) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
  }
  
  .card-info {
    flex: 1;
    min-width: 0;
    
    h4 {
      margin: 0 0 6px 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
    
    .card-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      
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
    
    .card-desc {
      margin: 0;
      font-size: 13px;
      color: #666;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.share-section {
  h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }
}

.tab-bar {
  display: flex;
  border-bottom: 1px solid #e8e8e8;
  margin-bottom: 12px;
  
  .tab-item {
    flex: 1;
    padding: 10px;
    border: none;
    background: transparent;
    font-size: 14px;
    color: #666;
    cursor: pointer;
    position: relative;
    transition: all 0.2s;
    
    &.active {
      color: rgb(165, 42, 42);
      font-weight: 500;
      
      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: rgb(165, 42, 42);
      }
    }
  }
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 12px;
  
  svg {
    color: #999;
    flex-shrink: 0;
  }
  
  input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 14px;
    color: #333;
    
    &:focus {
      outline: none;
    }
    
    &::placeholder {
      color: #bbb;
    }
  }
}

.target-list {
  max-height: 300px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #d0d0d0;
    border-radius: 3px;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #999;
  
  .empty-icon {
    margin-bottom: 12px;
    opacity: 0.5;
  }
  
  p {
    margin: 0;
    font-size: 14px;
  }
}

.target-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  
  &:hover {
    background: #f5f5f5;
  }
  
  &.selected {
    background: rgba(165, 42, 42, 0.05);
    border-color: rgba(165, 42, 42, 0.2);
  }
  
  .target-avatar-wrapper {
    position: relative;
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    overflow: hidden;
  }
  
  .target-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #f0f0f0;
    background: #f9f9f9;
  }
  
  .target-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .target-name {
    font-size: 15px;
    font-weight: 500;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .target-type {
    font-size: 12px;
    color: #999;
  }
  
  .checkbox {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgb(165, 42, 42);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 2px 4px rgba(165, 42, 42, 0.2);
  }
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e8e8e8;
  
  button {
    flex: 1;
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    
    &.cancel-btn {
      background: #f5f5f5;
      color: #666;
      
      &:hover {
        background: #e8e8e8;
      }
    }
    
    &.submit-btn {
      background: linear-gradient(135deg, rgb(165, 42, 42) 0%, rgb(140, 30, 30) 100%);
      color: white;
      
      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(165, 42, 42, 0.3);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
}
</style>
