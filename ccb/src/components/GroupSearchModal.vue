<template>
  <div class="search-modal-overlay" @click="closeModal">
    <div class="search-modal" @click.stop>
      <div class="search-header">
        <div class="search-input-wrapper">
          <i class="fas fa-search"></i>
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            placeholder="搜索群聊或历史消息..."
            @input="handleSearch"
          />
          <button v-if="searchQuery" class="clear-btn" @click="clearSearch">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <button class="close-btn" @click="closeModal">取消</button>
      </div>

      <div class="search-tabs">
        <button
          :class="{ active: activeTab === 'groups' }"
          @click="activeTab = 'groups'"
        >
          群聊
        </button>
        <button
          :class="{ active: activeTab === 'messages' }"
          @click="activeTab = 'messages'"
        >
          历史消息
        </button>
      </div>

      <div class="search-results">
        <!-- 搜索群聊 -->
        <div v-if="activeTab === 'groups'" class="results-section">
          <div v-if="isSearching" class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>搜索中...</p>
          </div>

          <div v-else-if="filteredGroups.length === 0" class="empty-state">
            <i class="fas fa-search"></i>
            <p>{{ searchQuery ? '未找到相关群聊' : '输入关键词搜索群聊' }}</p>
          </div>

          <div v-else class="group-results">
            <div
              v-for="group in filteredGroups"
              :key="group.RoomID"
              class="result-item group-item"
              @click="selectGroup(group)"
            >
              <div class="result-avatar">
                <GroupAvatar :members="group.Members" :size="45" />
              </div>
              <div class="result-info">
                <div class="result-name">
                  <span v-html="highlightText(group.RoomName, searchQuery)"></span>
                  <span class="member-count">({{ group.Members.length }}人)</span>
                </div>
                <div class="result-desc">
                  {{ getMemberNames(group.Members) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 搜索历史消息 -->
        <div v-if="activeTab === 'messages'" class="results-section">
          <div v-if="isSearching" class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>搜索中...</p>
          </div>

          <div v-else-if="filteredMessages.length === 0" class="empty-state">
            <i class="fas fa-search"></i>
            <p>{{ searchQuery ? '未找到相关消息' : '输入关键词搜索历史消息' }}</p>
          </div>

          <div v-else class="message-results">
            <div
              v-for="message in filteredMessages"
              :key="message._id"
              class="result-item message-item"
              @click="selectMessage(message)"
            >
              <div class="result-avatar">
                <img :src="message.fromAvatar || '/images/avatar/default-avatar.webp'" alt="头像" />
              </div>
              <div class="result-info">
                <div class="result-header">
                  <span class="sender-name">{{ message.fromName }}</span>
                  <span class="group-name">{{ message.groupName }}</span>
                </div>
                <div class="result-content" v-html="highlightText(message.content, searchQuery)"></div>
                <div class="result-time">{{ formatTime(message.time) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import axios from 'axios'
import GroupAvatar from './GroupAvatar.vue'

const baseUrl = import.meta.env.VITE_BASE_URL

const emit = defineEmits(['close', 'select-group', 'select-message'])

const searchQuery = ref('')
const activeTab = ref('groups')
const isSearching = ref(false)
const searchInputRef = ref(null)

const allGroups = ref([])
const allMessages = ref([])

onMounted(async () => {
  await loadGroups()
  await loadAllMessages()
  nextTick(() => {
    searchInputRef.value?.focus()
  })
})

// 加载所有群聊
async function loadGroups() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${baseUrl}/room/list`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.data.success) {
      allGroups.value = res.data.groups
    }
  } catch (err) {
    console.error('加载群聊失败:', err)
  }
}

// 加载所有历史消息
async function loadAllMessages() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${baseUrl}/room/search/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.data.success) {
      allMessages.value = res.data.messages
    }
  } catch (err) {
    console.error('加载历史消息失败:', err)
    console.error('错误详情:', err.response?.data || err.message)
  }
}

// 过滤群聊
const filteredGroups = computed(() => {
  if (!searchQuery.value.trim()) return []
  
  const query = searchQuery.value.toLowerCase()
  return allGroups.value.filter(group => {
    // 搜索群名称
    if (group.RoomName.toLowerCase().includes(query)) return true
    
    // 搜索成员名称
    return group.Members.some(member => 
      member.uName?.toLowerCase().includes(query)
    )
  })
})

// 过滤消息
const filteredMessages = computed(() => {
  if (!searchQuery.value.trim()) return []
  
  const query = searchQuery.value.toLowerCase()
  // 过滤并排序消息
  const filtered = allMessages.value.filter(message => {
    // 只搜索文本消息
    if (message.messageType !== 'text') return false
    
    // 搜索消息内容
    if (message.content && message.content.toLowerCase().includes(query)) {
      return true
    }
    
    // 搜索发送者名称
    if (message.fromName && message.fromName.toLowerCase().includes(query)) {
      return true
    }
    
    return false
  })
  // 按时间倒序排序（最新的在前）
  return filtered
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 50) // 限制结果数量
})

// 处理搜索
function handleSearch() {
  // 可以添加防抖逻辑
}

// 清除搜索
function clearSearch() {
  searchQuery.value = ''
  searchInputRef.value?.focus()
}

// 关闭弹窗
function closeModal() {
  emit('close')
}

// 选择群聊
function selectGroup(group) {
  emit('select-group', group)
  closeModal()
}

// 选择消息
function selectMessage(message) {
  emit('select-message', message)
  closeModal()
}

// 获取成员名称列表
function getMemberNames(members) {
  if (!members || members.length === 0) return ''
  const names = members.slice(0, 3).map(m => m.uName).join('、')
  return members.length > 3 ? `${names} 等${members.length}人` : names
}

// 高亮文本
function highlightText(text, query) {
  if (!query || !text) return text
  
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

// 转义正则表达式特殊字符
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 格式化时间
function formatTime(time) {
  const date = new Date(time)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return '刚刚'
  
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}分钟前`
  }
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  if (messageDate.getTime() === today.getTime()) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (messageDate.getTime() === yesterday.getTime()) {
    return `昨天 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
  
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}-${date.getDate()}`
  }
  
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}
</script>

<style scoped lang="scss">
.search-modal-overlay {
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
  backdrop-filter: blur(5px);
}

.search-modal {
  background: var(--bg-tertiary, white);
  border-radius: 12px;
  width: 600px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
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

.search-header {
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  gap: 10px;
  align-items: center;

  .search-input-wrapper {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
    background: #f5f5f5;
    border-radius: 20px;
    padding: 0 15px;

    i.fa-search {
      color: #999;
      margin-right: 10px;
    }

    input {
      flex: 1;
      border: none;
      background: none;
      padding: 10px 0;
      font-size: 14px;
      outline: none;

      &::placeholder {
        color: #999;
      }
    }

    .clear-btn {
      background: none;
      border: none;
      color: #999;
      cursor: pointer;
      padding: 5px;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        color: #666;
      }
    }
  }

  .close-btn {
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    font-size: 14px;
    padding: 8px 12px;
    border-radius: 4px;

    &:hover {
      background: #f5f5f5;
    }
  }
}

.search-tabs {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  padding: 0 15px;

  button {
    flex: 1;
    padding: 12px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: #666;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.3s;

    &.active {
      color: rgb(255, 127, 80);
      border-bottom-color: rgb(255, 127, 80);
      font-weight: 600;
    }

    &:hover:not(.active) {
      color: #333;
      background: #f5f5f5;
    }
  }
}

.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;

  i {
    font-size: 48px;
    margin-bottom: 15px;
  }

  p {
    font-size: 14px;
    margin: 0;
  }
}

.result-item {
  display: flex;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 8px;

  &:hover {
    background: #f5f5f5;
  }

  .result-avatar {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    overflow: hidden;
    margin-right: 12px;
    flex-shrink: 0;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .result-info {
    flex: 1;
    min-width: 0;
  }
}

.group-item {
  .result-name {
    font-size: 15px;
    font-weight: 500;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 6px;

    .member-count {
      font-size: 12px;
      color: #999;
      font-weight: normal;
    }
  }

  .result-desc {
    font-size: 13px;
    color: #999;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.message-item {
  .result-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;

    .sender-name {
      font-size: 14px;
      font-weight: 500;
      color: #333;
    }

    .group-name {
      font-size: 12px;
      color: #999;
      padding: 2px 6px;
      background: #f0f0f0;
      border-radius: 4px;
    }
  }

  .result-content {
    font-size: 14px;
    color: #666;
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .result-time {
    font-size: 12px;
    color: #999;
  }
}

:deep(mark) {
  background: rgba(255, 127, 80, 0.3);
  color: rgb(255, 127, 80);
  padding: 2px 4px;
  border-radius: 2px;
  font-weight: 600;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .search-modal {
    width: 100vw;
    max-width: 100vw;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
  }

  .search-header {
    padding: 12px;

    .search-input-wrapper {
      padding: 0 12px;

      input {
        font-size: 16px; /* 防止iOS缩放 */
      }
    }
  }

  .result-item {
    padding: 10px;

    .result-avatar {
      width: 40px;
      height: 40px;
      margin-right: 10px;
    }
  }

  .group-item {
    .result-name {
      font-size: 14px;
    }

    .result-desc {
      font-size: 12px;
    }
  }

  .message-item {
    .result-header {
      .sender-name {
        font-size: 13px;
      }

      .group-name {
        font-size: 11px;
      }
    }

    .result-content {
      font-size: 13px;
    }

    .result-time {
      font-size: 11px;
    }
  }
}
</style>
