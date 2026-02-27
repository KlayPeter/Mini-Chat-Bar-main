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
            <GroupAvatar :members="group.Members" :size="48" />
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
              <i><EditPencil class="edit-icon" /></i>
            </button>
          </div>
          <p class="group-id">群ID: {{ group.RoomID }}</p>
        </div>

        <!-- 群成员 -->
        <div class="section">
          <div class="section-header">
            <h4>群成员 ({{ group.Members.length }})</h4>
            <button v-if="isMember" @click="showInviteDialog = true" class="add-btn">
              <i><UserPlus class="add-user-icon" /></i>
            </button>
          </div>
          <div class="member-list">
            <div
              v-for="member in group.Members"
              :key="member.userID"
              class="member-item"
            >
              <img :src="getAvatarUrl(member.Avatar)" alt="头像" @error="e => e.target.src = '/images/avatar/default-avatar.webp'" />
              <span class="member-name">{{ member.Nickname }}</span>
              <span v-if="member.userID === group.Creator" class="badge">群主</span>
              <span v-else-if="group.Admins.includes(member.userID)" class="badge">管理员</span>
              
              <!-- 踢人按钮 -->
              <button 
                v-if="canKickMember(member)"
                @click="handleKickMember(member)"
                class="kick-btn"
                title="移除成员"
              >
                踢出
              </button>
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
            <button v-if="isAdmin" @click="startEditAnnouncement" class="edit-announcement-btn">
              <EditPencil class="edit-icon" />
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
import { EditPencil, UserPlus } from '@iconoir/vue'
import axios from 'axios'
import GroupAvatar from './GroupAvatar.vue'
import InviteMemberDialog from '../dialog/InviteMemberDialog.vue'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import { getAvatarUrl } from '../../utils/avatarHelper'

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
const { confirm } = useConfirm()

// 获取当前用户信息
async function loadCurrentUser() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${baseUrl}/api/user/info`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    currentUserId.value = String(res.data.user?.uID || res.data.id || res.data.uID)
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
const isCreator = computed(() => {
  return String(props.group.Creator) === String(currentUserId.value) ||
         String(props.group.CreatorID) === String(currentUserId.value)
})

const isAdmin = computed(() => {
  if (!props.group.Admins) return false
  return props.group.Admins.some(adminId => String(adminId) === String(currentUserId.value))
})

const isMember = computed(() => {
  if (!props.group.Members) return false
  return props.group.Members.some(m => {
    const memberId = String(m.userID || m.userId || m.id || m.uID)
    return memberId === String(currentUserId.value)
  })
})

// 判断是否可以踢出某个成员
const canKickMember = (member) => {
  // 不能踢自己
  if (member.userID === currentUserId.value) return false
  
  // 群主可以踢任何人（除了自己）
  if (isCreator.value) return true
  
  // 管理员不能踢群主和其他管理员，但可以踢普通成员
  if (isAdmin.value) {
    return member.userID !== props.group.Creator && 
           !props.group.Admins.includes(member.userID)
  }
  
  // 普通成员不能踢任何人
  return false
}

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
    
    // 立即更新本地显示的群名称
    Object.assign(props.group, { RoomName: editGroupName.value })
    isEditing.value = false
    toast.success('群名称已更新')
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
    
    // 立即更新本地显示的群公告
    Object.assign(props.group, { Announcement: editAnnouncement.value })
    isEditingAnnouncement.value = false
    toast.success('群公告已更新')
    emit('update')
  } catch (err) {
    console.error('更新群公告失败:', err)
    toast.error('更新失败')
  }
}

// 踢出成员
async function handleKickMember(member) {
  if (!canKickMember(member)) {
    toast.error('没有权限踢出该成员')
    return
  }
  
  // 确认踢出操作
  const confirmed = await confirm({
    title: '踢出成员',
    message: `确定要将 ${member.Nickname} 踢出群聊吗？`
  })
  
  if (!confirmed) {
    return
  }
  
  try {
    const token = localStorage.getItem('token')
    await axios.delete(
      `${baseUrl}/room/${props.group.RoomID}/member/${member.userID}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    // 从本地成员列表中移除被踢成员
    const memberIndex = props.group.Members.findIndex(m => m.userID === member.userID)
    if (memberIndex !== -1) {
      props.group.Members.splice(memberIndex, 1)
    }
    
    toast.success(`${member.Nickname} 已被踢出群聊`)
    emit('update')
  } catch (err) {
    console.error('踢出成员失败:', err)
    toast.error('踢出成员失败: ' + (err.response?.data?.message || '操作失败'))
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
  const confirmed = await confirm({
    title: isCreator.value ? '解散群聊' : '退出群聊',
    message: confirmText
  })
  
  if (!confirmed) return

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
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 100;
  display: flex;
  justify-content: flex-end;
}

.group-detail-panel {
  width: 320px;
  max-width: 100%;
  background: var(--bg-tertiary, white);
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  height: 100%;
}

.panel-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color-light, #e0e0e0);
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: 18px;
    color: var(--text-primary, #333);
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 28px;
    cursor: pointer;
    color: var(--text-tertiary, #999);

    &:hover {
      color: var(--text-primary, #333);
    }
  }
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: var(--bg-tertiary, white);
}

.section {
  margin-bottom: 30px;

  h4 {
    margin: 0 0 15px 0;
    font-size: 16px;
    color: var(--text-primary, #333);
  }

  .group-avatar-large {
    text-align: center;
    margin-bottom: 20px;
    padding: 15px;
    background: var(--bg-secondary, #f8f9fa);
    border-radius: 12px;
    border: 1px solid var(--border-color-light, #e0e0e0);
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
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      color: #0284c7;
      cursor: pointer;
      font-size: 16px;
      border-radius: 6px;
      padding: 4px 8px;
      transition: all 0.2s ease;

      &:hover {
        background: #e0f2fe;
        border-color: #7dd3fc;
        color: #0369a1;
      }
    }
  }

  .group-id {
    text-align: center;
    color: var(--text-tertiary, #999);
    font-size: 12px;
    margin: 5px 0 0 0;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;

    .add-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      transition: background-color 0.2s;

      &:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }

      i {
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;

        .edit-icon,
        .add-user-icon {
          width: 16px;
          height: 16px;
          stroke-width: 1.5;
        }
      }
    }
  }

  .member-list {
    max-height: 300px;
    overflow-y: auto;

    .member-item {
      display: flex;
      align-items: center;
      padding: 12px 15px;
      border-radius: 8px;
      margin-bottom: 8px;
      background: var(--bg-secondary, #fafafa);
      border: 1px solid var(--border-color, #f0f0f0);
      transition: all 0.2s ease;

      &:hover {
        background: var(--hover-bg, #f0f9ff);
        border-color: var(--primary-light, #bae6fd);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      img {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        margin-right: 10px;
      }

      .member-name {
        flex: 1;
        font-size: 14px;
        color: var(--text-primary, #333);
      }

      .badge {
        font-size: 12px;
        padding: 2px 8px;
        background: var(--warning-color, #ffeaa7);
        border-radius: 10px;
        color: var(--error-color, #d63031);
      }
      
      .kick-btn {
        padding: 4px 8px;
        font-size: 12px;
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
        margin-left: 8px;
        
        &:hover {
          background: linear-gradient(135deg, #ee5a52 0%, #d63031 100%);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(238, 90, 82, 0.3);
        }
        
        &:active {
          transform: translateY(0);
        }
      }
    }
  }

  .announcement-text {
    background: var(--bg-secondary, #f8f9fa);
    padding: 20px;
    border-radius: 10px;
    min-height: 80px;
    margin-bottom: 15px;
    white-space: pre-wrap;
    color: var(--text-secondary, #495057);
    border: 1px solid var(--border-color-light, #dee2e6);
    font-size: 14px;
    line-height: 1.6;
  }

  .edit-announcement-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: var(--primary-gradient, linear-gradient(135deg, rgba(165, 42, 42, 0.9) 0%, rgba(140, 35, 35, 0.95) 100%));
    color: var(--text-inverse, white);
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: var(--shadow-primary, 0 2px 8px rgba(165, 42, 42, 0.3));
    
    .edit-icon {
      width: 16px;
      height: 16px;
      stroke-width: 1.5;
    }
    
    &:hover {
      background: var(--primary-gradient, linear-gradient(135deg, rgba(145, 32, 32, 1) 0%, rgba(120, 25, 25, 1) 100%));
      transform: translateY(-2px) scale(1.02);
      box-shadow: var(--shadow-primary, 0 4px 15px rgba(165, 42, 42, 0.4));
    }
    
    &:active {
      transform: translateY(0) scale(1);
    }
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
      padding: 8px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;

      &.cancel-btn {
        background: var(--bg-secondary, #f8f9fa);
        color: var(--text-secondary, #6c757d);
        border: 1px solid var(--border-color, #dee2e6);

        &:hover {
          background: #e9ecef;
          color: #495057;
        }
      }

      &.save-btn {
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        color: white;
        border: 1px solid transparent;

        &:hover {
          background: linear-gradient(135deg, #218838 0%, #1e7e34 100%);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
        }
      }
    }
  }

  &.actions {
    .leave-btn {
      width: 100%;
      padding: 14px 20px;
      background: var(--error-color, linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%));
      color: var(--text-inverse, white);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(255, 77, 79, 0.3);

      &:hover {
        background: var(--error-dark, linear-gradient(135deg, #ff1f23 0%, #d4001a 100%));
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(255, 77, 79, 0.4);
      }
      
      &:active {
        transform: translateY(0);
      }
    }
  }
}
</style>
