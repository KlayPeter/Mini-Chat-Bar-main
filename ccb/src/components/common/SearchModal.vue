<template>
  <div v-if="isVisible" class="search-modal-overlay" @click="closeModal">
    <div class="search-modal" @click.stop>
      <div class="search-modal-header">
        <h3>搜索聊天记录</h3>
        <button class="close-btn" @click="closeModal">×</button>
      </div>
      
      <div class="search-modal-body">
        <!-- 搜索输入框 -->
        <div class="search-input-container">
          <input
            type="text"
            v-model="searchKeyword"
            @input="handleSearch"
            @keyup.enter="performSearch"
            placeholder="输入关键词搜索消息内容、用户名..."
            class="search-input"
            ref="searchInputRef"
          />
          <button class="search-btn" @click="performSearch" :disabled="!searchKeyword.trim()">
            <img src="/images/icon/search.png" alt="搜索" style="width: 16px; height: 16px" />
          </button>
        </div>

        <!-- 搜索选项 -->
        <div class="search-options">
          <label class="search-option">
            <input type="radio" v-model="searchScope" value="all" />
            <span>全部聊天</span>
          </label>
          <label class="search-option">
            <input type="radio" v-model="searchScope" value="current" />
            <span>当前聊天</span>
          </label>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <span>搜索中...</span>
        </div>

        <!-- 搜索结果 -->
        <div v-else-if="searchResults.length > 0" class="search-results">
          <div class="results-header">
            <span>找到 {{ totalResults }} 条相关消息</span>
          </div>
          
          <div class="results-list">
            <div
              v-for="(message, index) in searchResults"
              :key="message._id"
              class="result-item"
              @click="jumpToMessage(message)"
            >
              <div class="result-avatar">
                <img :src="getUserAvatar(message)" :alt="getUserName(message)" />
              </div>
              
              <div class="result-content">
                <div class="result-header">
                  <span class="result-user">{{ getUserName(message) }}</span>
                  <span class="result-time">{{ formatTime(message.time) }}</span>
                </div>
                
                <div class="result-message">
                  <div v-if="message.messageType === 'text'" class="text-message">
                    <span v-html="message.highlightedContent || message.content"></span>
                  </div>
                  <div v-else-if="message.messageType === 'image'" class="file-message">
                    <img src="/images/icon/camera.png" alt="图片" style="width: 16px; height: 16px" />
                    <span>图片: {{ message.fileInfo?.fileName || '未知文件' }}</span>
                  </div>
                  <div v-else-if="message.messageType === 'file'" class="file-message">
                    <img src="/images/icon/doc.png" alt="文件" style="width: 16px; height: 16px" />
                    <span>文件: {{ message.fileInfo?.fileName || '未知文件' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 分页控制 -->
          <div v-if="pagination.total > 1" class="pagination">
            <button
              @click="changePage(pagination.current - 1)"
              :disabled="pagination.current <= 1"
              class="page-btn"
            >
              上一页
            </button>
            
            <span class="page-info">
              第 {{ pagination.current }} 页，共 {{ pagination.total }} 页
            </span>
            
            <button
              @click="changePage(pagination.current + 1)"
              :disabled="pagination.current >= pagination.total"
              class="page-btn"
            >
              下一页
            </button>
          </div>
        </div>

        <!-- 无结果提示 -->
        <div v-else-if="hasSearched && !isLoading" class="no-results">
          <div class="no-results-icon"><Search class="search-result-icon" /></div>
          <p>未找到相关消息</p>
          <p class="no-results-tip">尝试使用不同的关键词或检查拼写</p>
        </div>

        <!-- 初始状态 -->
        <div v-else class="search-placeholder">
          <div class="placeholder-icon"><ChatBubble class="placeholder-chat-icon" /></div>
          <p>输入关键词开始搜索</p>
          <p class="placeholder-tip">支持搜索消息内容、用户名、文件名</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useChatStore } from '../../stores/useChatStore'
import { Search, ChatBubble } from '@iconoir/vue'

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  currentUser: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'jumpToMessage'])

const chatStore = useChatStore()

// 搜索相关状态
const searchKeyword = ref('')
const searchScope = ref('current') // 'all' | 'current'
const searchResults = ref([])
const isLoading = ref(false)
const hasSearched = ref(false)
const searchInputRef = ref(null)

// 分页相关状态
const pagination = ref({
  current: 1,
  total: 1,
  count: 0,
  limit: 20
})

const totalResults = computed(() => pagination.value.count)

// 防抖搜索
let searchTimeout = null
const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  searchTimeout = setTimeout(() => {
    if (searchKeyword.value.trim()) {
      performSearch()
    } else {
      searchResults.value = []
      hasSearched.value = false
    }
  }, 500)
}

// 执行搜索
const performSearch = async () => {
  const keyword = searchKeyword.value.trim()
  if (!keyword) return

  isLoading.value = true
  hasSearched.value = true

  try {
    const params = new URLSearchParams({
      keyword: keyword,
      page: pagination.value.current,
      limit: pagination.value.limit
    })

    // 如果是搜索当前聊天，添加目标用户参数
    if (searchScope.value === 'current' && props.currentUser) {
      params.append('targetUser', props.currentUser)
    }

    const token = localStorage.getItem('token')
    const baseUrl = import.meta.env.VITE_BASE_URL
    const response = await fetch(`${baseUrl}/chat/search?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const result = await response.json()
      if (result.success) {
        searchResults.value = result.data.results
        pagination.value = result.data.pagination
      } else {
        console.error('搜索失败:', result.message)
        searchResults.value = []
      }
    } else {
      console.error('搜索失败:', response.statusText)
      searchResults.value = []
    }
  } catch (error) {
    console.error('搜索请求失败:', error)
    searchResults.value = []
  } finally {
    isLoading.value = false
  }
}

// 切换页面
const changePage = (page) => {
  if (page >= 1 && page <= pagination.value.total) {
    pagination.value.current = page
    performSearch()
  }
}

// 跳转到消息
const jumpToMessage = (message) => {
  emit('jumpToMessage', message._id)
  closeModal()
}

// 关闭弹窗
const closeModal = () => {
  emit('close')
  // 重置搜索状态
  searchKeyword.value = ''
  searchResults.value = []
  hasSearched.value = false
  pagination.value.current = 1
}

// 获取聊天对象的用户信息（根据当前用户判断显示谁的信息）
const getChatPartner = (message) => {
  const currentUserId = props.currentUser?.id || localStorage.getItem('userId')
  
  // 如果当前用户是发送者，则显示接收者信息
  if (message.from && message.from._id === currentUserId) {
    return message.to
  }
  // 如果当前用户是接收者，则显示发送者信息
  else {
    return message.from
  }
}

// 获取用户头像
const getUserAvatar = (message) => {
  const chatPartner = getChatPartner(message)
  if (chatPartner && chatPartner.uAvatar) {
    return chatPartner.uAvatar
  }
  return `/images/avatar/default-avatar.webp`
}

// 获取用户名
const getUserName = (message) => {
  const chatPartner = getChatPartner(message)
  if (chatPartner && chatPartner.uName) {
    return chatPartner.uName
  }
  return chatPartner || '未知用户'
}

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  if (diff < 24 * 60 * 60 * 1000) {
    // 24小时内显示时间
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  } else if (diff < 7 * 24 * 60 * 60 * 1000) {
    // 一周内显示星期
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return weekdays[date.getDay()]
  } else {
    // 超过一周显示日期
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit'
    })
  }
}

// 监听弹窗显示状态
watch(() => props.isVisible, (visible) => {
  if (visible) {
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  }
})

// 监听搜索范围变化
watch(searchScope, () => {
  if (hasSearched.value && searchKeyword.value.trim()) {
    pagination.value.current = 1
    performSearch()
  }
})
</script>

<style scoped>
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
  z-index: 1000;
}

.search-modal {
  background: var(--bg-tertiary, white);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.search-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
}

.search-modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background-color: #f5f5f5;
}

.search-modal-body {
  padding: 24px;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.search-input-container {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.search-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #007bff;
}

.search-btn {
  padding: 12px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-btn:hover:not(:disabled) {
  background: #0056b3;
}

.search-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.search-options {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.search-option {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 14px;
}

.search-option input[type="radio"] {
  margin: 0;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: #666;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.search-results {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.results-header {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
  margin-bottom: 16px;
  font-size: 14px;
  color: #666;
}

.results-list {
  flex: 1;
  overflow-y: auto;
}

.result-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 8px;
}

.result-item:hover {
  background-color: #f8f9fa;
}

.result-avatar {
  flex-shrink: 0;
}

.result-avatar img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.result-content {
  flex: 1;
  min-width: 0;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.result-user {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.result-time {
  font-size: 12px;
  color: #999;
}

.result-message {
  font-size: 14px;
  color: #666;
  line-height: 1.4;
}

.text-message :deep(mark) {
  background-color: #ffeb3b;
  color: #333;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: bold;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.file-message {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-top: 1px solid #eee;
  margin-top: 16px;
}

.page-btn {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #0056b3;
}

.page-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #666;
}

.no-results,
.search-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #666;
}

.no-results-icon,
.placeholder-icon {
  font-size: 48px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;

  .search-result-icon,
  .placeholder-chat-icon {
    width: 48px;
    height: 48px;
    stroke-width: 1.5;
  }
}

.no-results p,
.search-placeholder p {
  margin: 8px 0;
  font-size: 16px;
}

.no-results-tip,
.placeholder-tip {
  font-size: 14px !important;
  color: #999 !important;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .search-modal {
    width: 95%;
    max-height: 90vh;
  }
  
  .search-modal-header,
  .search-modal-body {
    padding: 16px;
  }
  
  .search-options {
    flex-direction: column;
    gap: 8px;
  }
  
  .pagination {
    flex-direction: column;
    gap: 12px;
  }
  
  .result-item {
    padding: 8px;
  }
  
  .result-avatar img {
    width: 32px;
    height: 32px;
  }
}
</style>