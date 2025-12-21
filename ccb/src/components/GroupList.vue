<template>
  <div class="group-list">
    <div class="header">
      <h3>群聊</h3>
      <button class="create-btn" @click="showCreateDialog = true">
        <i class="fas fa-plus"></i> 创建群聊
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
          <span v-if="hasUnreadMessages(group.RoomID)" class="unread-badge"></span>
        </div>
        <div class="group-info">
          <div class="group-name-row">
            <span class="group-name">{{ group.RoomName }}</span>
            <span class="member-count">({{ group.Members.length }})</span>
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
import { ref, onMounted } from 'vue'
import axios from 'axios'
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
      groupLastMessages.value[roomId] = lastMsg
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
  // 清除该群的未读标记
  unreadGroups.value.delete(group.RoomID)
  emit('select-group', group)
}

// 检查是否有未读消息
function hasUnreadMessages(roomId) {
  return unreadGroups.value.has(roomId)
}

// 标记群聊有新消息（可以从socket事件调用）
function markGroupAsUnread(roomId) {
  if (roomId !== currentGroupId.value) {
    unreadGroups.value.add(roomId)
  }
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
  if (!lastMsg) return '暂无消息'
  
  if (lastMsg.messageType === 'system') {
    return lastMsg.content
  }
  
  const content = lastMsg.content || '[文件]'
  return `${lastMsg.fromName}: ${content.substring(0, 20)}${content.length > 20 ? '...' : ''}`
}

onMounted(() => {
  loadGroups()
  loadFriends()
})

defineExpose({
  loadGroups,
  markGroupAsUnread
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
    padding: 6px 12px;
    background: #07c160;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    transition: background 0.2s;

    &:hover {
      background: #06ad56;
    }

    i {
      margin-right: 4px;
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
    background: #f5f5f5;
  }

  &.active {
    background: #e6f7ff;
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
      width: 10px;
      height: 10px;
      background: #ff4d4f;
      border-radius: 50%;
      border: 2px solid white;
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
</style>
