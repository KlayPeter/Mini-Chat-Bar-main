<template>
  <div class="group-detail-overlay" @click="$emit('close')">
    <div class="group-detail-panel" @click.stop>
      <div class="panel-header">
        <h3>群聊信息</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="panel-body">
        <!-- 群基本信息 -->
        <div class="section">
          <div class="group-avatar-large">
            <img :src="group.RoomAvatar || '/images/group-default.png'" alt="群头像" />
          </div>
          <div class="group-name-edit">
            <input
              v-if="isEditing"
              v-model="editGroupName"
              @blur="saveGroupName"
              @keyup.enter="saveGroupName"
              type="text"
            />
            <h2 v-else>{{ group.RoomName }}</h2>
            <button v-if="isAdmin" @click="startEdit" class="edit-btn">
              <i>✏️</i>
            </button>
          </div>
          <p class="group-id">群ID: {{ group.RoomID }}</p>
        </div>

        <!-- 群成员 -->
        <div class="section">
          <div class="section-header">
            <h4>群成员 ({{ group.Members.length }})</h4>
            <button v-if="isMember" @click="showInviteDialog = true" class="add-btn">
              <i>👥➕</i>
            </button>
          </div>
          <div class="member-list">
            <div
              v-for="member in group.Members"
              :key="member.userID"
              class="member-item"
            >
              <img :src="member.Avatar" alt="头像" />
              <span class="member-name">{{ member.Nickname }}</span>
              <span v-if="member.userID === group.Creator" class="badge">群主</span>
              <span v-else-if="group.Admins.includes(member.userID)" class="badge">管理员</span>
            </div>
          </div>
        </div>

        <!-- 群公告 -->
        <div class="section">
          <h4>群公告</h4>
          <div v-if="isEditingAnnouncement">
            <textarea
              v-model="editAnnouncement"
              rows="4"
              placeholder="输入群公告..."
            ></textarea>
            <div class="edit-actions">
              <button @click="cancelEditAnnouncement" class="cancel-btn">取消</button>
              <button @click="saveAnnouncement" class="save-btn">保存</button>
            </div>
          </div>
          <div v-else>
            <p class="announcement-text">
              {{ group.Announcement || '暂无群公告' }}
            </p>
            <button v-if="isAdmin" @click="startEditAnnouncement" class="edit-btn">
              编辑公告
            </button>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="section actions">
          <button @click="handleLeaveGroup" class="leave-btn">
            {{ isCreator ? '解散群聊' : '退出群聊' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 邀请成员对话框 -->
    <InviteMemberDialog
      v-if="showInviteDialog"
      :group="group"
      @close="showInviteDialog = false"
      @invited="handleInvited"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import InviteMemberDialog from './InviteMemberDialog.vue'
import { useToast } from '../composables/useToast'

const props = defineProps({
  group: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'update'])

const baseUrl = import.meta.env.VITE_BASE_URL
const currentUserId = ref('')
const toast = useToast()

// 获取当前用户信息
async function loadCurrentUser() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${baseUrl}/api/user/info`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    currentUserId.value = String(res.data.id || res.data.uID)
  } catch (err) {
    console.error('获取用户信息失败:', err)
  }
}

const isEditing = ref(false)
const editGroupName = ref('')
const isEditingAnnouncement = ref(false)
const editAnnouncement = ref('')
const showInviteDialog = ref(false)

// 计算属性
const isCreator = computed(() => props.group.Creator === currentUserId.value)
const isAdmin = computed(() => props.group.Admins.includes(currentUserId.value))
const isMember = computed(() =>
  props.group.Members.some(m => m.userID === currentUserId.value)
)

// 编辑群名称
function startEdit() {
  editGroupName.value = props.group.RoomName
  isEditing.value = true
}

async function saveGroupName() {
  if (!editGroupName.value.trim()) {
    isEditing.value = false
    return
  }

  try {
    const token = localStorage.getItem('token')
    await axios.put(
      `${baseUrl}/room/${props.group.RoomID}`,
      { groupName: editGroupName.value },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    isEditing.value = false
    emit('update')
  } catch (err) {
    console.error('更新群名称失败:', err)
    toast.error('更新失败')
  }
}

// 编辑群公告
function startEditAnnouncement() {
  editAnnouncement.value = props.group.Announcement || ''
  isEditingAnnouncement.value = true
}

function cancelEditAnnouncement() {
  isEditingAnnouncement.value = false
}

async function saveAnnouncement() {
  try {
    const token = localStorage.getItem('token')
    await axios.put(
      `${baseUrl}/room/${props.group.RoomID}`,
      { announcement: editAnnouncement.value },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    isEditingAnnouncement.value = false
    emit('update')
  } catch (err) {
    console.error('更新群公告失败:', err)
    toast.error('更新失败')
  }
}

// 邀请成员
function handleInvited() {
  showInviteDialog.value = false
  emit('update')
}

// 退出/解散群聊
async function handleLeaveGroup() {
  const confirmText = isCreator.value ? '确定要解散群聊吗？' : '确定要退出群聊吗？'
  if (!confirm(confirmText)) return

  try {
    const token = localStorage.getItem('token')
    await axios.post(
      `${baseUrl}/room/${props.group.RoomID}/leave`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    )
    toast.success(isCreator.value ? '群聊已解散' : '已退出群聊')
    emit('close')
    emit('update')
  } catch (err) {
    console.error('操作失败:', err)
    toast.error('操作失败')
  }
}

onMounted(() => {
  loadCurrentUser()
})
</script>

<style scoped lang="scss">
.group-detail-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.group-detail-panel {
  width: 400px;
  background: white;
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
}

.panel-header {
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

    &:hover {
      color: #333;
    }
  }
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.section {
  margin-bottom: 30px;

  h4 {
    margin: 0 0 15px 0;
    font-size: 16px;
  }

  .group-avatar-large {
    text-align: center;
    margin-bottom: 15px;

    img {
      width: 80px;
      height: 80px;
      border-radius: 12px;
    }
  }

  .group-name-edit {
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;

    h2 {
      margin: 0;
      font-size: 20px;
    }

    input {
      font-size: 20px;
      text-align: center;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 5px 10px;
    }

    .edit-btn {
      background: none;
      border: none;
      color: #07c160;
      cursor: pointer;
      font-size: 16px;
    }
  }

  .group-id {
    text-align: center;
    color: #999;
    font-size: 12px;
    margin: 5px 0 0 0;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;

    .add-btn {
      background: #07c160;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;

      &:hover {
        background: #06ad56;
      }
    }
  }

  .member-list {
    max-height: 300px;
    overflow-y: auto;

    .member-item {
      display: flex;
      align-items: center;
      padding: 10px;
      border-radius: 4px;

      &:hover {
        background: #f5f5f5;
      }

      img {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        margin-right: 10px;
      }

      .member-name {
        flex: 1;
        font-size: 14px;
      }

      .badge {
        font-size: 12px;
        padding: 2px 8px;
        background: #ffeaa7;
        border-radius: 10px;
        color: #d63031;
      }
    }
  }

  .announcement-text {
    background: #f5f5f5;
    padding: 15px;
    border-radius: 4px;
    min-height: 60px;
    margin-bottom: 10px;
    white-space: pre-wrap;
    color: #666;
  }

  textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    resize: vertical;
    font-family: inherit;
  }

  .edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 10px;

    button {
      padding: 6px 15px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;

      &.cancel-btn {
        background: #f5f5f5;
        color: #333;
      }

      &.save-btn {
        background: #07c160;
        color: white;
      }
    }
  }

  &.actions {
    .leave-btn {
      width: 100%;
      padding: 12px;
      background: #ff4d4f;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;

      &:hover {
        background: #ff7875;
      }
    }
  }
}
</style>
