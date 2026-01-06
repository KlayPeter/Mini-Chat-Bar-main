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
        <div v-if="recentChats.length > 0" class="chat-section">
          <h4>最近聊天</h4>
          <div class="chat-list">
            <div
              v-for="chat in filteredRecentChats"
              :key="chat.id"
              class="chat-item"
              :class="{ selected: selectedTargets.includes(chat.id) }"
              @click="toggleTarget(chat)"
            >
              <GroupAvatar v-if="chat.type === 'group'" :members="chat.members || []" :size="30" />
              <img v-else :src="chat.avatar || '/images/avatar/default-avatar.webp'" :alt="chat.name" class="avatar-img" />
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

        <!-- 好友列表 -->
        <div v-if="friends.length > 0" class="chat-section">
          <h4>好友 ({{ friends.length }})</h4>
          <div class="chat-list">
            <div
              v-for="friend in filteredFriends"
              :key="friend.id"
              class="chat-item"
              :class="{ selected: selectedTargets.includes(friend.id) }"
              @click="toggleTarget(friend)"
            >
              <img :src="friend.avatar || '/images/avatar/default-avatar.webp'" :alt="friend.name" class="avatar-img" />
              <div class="chat-info">
                <div class="chat-name">{{ friend.name }}</div>
                <div class="chat-type">好友</div>
              </div>
              <div v-if="selectedTargets.includes(friend.id)" class="selected-mark">
                <Check class="check-icon" />
              </div>
            </div>
          </div>
        </div>

        <!-- 群聊列表 -->
        <div v-if="groups.length > 0" class="chat-section">
          <h4>群聊 ({{ groups.length }})</h4>
          <div class="chat-list">
            <div
              v-for="group in filteredGroups"
              :key="group.id"
              class="chat-item"
              :class="{ selected: selectedTargets.includes(group.id) }"
              @click="toggleTarget(group)"
            >
              <GroupAvatar :members="group.members || []" :size="30" />
              <div class="chat-info">
                <div class="chat-name">{{ group.name }}</div>
                <div class="chat-type">群聊</div>
              </div>
              <div v-if="selectedTargets.includes(group.id)" class="selected-mark">
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
import GroupAvatar from './GroupAvatar.vue'

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
const recentChats = ref([])
const friends = ref([])
const groups = ref([])
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

// 过滤最近聊天
const filteredRecentChats = computed(() => {
  if (!searchText.value) return recentChats.value
  
  return recentChats.value.filter(chat => 
    chat.name.toLowerCase().includes(searchText.value.toLowerCase())
  )
})

// 过滤好友列表
const filteredFriends = computed(() => {
  if (!searchText.value) return friends.value
  
  return friends.value.filter(friend => 
    friend.name.toLowerCase().includes(searchText.value.toLowerCase())
  )
})

// 过滤群聊列表
const filteredGroups = computed(() => {
  if (!searchText.value) return groups.value
  
  return groups.value.filter(group => 
    group.name.toLowerCase().includes(searchText.value.toLowerCase())
  )
})

// 加载所有数据
async function loadAllData() {
  // 先并行加载好友和群聊
  await Promise.all([
    loadFriends(),
    loadGroups()
  ])
  // 然后基于已加载的数据生成最近聊天
  loadRecentChats()
}

// 加载好友列表
async function loadFriends() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${baseUrl}/api/user/friends`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (res.data && Array.isArray(res.data)) {
      friends.value = res.data.map(friend => ({
        id: `friend_${friend.uID}`,
        type: 'friend',
        name: friend.uName,
        avatar: friend.uAvatar,
        targetId: friend.uID
      }))
    } else {
      friends.value = []
    }
  } catch (err) {
    console.warn('获取好友列表失败:', err)
    friends.value = []
  }
}

// 加载群聊列表
async function loadGroups() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${baseUrl}/room/list`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (res.data.success && res.data.groups) {
      groups.value = res.data.groups.map(group => ({
        id: `group_${group.RoomID}`,
        type: 'group',
        name: group.RoomName,
        avatar: null, // 群聊使用GroupAvatar组件
        targetId: group.RoomID,
        members: group.Members || [] // 提供群成员数据给GroupAvatar
      }))
    } else {
      groups.value = []
    }
  } catch (err) {
    console.warn('获取群聊列表失败:', err)
    groups.value = []
  }
}

// 加载最近聊天列表（最多10个）
async function loadRecentChats() {
  try {
    // 简单实现：取前5个好友和前5个群聊作为最近聊天
    const recentFriends = friends.value.slice(0, 5)
    const recentGroups = groups.value.slice(0, 5)
    
    recentChats.value = [...recentFriends, ...recentGroups].slice(0, 10)
  } catch (err) {
    console.warn('生成最近聊天列表失败:', err)
    recentChats.value = []
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
      // 在所有列表中查找目标
      const allTargets = [...recentChats.value, ...friends.value, ...groups.value]
      const target = allTargets.find(chat => chat.id === targetId)
      if (!target) continue
      
      for (const message of props.messages) {
        const forwardData = {
          content: message.content,
          messageType: message.messageType,
          fileInfo: message.fileInfo || null
        }
        
        if (target.type === 'friend') {
          // 转发给好友
          const res = await axios.post(`${baseUrl}/api/chat/messages/${target.targetId}`, forwardData, {
            headers: { Authorization: `Bearer ${token}` }
          })
          
          console.log('私聊转发API响应:', res.data)
          
          // 转发成功后，通知私聊界面更新消息
          if (res.data.success || res.data) {
            const messageData = res.data.message || res.data
            console.log('私聊转发消息数据:', messageData)
            console.log('原始转发数据:', forwardData)
            
            // 构建正确的消息对象
            const correctMessage = {
              content: forwardData.content, // 使用原始转发内容
              messageType: forwardData.messageType || 'text',
              time: messageData.time || new Date().toISOString(),
              from: messageData.from || localStorage.getItem('userId'),
              to: target.targetId
            }
            
            emitPrivateMessageUpdate(target, correctMessage, forwardData)
            // 通知私聊列表更新最新消息
            emitPrivateChatListUpdate(target, correctMessage, forwardData)
            // 发送Socket通知给接收方
            emitPrivateSocketNotification(target, correctMessage, forwardData)
          }
        } else if (target.type === 'group') {
          // 转发到群聊
          const res = await axios.post(`${baseUrl}/room/${target.targetId}/messages`, forwardData, {
            headers: { Authorization: `Bearer ${token}` }
          })
          
          // 转发成功后，通知群聊界面更新消息
          if (res.data.success) {
            emitGroupMessageUpdate(target, res.data.message, forwardData)
            // 通知GroupList更新目标群聊的最新消息
            emitGroupListUpdate(target, res.data.message, forwardData)
            // 发送Socket广播给其他群成员
            emitGroupSocketBroadcast(target, res.data.message, forwardData)
          }
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

// 发送群聊消息更新通知
function emitGroupMessageUpdate(target, serverMessage, forwardData) {
  try {
    console.log('🔥 ForwardDialog: 发送群聊消息更新事件')
    console.log('目标群聊ID:', target.targetId)  
    console.log('服务器返回消息:', serverMessage)
    
    // 通过全局事件总线通知群聊界面更新消息
    const messageUpdateEvent = new CustomEvent('group-message-forwarded', {
      detail: {
        roomId: target.targetId,
        message: serverMessage,
        forwardData: forwardData
      }
    })
    window.dispatchEvent(messageUpdateEvent)
    console.log('🔥 ForwardDialog: 群聊消息更新事件已发送')
  } catch (err) {
    console.error('发送群聊消息更新通知失败:', err)
  }
}

// 发送私聊消息更新通知
function emitPrivateMessageUpdate(target, serverMessage, forwardData) {
  try {
    // 通过全局事件总线通知私聊界面更新消息
    const messageUpdateEvent = new CustomEvent('private-message-forwarded', {
      detail: {
        userId: target.targetId,
        message: serverMessage,
        forwardData: forwardData
      }
    })
    window.dispatchEvent(messageUpdateEvent)
  } catch (err) {
    console.warn('发送私聊消息更新通知失败:', err)
  }
}

// 发送GroupList更新通知
function emitGroupListUpdate(target, serverMessage, forwardData) {
  try {
    console.log('📋 ForwardDialog: 发送GroupList更新事件')
    console.log('目标群聊ID:', target.targetId)
    
    // 通知GroupList更新目标群聊的最新消息，格式为"我：消息内容"
    const groupListUpdateEvent = new CustomEvent('group-list-message-update', {
      detail: {
        roomId: target.targetId,
        message: {
          ...serverMessage,
          fromName: '我', // 显示为"我"
          content: serverMessage.content
        },
        forwardData: forwardData
      }
    })
    window.dispatchEvent(groupListUpdateEvent)
    console.log('📋 ForwardDialog: GroupList更新事件已发送')
  } catch (err) {
    console.error('发送GroupList更新通知失败:', err)
  }
}

// 发送群聊Socket广播
function emitGroupSocketBroadcast(target, serverMessage, forwardData) {
  try {
    console.log('🔥 ForwardDialog: 发送群聊Socket广播')
    
    // 通过全局事件通知其他组件进行Socket广播
    const socketBroadcastEvent = new CustomEvent('group-socket-broadcast', {
      detail: {
        roomId: target.targetId,
        message: serverMessage,
        forwardData: forwardData
      }
    })
    window.dispatchEvent(socketBroadcastEvent)
    console.log('🔥 ForwardDialog: Socket广播事件已发送')
  } catch (err) {
    console.error('发送Socket广播失败:', err)
  }
}

// 发送私聊列表更新通知
function emitPrivateChatListUpdate(target, serverMessage, forwardData) {
  try {
    console.log('💬 ForwardDialog: 发送私聊列表更新事件')
    console.log('目标用户ID:', target.targetId)
    console.log('消息内容:', serverMessage.content)
    
    // 通知私聊列表更新最新消息，格式为"我：消息内容"
    const privateChatListUpdateEvent = new CustomEvent('private-chat-list-update', {
      detail: {
        userId: target.targetId,
        message: {
          ...serverMessage,
          fromName: '我', // 显示为"我"
          content: serverMessage.content
        },
        forwardData: forwardData
      }
    })
    window.dispatchEvent(privateChatListUpdateEvent)
    console.log('💬 ForwardDialog: 私聊列表更新事件已发送')
  } catch (err) {
    console.error('发送私聊列表更新通知失败:', err)
  }
}

// 发送私聊Socket通知
function emitPrivateSocketNotification(target, serverMessage, forwardData) {
  try {
    console.log('🔔 ForwardDialog: 发送私聊Socket通知')
    console.log('目标用户ID:', target.targetId)
    console.log('消息内容:', serverMessage.content)
    
    // 通过全局事件通知其他组件进行私聊Socket通知
    const privateSocketEvent = new CustomEvent('private-socket-notification', {
      detail: {
        userId: target.targetId,
        message: serverMessage,
        forwardData: forwardData
      }
    })
    window.dispatchEvent(privateSocketEvent)
    console.log('🔔 ForwardDialog: 私聊Socket通知事件已发送')
  } catch (err) {
    console.error('发送私聊Socket通知失败:', err)
  }
}

onMounted(() => {
  loadAllData()
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

.chat-section {
  margin-bottom: 25px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  h4 {
    margin: 0 0 15px 0;
    font-size: 16px;
    color: #333;
    padding-bottom: 8px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    align-items: center;
    gap: 8px;
    
    &::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 16px;
      background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
      border-radius: 2px;
    }
  }
  
  .chat-list {
    max-height: 200px;
    overflow-y: auto;
  }
}

.chat-list {
  max-height: 300px;
  overflow-y: auto;
}

.chat-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    background: rgba(0, 123, 255, 0.1);
  }

  &.selected {
    background: linear-gradient(135deg, rgba(0, 123, 255, 0.1) 0%, rgba(0, 86, 179, 0.1) 100%);
    border-left: 3px solid #007bff;
  }

  .avatar-img {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    margin-right: 12px;
    flex-shrink: 0;
    object-fit: cover;
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
