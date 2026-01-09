<template>
  <div class="group-list">
    <div class="header">
      <h3>群聊</h3>
      <button class="create-btn" @click="showCreateDialog = true">
        <Plus class="create-icon" /> 创建群聊
      </button>
    </div>

    <div class="groups">
      <div
        v-for="group in groups"
        :key="group.RoomID"
        class="group-item"
        :class="{ active: currentGroupId === group.RoomID }"
        @click="selectGroup(group)"
      >
        <div class="group-avatar">
          <GroupAvatar :members="group.Members" :size="45" />
          <!-- @提醒红色标记 -->
          <span v-if="hasMentionAlert(group.RoomID)" class="mention-badge">有人@你</span>
          <!-- 未读消息数字红点 -->
          <span v-else-if="getUnreadCount(group.RoomID) > 0" class="unread-count-badge">
            {{ getUnreadCount(group.RoomID) > 99 ? '99+' : getUnreadCount(group.RoomID) }}
          </span>
        </div>
        <div class="group-info">
          <div class="group-name-row">
            <span class="group-name">{{ group.RoomName }}</span>
            <span class="member-count">({{ group.Members.length }})</span>
            <span class="last-time">{{ getLastTime(group) }}</span>
          </div>
          <div class="last-message">{{ getLastMessage(group) }}</div>
        </div>
      </div>
    </div>

    <!-- 创建群聊对话框 -->
    <div v-if="showCreateDialog" class="dialog-overlay" @click="showCreateDialog = false">
      <div class="dialog" @click.stop>
        <div class="dialog-header">
          <h3>创建群聊</h3>
          <button class="close-btn" @click="showCreateDialog = false">×</button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>群名称</label>
            <input
              v-model="newGroupName"
              type="text"
              placeholder="请输入群名称"
              maxlength="20"
            />
          </div>
          <div class="form-group">
            <label>选择成员</label>
            <div class="friend-list">
              <div
                v-for="friend in friends"
                :key="friend.uID"
                class="friend-item"
                @click="toggleFriend(friend.uID)"
              >
                <input type="checkbox" :checked="selectedFriends.includes(friend.uID)" />
                <img :src="friend.uAvatar" alt="头像" />
                <span>{{ friend.uName }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="cancel-btn" @click="showCreateDialog = false">取消</button>
          <button class="confirm-btn" @click="createGroup" :disabled="!newGroupName">
            创建
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import axios from 'axios'
import { io } from 'socket.io-client'
import { Plus } from '@iconoir/vue'
import GroupAvatar from './GroupAvatar.vue'
import { useToast } from '../composables/useToast'

const baseUrl = import.meta.env.VITE_BASE_URL
const toast = useToast()

const emit = defineEmits(['select-group'])

const groups = ref([])
const friends = ref([])
const currentGroupId = ref('')
const showCreateDialog = ref(false)
const newGroupName = ref('')
const selectedFriends = ref([])
const groupLastMessages = ref({})
const unreadGroups = ref(new Set()) // 存储有未读消息的群ID
const unreadCounts = ref({}) // 存储每个群的未读消息数量
const mentionAlerts = ref(new Set()) // 存储有@提醒的群ID
let socket = null // Socket连接实例

// 获取群聊列表
async function loadGroups() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${baseUrl}/room/list`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.data.success) {
      groups.value = res.data.groups
      
      // 加载每个群的最后一条消息
      for (const group of groups.value) {
        loadLastMessage(group.RoomID)
      }
      
      // 关键修复：加载完群聊后立即通知GroupChat加入所有Socket房间      joinAllGroupRooms()
    }
  } catch (err) {
    console.error('获取群聊列表失败:', err)
  }
}

// 获取群的最后一条消息
async function loadLastMessage(roomId) {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(
      `${baseUrl}/room/${roomId}/messages?limit=1`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )
    if (res.data.success && res.data.messages.length > 0) {
      const lastMsg = res.data.messages[res.data.messages.length - 1]
      
      // 应用"自己的消息显示我"的逻辑
      const currentUserId = localStorage.getItem('userId')
      const isMyMessage = String(lastMsg.from) === String(currentUserId)
      const displayName = isMyMessage ? '我' : lastMsg.fromName
      
      groupLastMessages.value[roomId] = {
        ...lastMsg,
        fromName: displayName  // 应用显示逻辑
      }
    }
  } catch (err) {
    console.error('获取最后消息失败:', err)
  }
}

// 获取好友列表
async function loadFriends() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${baseUrl}/api/user/friends`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    friends.value = res.data
  } catch (err) {
    console.error('获取好友列表失败:', err)
  }
}

// 选择群聊
function selectGroup(group) {
  currentGroupId.value = group.RoomID
  // 清除该群的未读标记和@提醒
  unreadGroups.value.delete(group.RoomID)
  unreadCounts.value[group.RoomID] = 0
  mentionAlerts.value.delete(group.RoomID)
  emit('select-group', group)
}

// 检查是否有未读消息
function hasUnreadMessages(roomId) {
  return unreadGroups.value.has(roomId)
}

// 获取未读消息数量
function getUnreadCount(roomId) {
  const count = unreadCounts.value[roomId] || 0
  console.log(`getUnreadCount(${roomId}): ${count}`)
  return count
}

// 检查是否有@提醒
function hasMentionAlert(roomId) {
  const hasMention = mentionAlerts.value.has(roomId)
  console.log(`hasMentionAlert(${roomId}): ${hasMention}`)
  return hasMention
}

// 标记群聊有新消息（可以从socket事件调用）
function markGroupAsUnread(roomId, messageContent, senderName) {  if (roomId !== currentGroupId.value) {    // 添加未读群组
    unreadGroups.value.add(roomId)
    console.log('未读群组列表:', Array.from(unreadGroups.value))
    
    // 增加未读消息数量
    const oldCount = unreadCounts.value[roomId] || 0
    unreadCounts.value[roomId] = oldCount + 1    // 更新群聊列表中的最新消息显示
    if (messageContent && senderName) {
      groupLastMessages.value[roomId] = {
        content: messageContent,
        fromName: senderName,
        messageType: 'text',
        createdAt: new Date()
      }    } else {    }  } else {  }
}

// 标记群聊有@提醒
function markGroupAsMentioned(roomId) {  if (roomId !== currentGroupId.value) {    // 添加@提醒标记
    mentionAlerts.value.add(roomId)
    console.log('@提醒列表:', Array.from(mentionAlerts.value))
    
    // 也添加到未读群组列表
    unreadGroups.value.add(roomId)
    console.log('未读群组列表:', Array.from(unreadGroups.value))  } else {  }
}

// 切换好友选择
function toggleFriend(friendId) {
  const index = selectedFriends.value.indexOf(friendId)
  if (index > -1) {
    selectedFriends.value.splice(index, 1)
  } else {
    selectedFriends.value.push(friendId)
  }
}

// 创建群聊
async function createGroup() {
  if (!newGroupName.value.trim()) {
    toast.warning('请输入群名称');
    return;
  }

  try {
    const token = localStorage.getItem('token')

    const res = await axios.post(
      `${baseUrl}/room/create`,
      {
        groupName: newGroupName.value,
        memberIds: selectedFriends.value
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )

    if (res.data.success) {
      toast.success('群聊创建成功！');
      showCreateDialog.value = false
      newGroupName.value = ''
      selectedFriends.value = []

      // 重新加载群聊列表
      await loadGroups()

      // 自动选择新创建的群聊
      if (res.data.room) {
        selectGroup(res.data.room)
      }
    } else {
      toast.error('创建失败: ' + (res.data.message || '未知错误'));
    }
  } catch (err) {
    console.error('创建群聊失败:', err)
    toast.error('创建群聊失败: ' + (err.response?.data?.message || err.message));
  }
}

// 获取最后一条消息
function getLastMessage(group) {
  const lastMsg = groupLastMessages.value[group.RoomID]
  console.log(`getLastMessage(${group.RoomID}):`, lastMsg)
  
  if (!lastMsg) return '暂无消息'
  
  if (lastMsg.messageType === 'system') {
    return lastMsg.content
  }
  
  let displayContent = ''
  
  // 根据消息类型显示不同的描述
  switch (lastMsg.messageType) {
    case 'image':
      displayContent = '[图片]'
      break
    case 'file':
      displayContent = '[文件]'
      break
    case 'audio':
      displayContent = '[语音]'
      break
    case 'video':
      displayContent = '[视频]'
      break
    case 'text':
    default:
      displayContent = lastMsg.content || '[消息]'
      // 限制文本长度
      if (displayContent.length > 20) {
        displayContent = displayContent.substring(0, 20) + '...'
      }
      break
  }
  
  const result = `${lastMsg.fromName}: ${displayContent}`  return result
}

// 获取最后一条消息的时间（仿照私聊列表的时间格式）
function getLastTime(group) {
  const lastMsg = groupLastMessages.value[group.RoomID]
  if (!lastMsg || !lastMsg.time) return ''
  
  return formatDate(lastMsg.time)
}

// 时间格式化函数（与LastChats.vue保持一致）
function formatDate(dateStr) {
  const date = new Date(dateStr)
  const current_date = new Date()
  if (date.toLocaleDateString() === current_date.toLocaleDateString()) {
    return isNaN(date.getTime()) ? '' : date.toLocaleTimeString().slice(0, 5)
  } else {
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString().slice(0, 10)
  }
}


// 加入所有群聊Socket房间
function joinAllGroupRooms() {  console.log('当前群聊列表:', groups.value.map(g => ({id: g.RoomID, name: g.RoomName})))
  
  // 从localStorage获取当前用户ID
  const userId = localStorage.getItem('userId')  // 发出自定义事件通知父组件GroupChat
  const event = new CustomEvent('joinAllRooms', {
    detail: {
      groups: groups.value,
      userId: userId
    }
  })
  
  // 通过window分发事件给GroupChat监听
  window.dispatchEvent(event)}

// 给GroupList添加独立的Socket监听，就像私聊一样！
let groupSocket = null

function initGroupSocket() {
  // 使用socket.io创建独立连接，配置重连和稳定性选项
  groupSocket = io(baseUrl, {
    transports: ['websocket', 'polling'],
    upgrade: true,
    rememberUpgrade: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 20000,
    forceNew: false
  })
  
  groupSocket.on('connect', () => {    console.log('👤 用户ID:', localStorage.getItem('userId'))    // 发送用户登录事件，就像私聊那样
    groupSocket.emit('login', localStorage.getItem('userId'))
    
    // 延迟加入房间，确保连接稳定
    setTimeout(() => {
      joinAllRooms()
    }, 500)
  })
  
  // 专门的房间加入函数
  function joinAllRooms() {    groups.value.forEach(group => {
      // 发送多种房间加入事件，确保兼容性
      groupSocket.emit('join-group', {
        roomId: group.RoomID,
        userId: localStorage.getItem('userId')
      })
      groupSocket.emit('join-room', group.RoomID)
      groupSocket.emit('join', group.RoomID)      // 验证房间加入状态
      setTimeout(() => {
        groupSocket.emit('room-status', group.RoomID)
      }, 1000)
    })
  }
  
  // 重连时重新加入所有房间
  groupSocket.on('reconnect', () => {    setTimeout(() => {
      joinAllRooms()
    }, 1000)
  })
  
  // 独立监听群聊消息
  groupSocket.on('group-message', (data) => {
    // 健壮性修复：如果服务器发送残缺数据，直接跳过处理
    if (!data.roomId || !data.content) {
      console.warn('⚠️ GroupList收到残缺群消息数据，跳过处理:', data)
      return
    }
    
    const messageContent = data.content
    const currentUserId = localStorage.getItem('userId')
    
    // 获取消息类型和显示名称
    const messageType = data.messageType || 'text'
    const isMyMessage = String(data.from) === String(currentUserId)
    const displayName = isMyMessage ? '我' : data.fromName
    
    groupLastMessages.value[data.roomId] = {
      content: messageContent,
      fromName: displayName,  // 自己的消息显示"我"，别人的显示真实姓名
      createdAt: new Date(),
      messageType: messageType
    }
    
    // 只对其他群聊（非当前群聊）处理未读状态和@提及
    if (data.roomId !== currentGroupId.value) {
      // 检测@提及
      if (messageContent.includes('@')) {
        const userDisplayName = getCurrentUserDisplayName()
        
        if (messageContent.includes(`@${userDisplayName}`) || messageContent.includes('@全体成员')) {
          markGroupAsMentioned(data.roomId)
          sortGroupsByActivity()
          return
        }
      }
      
      // 通过markGroupAsUnread统一处理未读数量
      markGroupAsUnread(data.roomId, messageContent, displayName)
    } else {
      // 如果是当前用户在当前群聊发送的消息，自动清除未读状态
      if (data.from === currentUserId) {
        unreadGroups.value.delete(data.roomId)
        unreadCounts.value[data.roomId] = 0
        mentionAlerts.value.delete(data.roomId)
      }
    }
    
    // 总是触发排序，确保消息顺序正确
    sortGroupsByActivity()
  })
  
  // 监听@提及通知事件
  groupSocket.on('mention-notification', (data) => {    console.log('完整数据:', JSON.stringify(data, null, 2))
    console.log('当前用户ID:', localStorage.getItem('userId'))    // 先强制测试，无论什么情况都标记@提醒
    if (data.roomId && data.roomId !== currentGroupId.value) {      markGroupAsMentioned(data.roomId)
      return
    }
    
    const currentUserId = localStorage.getItem('userId')
    
    // 检查是否有mentions数组
    if (!data.mentions) {      return
    }    // 详细检查是否@了当前用户
    const isMentioned = data.mentions.some(mention => {      if (mention.type === 'all') {        return true
      }
      
      if (mention.type === 'user') {
        // 确保字符串比较
        const mentionId = String(mention.userId)
        const currentId = String(currentUserId)
        const isMatch = mentionId === currentId        return isMatch
      }
      
      return false
    })    if (isMentioned && data.roomId !== currentGroupId.value) {      markGroupAsMentioned(data.roomId)
      
      // 播放提示音
      try {
        const audio = new Audio('/sounds/mention-notification.mp3')
        audio.volume = 0.3
        audio.play().catch(() => {        })
      } catch (err) {      }
    } else {
      if (!isMentioned) {      }
      if (data.roomId === currentGroupId.value) {      }
    }
  })
  
  groupSocket.on('disconnect', () => {  })
  
  groupSocket.on('connect_error', (error) => {
    console.error('🎯 GroupList Socket连接错误:', error)
  })
}

// 实现群聊的updateGroupMessage函数，就像私聊的updateFriendMessage
async function updateGroupMessage(roomId) {  try {
    const token = localStorage.getItem('token')
    
    // 获取群聊最新消息
    const msgRes = await axios.get(`${baseUrl}/room/${roomId}/messages?limit=1`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (msgRes.data.success && msgRes.data.messages.length > 0) {
      const lastMsg = msgRes.data.messages[msgRes.data.messages.length - 1]
      
      // 🔧 修复：应用"自己的消息显示我"的逻辑
      const currentUserId = localStorage.getItem('userId')
      const isMyMessage = String(lastMsg.from) === String(currentUserId)
      const displayName = isMyMessage ? '我' : lastMsg.fromName      // 更新数据，应用显示逻辑
      groupLastMessages.value[roomId] = {
        ...lastMsg,
        fromName: displayName  // 应用显示逻辑
      }      // 🔧 修复：通过markGroupAsUnread统一处理，避免重复计数
      if (roomId !== currentGroupId.value) {        markGroupAsUnread(roomId, lastMsg.content, displayName)
      }
      
      // 关键修复：重新排序群聊列表，有新消息的群聊排到最前面
      sortGroupsByActivity()
    }
  } catch (err) {
    console.error('更新群聊消息失败:', err)
  }
}

// 按活跃度排序群聊列表（有新消息的排前面）
function sortGroupsByActivity() {  console.log('排序前群聊顺序:', groups.value.map(g => ({
    id: g.RoomID,
    name: g.RoomName,
    hasUnread: unreadGroups.value.has(g.RoomID),
    hasMention: mentionAlerts.value.has(g.RoomID),
    lastMsg: groupLastMessages.value[g.RoomID]?.content
  })))
  
  groups.value.sort((a, b) => {
    // 获取最新消息的时间戳
    const aLastMsg = groupLastMessages.value[a.RoomID]
    const bLastMsg = groupLastMessages.value[b.RoomID]
    
    const aTime = aLastMsg ? new Date(aLastMsg.createdAt || aLastMsg.timestamp || 0).getTime() : 0
    const bTime = bLastMsg ? new Date(bLastMsg.createdAt || bLastMsg.timestamp || 0).getTime() : 0
    
    console.log(`比较群聊 ${a.RoomName}(${aTime}) vs ${b.RoomName}(${bTime})`)
    
    // 有未读消息的群聊优先级更高
    const aHasUnread = unreadGroups.value.has(a.RoomID) || mentionAlerts.value.has(a.RoomID)
    const bHasUnread = unreadGroups.value.has(b.RoomID) || mentionAlerts.value.has(b.RoomID)    if (aHasUnread && !bHasUnread) return -1
    if (!aHasUnread && bHasUnread) return 1
    
    // 按最新消息时间降序排序
    return bTime - aTime
  })
  
  console.log('排序后群聊顺序:', groups.value.map(g => ({
    id: g.RoomID,
    name: g.RoomName
  })))}

// 直接更新群聊最新消息（由GroupChat直接调用）
function updateGroupLastMessage(roomId, messageData) {  // 更新最新消息
  groupLastMessages.value[roomId] = messageData  // 触发排序  sortGroupsByActivity()}

// 获取当前用户的显示名称
function getCurrentUserDisplayName() {
  // 尝试从各种可能的存储位置获取用户名
  const possibleNames = [
    localStorage.getItem('userName'),
    localStorage.getItem('userNickname'), 
    localStorage.getItem('displayName'),
    'Alice', // 临时硬编码，可以从其他地方获取
    'Bob'
  ]
  
  const userId = localStorage.getItem('userId')
  
  // 如果是u1就是Alice，u2就是Bob（根据你的测试环境）
  if (userId === 'u1') return 'Alice'
  if (userId === 'u2') return 'Bob'
  
  // 否则返回第一个非空的名称
  return possibleNames.find(name => name && name.trim()) || 'User'
}

// 处理转发消息后的GroupList更新
function handleForwardedGroupListUpdate(event) {  const { roomId, message, forwardData } = event.detail  // 更新目标群聊的最新消息显示
  updateGroupLastMessage(roomId, {
    content: message.content,
    fromName: message.fromName || '转发消息',
    messageType: message.messageType || 'text',
    time: message.time || message.createdAt || new Date().toISOString()
  })}

onMounted(() => {
  loadGroups()
  loadFriends()
  
  // 监听转发消息导致的GroupList更新事件
  window.addEventListener('group-list-message-update', handleForwardedGroupListUpdate)
  
  // 延迟初始化Socket，确保群聊列表已加载
  setTimeout(() => {
    initGroupSocket()
  }, 1000)
})

onUnmounted(() => {
  if (groupSocket) {
    groupSocket.disconnect()
  }
  
  // 清理转发消息更新事件监听器
  window.removeEventListener('group-list-message-update', handleForwardedGroupListUpdate)
})

defineExpose({
  loadGroups,
  markGroupAsUnread,
  markGroupAsMentioned,
  updateGroupLastMessage
})
</script>

<style scoped lang="scss">
.group-list {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
}

.header {
  padding: 15px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  .create-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: var(--primary-gradient, linear-gradient(135deg, rgba(165, 42, 42, 0.9) 0%, rgba(140, 35, 35, 0.95) 100%));
    color: var(--text-inverse, white);
    border: none;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: var(--shadow-primary, 0 2px 6px rgba(165, 42, 42, 0.25));

    &:hover {
      background: var(--primary-gradient, linear-gradient(135deg, rgba(145, 32, 32, 1) 0%, rgba(120, 25, 25, 1) 100%));
      transform: translateY(-1px);
      box-shadow: var(--shadow-primary, 0 4px 12px rgba(165, 42, 42, 0.35));
    }
    
    &:active {
      transform: translateY(0);
    }

    .create-icon {
      width: 14px;
      height: 14px;
      stroke-width: 2;
    }
  }
}

.groups {
  flex: 1;
  overflow-y: auto;
  background: white;
}

.group-item {
  padding: 12px 15px;
  background: white;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: var(--hover-bg, rgba(165, 42, 42, 0.02));
  }

  &.active {
    background: var(--active-bg, rgba(165, 42, 42, 0.1));
  }

  .group-avatar {
    position: relative;
    margin-right: 12px;
    flex-shrink: 0;
    width: 45px;
    height: 45px;

    .unread-badge {
      position: absolute;
      top: 0;
      right: 0;
      width: 12px;
      height: 12px;
      background: var(--error-color, #ff4757);
      border-radius: 50%;
      border: 2px solid var(--bg-tertiary, white);
    }

    .mention-badge {
      position: absolute;
      top: -4px;
      right: -8px;
      min-width: 50px;
      height: 20px;
      background: var(--primary-gradient, linear-gradient(135deg, rgba(165, 42, 42, 0.9) 0%, rgba(140, 35, 35, 0.95) 100%));
      color: var(--text-inverse, white);
      border-radius: 10px;
      border: 2px solid var(--bg-tertiary, white);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: bold;
      padding: 0 6px;
      box-shadow: 0 2px 4px rgba(255, 71, 87, 0.4);
      animation: mention-pulse 2s infinite;
      white-space: nowrap;
      z-index: 10;
    }

    .unread-count-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 18px;
      height: 18px;
      background: var(--error-color, linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%));
      color: var(--text-inverse, white);
      border-radius: 10px;
      border: 2px solid var(--bg-tertiary, white);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: bold;
      padding: 0 4px;
      box-shadow: 0 2px 4px rgba(255, 107, 107, 0.4);

      &.large-count {
        font-size: 9px;
        min-width: 20px;
      }
    }
  }

  .group-info {
    flex: 1;
    min-width: 0;

    .group-name-row {
      display: flex;
      align-items: center;
      margin-bottom: 4px;
      gap: 4px;

      .group-name {
        font-size: 15px;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
      }

      .member-count {
        font-size: 12px;
        color: #999;
        flex-shrink: 0;
      }

      .last-time {
        font-size: 12px;
        color: #999;
        flex-shrink: 0;
        margin-left: auto;
      }
    }

    .last-message {
      font-size: 13px;
      color: #999;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

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
}

.dialog {
  background: white;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
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
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 28px;
    cursor: pointer;
    color: #999;
    line-height: 1;

    &:hover {
      color: #333;
    }
  }
}

.dialog-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;

  .form-group {
    margin-bottom: 20px;

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
    }

    input[type="text"] {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;

      &:focus {
        outline: none;
        border-color: #07c160;
      }
    }
  }

  .friend-list {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid #ddd;
    border-radius: 4px;

    .friend-item {
      padding: 10px;
      display: flex;
      align-items: center;
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: #f5f5f5;
      }

      input[type="checkbox"] {
        margin-right: 10px;
      }

      img {
        width: 35px;
        height: 35px;
        border-radius: 50%;
        margin-right: 10px;
        object-fit: cover;
      }

      span {
        font-size: 14px;
      }
    }
  }
}

.dialog-footer {
  padding: 15px 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;

  button {
    padding: 8px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;

    &.cancel-btn {
      background: #f5f5f5;
      color: #333;

      &:hover {
        background: #e0e0e0;
      }
    }

    &.confirm-btn {
      background: #07c160;
      color: white;

      &:hover {
        background: #06ad56;
      }

      &:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
    }
  }
}

// @提醒脉动动画
@keyframes mention-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 2px 4px rgba(255, 71, 87, 0.4);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 4px 8px rgba(255, 71, 87, 0.6);
  }
}
</style>
