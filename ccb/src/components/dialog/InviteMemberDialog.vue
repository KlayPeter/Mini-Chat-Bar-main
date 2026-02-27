<template>
  <div class="dialog-overlay" @click="$emit('close')">
    <div class="dialog" @click.stop>
      <div class="dialog-header">
        <h3>邀请成员</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="dialog-body">
        <div class="search-box">
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索好友..."
          />
        </div>

        <div class="friend-list">
          <div
            v-for="friend in filteredFriends"
            :key="friend.uID"
            class="friend-item"
            @click="toggleFriend(friend.uID)"
          >
            <input
              type="checkbox"
              :checked="selectedFriends.includes(friend.uID)"
              @click.stop="toggleFriend(friend.uID)"
            />
            <img :src="friend.uAvatar" alt="头像" />
            <span>{{ friend.uName }}</span>
          </div>

          <div v-if="filteredFriends.length === 0" class="empty-state">
            <p>没有可邀请的好友</p>
          </div>
        </div>

        <div v-if="selectedFriends.length > 0" class="selected-count">
          已选择 {{ selectedFriends.length }} 人
        </div>
      </div>

      <div class="dialog-footer">
        <button class="cancel-btn" @click="$emit('close')">取消</button>
        <button
          class="confirm-btn"
          @click="handleInvite"
          :disabled="selectedFriends.length === 0"
        >
          邀请
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useToast } from '../../composables/useToast'

const props = defineProps({
  group: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'invited'])

const baseUrl = import.meta.env.VITE_BASE_URL
const toast = useToast()

const friends = ref([])
const selectedFriends = ref([])
const searchKeyword = ref('')

// 过滤好友（排除已在群里的）
const filteredFriends = computed(() => {
  const memberIds = props.group.Members.map(m => m.userID)
  let result = friends.value.filter(f => !memberIds.includes(f.uID))

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(f => f.uName.toLowerCase().includes(keyword))
  }

  return result
})

// 加载好友列表
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

// 切换好友选择
function toggleFriend(friendId) {
  const index = selectedFriends.value.indexOf(friendId)
  if (index > -1) {
    selectedFriends.value.splice(index, 1)
  } else {
    selectedFriends.value.push(friendId)
  }
}

// 邀请成员
async function handleInvite() {
  if (selectedFriends.value.length === 0) return

  try {
    const token = localStorage.getItem('token')
    await axios.post(
      `${baseUrl}/room/${props.group.RoomID}/invite`,
      { memberIds: selectedFriends.value },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    toast.success('邀请成功')
    emit('invited')
  } catch (err) {
    console.error('邀请失败:', err)
    toast.error('邀请失败')
  }
}

onMounted(() => {
  loadFriends()
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
}

.dialog {
  background: var(--bg-tertiary, white);
  border-radius: 8px;
  width: 450px;
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
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 20px;

  .search-box {
    margin-bottom: 15px;

    input {
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
    flex: 1;
    overflow-y: auto;
    border: 1px solid #ddd;
    border-radius: 4px;

    .friend-item {
      padding: 12px;
      display: flex;
      align-items: center;
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: #f5f5f5;
      }

      input[type="checkbox"] {
        margin-right: 12px;
        cursor: pointer;
      }

      img {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        margin-right: 12px;
        object-fit: cover;
      }

      span {
        font-size: 14px;
      }
    }

    .empty-state {
      padding: 40px 20px;
      text-align: center;
      color: #999;
    }
  }

  .selected-count {
    margin-top: 15px;
    text-align: center;
    color: #07c160;
    font-size: 14px;
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
