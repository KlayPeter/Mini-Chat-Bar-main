<template>
  <div class="favorites-page">
    <div class="container">
      <!-- 侧边栏 -->
      <div class="section1">
        <Sidebar
          @showchat="handleshowchat"
          @showcontacts="handleshowcontacts"
          @todetail="showAI"
        />
      </div>

      <!-- 收藏列表 -->
      <div class="section2">
        <div class="favorites-list-panel">
          <div class="panel-header">
            <h2>我的收藏</h2>
            <div class="stats-mini">
              <span class="stat">{{ stats.total || 0 }} 条</span>
            </div>
          </div>
          
          <!-- 筛选器 -->
          <div class="filters">
            <select v-model="filterMessageType" class="filter-select">
              <option value="">全部类型</option>
              <option value="private">私聊</option>
              <option value="group">群聊</option>
              <option value="chatroom">聊天室</option>
            </select>
            <select v-model="filterContentType" class="filter-select">
              <option value="">全部内容</option>
              <option value="text">文本</option>
              <option value="code">代码</option>
              <option value="image">图片</option>
            </select>
          </div>
          
          <!-- 搜索框 -->
          <div class="search-box">
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="搜索收藏内容..." 
              class="search-input"
              @input="handleSearch"
            />
            <Search v-if="!searchQuery" :size="18" class="search-icon" />
            <button v-else @click="clearSearch" class="clear-btn">
              <X :size="16" />
            </button>
          </div>
          
          <!-- 收藏项列表 -->
          <div class="favorites-items">
            <div 
              v-for="favorite in favorites" 
              :key="favorite._id" 
              class="favorite-item"
              :class="{ active: selectedFavorite?._id === favorite._id }"
              @click="selectFavorite(favorite)"
            >
              <div class="item-content">
                <div class="item-text">
                  <div class="item-title">
                    <span class="source-name">{{ favorite.sourceName || '未知来源' }}</span>
                    <span v-if="favorite.sender?.name" class="sender-name">- {{ favorite.sender.name }}</span>
                  </div>
                  <div class="item-preview">{{ getPreview(favorite) }}</div>
                </div>
                <div class="item-meta">
                  <span class="item-badge" :class="`badge-${favorite.contentType}`">
                    {{ getContentLabel(favorite.contentType) }}
                  </span>
                  <span class="item-time">{{ formatTimeShort(favorite.createdAt) }}</span>
                </div>
              </div>
            </div>
            
            <!-- 空状态 -->
            <div v-if="favorites.length === 0" class="empty-list">
              <Star :size="48" class="empty-icon" />
              <p>暂无收藏</p>
              <span class="empty-hint">右键消息可以添加收藏</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 收藏详情 -->
      <div class="section3-wrapper">
        <div class="section3">
          <div v-if="!selectedFavorite" class="welcome-state">
            <Star :size="64" class="welcome-icon" />
            <p>选择一个收藏查看详情</p>
          </div>
          
          <div v-else class="favorite-detail">
            <div class="detail-header">
              <div class="detail-info">
                <h3>{{ selectedFavorite.sourceName || '未知来源' }}</h3>
                <div class="detail-meta">
                  <span class="type-badge" :class="`type-${selectedFavorite.messageType}`">
                    {{ getTypeLabel(selectedFavorite.messageType) }}
                  </span>
                  <span v-if="selectedFavorite.sender?.name" class="sender-info">
                    来自: {{ selectedFavorite.sender.name }}
                  </span>
                  <span class="detail-time">{{ formatTime(selectedFavorite.createdAt) }}</span>
                </div>
              </div>
              
              <div class="detail-actions">
                <button @click="removeFavorite(selectedFavorite)" class="remove-btn" title="取消收藏">
                  <Trash2 :size="18" />
                  取消收藏
                </button>
              </div>
            </div>
            
            <!-- 代码内容 -->
            <div v-if="selectedFavorite.contentType === 'code' && selectedFavorite.codeInfo" class="code-content">
              <div class="code-header">
                <span class="language">{{ selectedFavorite.codeInfo.language || 'text' }}</span>
                <span v-if="selectedFavorite.codeInfo.fileName" class="filename">
                  {{ selectedFavorite.codeInfo.fileName }}
                </span>
                <button @click="copyCode(selectedFavorite.codeInfo.code)" class="copy-code-btn">
                  <Copy :size="16" />
                  复制代码
                </button>
              </div>
              <pre><code>{{ selectedFavorite.codeInfo.code }}</code></pre>
            </div>
            
            <!-- 图片内容 -->
            <div v-else-if="selectedFavorite.contentType === 'image' && selectedFavorite.fileInfo" class="image-content">
              <img 
                :src="getFileUrl(selectedFavorite.fileInfo.fileUrl)" 
                :alt="selectedFavorite.fileInfo.fileName"
                class="favorite-image"
                @click="previewImage(selectedFavorite.fileInfo)"
              />
              <div class="image-info">
                <span class="file-name">{{ selectedFavorite.fileInfo.fileName }}</span>
                <button @click="downloadFile(selectedFavorite.fileInfo)" class="download-btn">
                  <Download :size="16" />
                  下载
                </button>
              </div>
            </div>
            
            <!-- 文件内容 -->
            <div v-else-if="(selectedFavorite.contentType === 'file' || selectedFavorite.contentType === 'video' || selectedFavorite.contentType === 'audio') && selectedFavorite.fileInfo" class="file-content">
              <div class="file-icon">
                <FileText v-if="selectedFavorite.contentType === 'file'" :size="64" />
                <Video v-else-if="selectedFavorite.contentType === 'video'" :size="64" />
                <Music v-else :size="64" />
              </div>
              <div class="file-details">
                <div class="file-name">{{ selectedFavorite.fileInfo.fileName }}</div>
                <div class="file-size">{{ formatFileSize(selectedFavorite.fileInfo.fileSize) }}</div>
                <button @click="downloadFile(selectedFavorite.fileInfo)" class="download-file-btn">
                  <Download :size="18" />
                  下载文件
                </button>
              </div>
            </div>
            
            <!-- 文本内容 -->
            <div v-else class="text-content">
              <p>{{ selectedFavorite.content || '无内容' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Star, Trash2, Copy, Search, X, Download, FileText, Video, Music } from 'lucide-vue-next'
import axios from 'axios'
import { useToast } from '../composables/useToast'
import Sidebar from '../components/Sidebar.vue'

const router = useRouter()
const baseUrl = import.meta.env.VITE_BASE_URL
const toast = useToast()

const favorites = ref([])
const stats = ref({})
const selectedFavorite = ref(null)
const filterMessageType = ref('')
const filterContentType = ref('')
const searchQuery = ref('')
const searchTimeout = ref(null)

function handleshowchat() {
  router.push('/')
}

function handleshowcontacts() {
  router.push('/contacts')
}

function showAI() {
  router.push('/chat-ai')
}

function selectFavorite(favorite) {
  selectedFavorite.value = favorite
}

function getItemTitle(favorite) {
  // 显示来源名称
  if (favorite.sourceName) {
    return favorite.sourceName
  }
  
  // 如果有发送者名称，显示发送者
  if (favorite.sender?.name) {
    return favorite.sender.name
  }
  
  // 根据消息类型显示标题
  const typeMap = {
    private: '私聊消息',
    group: '群聊消息',
    chatroom: '聊天室消息'
  }
  
  return typeMap[favorite.messageType] || '收藏内容'
}

function getPreview(favorite) {
  if (favorite.contentType === 'code') {
    return favorite.codeInfo?.fileName || '代码片段'
  }
  if (!favorite.content) {
    return '无内容'
  }
  return favorite.content.substring(0, 50) + (favorite.content.length > 50 ? '...' : '')
}

function formatTimeShort(time) {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code)
    toast.success('代码已复制')
  } catch (err) {
    toast.error('复制失败')
  }
}

function getTypeLabel(type) {
  const map = {
    private: '私聊',
    group: '群聊',
    chatroom: '聊天室'
  }
  return map[type] || type
}

function getContentLabel(type) {
  const map = {
    text: '文本',
    code: '代码',
    image: '图片',
    file: '文件'
  }
  return map[type] || type
}

function formatTime(time) {
  if (!time) return ''
  const date = new Date(time)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function loadFavorites() {
  try {
    const token = localStorage.getItem('token')
    const params = {}
    
    if (filterMessageType.value) {
      params.messageType = filterMessageType.value
    }
    
    if (filterContentType.value) {
      params.contentType = filterContentType.value
    }
    
    if (searchQuery.value.trim()) {
      params.search = searchQuery.value.trim()
    }
    
    const res = await axios.get(`${baseUrl}/api/favorites`, {
      headers: { Authorization: `Bearer ${token}` },
      params
    })
    
    if (res.data.success) {
      favorites.value = res.data.favorites
      console.log('收藏列表:', favorites.value)
      console.log('第一条收藏详情:', favorites.value[0])
    }
  } catch (err) {
    console.error('加载收藏失败:', err)
    toast.error('加载收藏失败')
  }
}

function handleSearch() {
  // 防抖：延迟搜索
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  
  searchTimeout.value = setTimeout(() => {
    loadFavorites()
    selectedFavorite.value = null
  }, 500)
}

function clearSearch() {
  searchQuery.value = ''
  loadFavorites()
  selectedFavorite.value = null
}

function getFileUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return baseUrl + url
}

function formatFileSize(bytes) {
  if (!bytes) return '未知大小'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function previewImage(fileInfo) {
  window.open(getFileUrl(fileInfo.fileUrl), '_blank')
}

function downloadFile(fileInfo) {
  const link = document.createElement('a')
  link.href = getFileUrl(fileInfo.fileUrl)
  link.download = fileInfo.fileName
  link.click()
}

async function loadStats() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${baseUrl}/api/favorites/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    if (res.data.success) {
      stats.value = res.data.stats
    }
  } catch (err) {
    console.error('加载统计失败:', err)
  }
}

async function removeFavorite(favorite) {
  try {
    const token = localStorage.getItem('token')
    await axios.delete(`${baseUrl}/api/favorites/${favorite.messageId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    toast.success('取消收藏成功')
    
    // 如果删除的是当前选中的，清空选中
    if (selectedFavorite.value?._id === favorite._id) {
      selectedFavorite.value = null
    }
    
    await loadFavorites()
    await loadStats()
  } catch (err) {
    console.error('取消收藏失败:', err)
    toast.error('取消收藏失败')
  }
}

watch([filterMessageType, filterContentType], () => {
  loadFavorites()
  selectedFavorite.value = null
})

onMounted(() => {
  loadFavorites()
  loadStats()
})
</script>

<style scoped lang="scss">
.favorites-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.container {
  border-radius: 1rem;
  flex: 1;
  display: flex;
  box-shadow: 0 0 5px 1px rgba(0, 0, 0, 0.5);
  -webkit-app-region: drag;
  max-height: 100vh;
  height: 100vh;
  background: #f9f9f9;
  transition: all 1.5s ease-in;
  overflow: hidden;
  position: relative;
}

.section1 {
  flex: 0 0 8%;
  max-height: 100%;
  border-radius: 1rem;
  background-color: transparent;
  position: relative;
  z-index: 10;
}

.section2 {
  flex: 0 0 30%;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 1rem;
  margin: 0.5rem 0;
  overflow: hidden;
  border: 1px solid gray;
  border-top: none;
  border-bottom: none;
  box-sizing: border-box;
  position: relative;
}

.section3-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.section3 {
  flex: 1;
  background: var(--bg-tertiary, white);
  border-radius: 1rem;
  margin: 0.5rem;
  margin-left: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 100%;
}

// 收藏列表面板
.favorites-list-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  
  .panel-header {
    padding: 16px 20px;
    border-bottom: 1px solid #e8e8e8;
    display: flex;
    align-items: center;
    justify-content: space-between;
    
    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }
    
    .stats-mini {
      .stat {
        font-size: 13px;
        color: #999;
      }
    }
  }
  
  .filters {
    padding: 12px 20px;
    border-bottom: 1px solid #e8e8e8;
    display: flex;
    gap: 8px;
    
    .filter-select {
      flex: 1;
      padding: 6px 12px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      font-size: 13px;
      color: #666;
      background: white;
      cursor: pointer;
      
      &:focus {
        outline: none;
        border-color: rgb(165, 42, 42);
      }
    }
  }
  
  .search-box {
    padding: 12px 20px;
    border-bottom: 1px solid #e8e8e8;
    position: relative;
    
    .search-input {
      width: 100%;
      padding: 8px 36px 8px 36px;
      border: 1px solid #e0e0e0;
      border-radius: 20px;
      font-size: 13px;
      color: #333;
      background: #f8f9fa;
      transition: all 0.2s;
      
      &:focus {
        outline: none;
        border-color: rgb(165, 42, 42);
        background: white;
      }
      
      &::placeholder {
        color: #bbb;
      }
    }
    
    .search-icon {
      position: absolute;
      left: 32px;
      top: 50%;
      transform: translateY(-50%);
      color: #999;
      pointer-events: none;
    }
    
    .clear-btn {
      position: absolute;
      right: 32px;
      top: 50%;
      transform: translateY(-50%);
      width: 24px;
      height: 24px;
      border: none;
      background: #e0e0e0;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #666;
      transition: all 0.2s;
      
      &:hover {
        background: #d0d0d0;
        color: #333;
      }
    }
  }
  
  .favorites-items {
    flex: 1;
    overflow-y: auto;
    
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: #d0d0d0;
      border-radius: 3px;
    }
  }
}

.favorite-item {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #f8f9fa;
  }
  
  &.active {
    background: #fef3f3;
    border-left: 3px solid rgb(165, 42, 42);
  }
  
  .item-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    
    .item-text {
      .item-title {
        font-size: 15px;
        font-weight: 600;
        color: #333;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 4px;
        
        .source-name {
          color: rgb(165, 42, 42);
        }
        
        .sender-name {
          color: #666;
          font-weight: 500;
          font-size: 14px;
        }
      }
      
      .item-preview {
        font-size: 13px;
        color: #999;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    
    .item-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      
      .item-badge {
        padding: 3px 10px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 600;
        
        &.badge-text {
          background: #f0f0f0;
          color: #666;
        }
        
        &.badge-code {
          background: #fff3e0;
          color: #e65100;
        }
        
        &.badge-image {
          background: #e8f5e9;
          color: #2e7d32;
        }
      }
      
      .item-time {
        font-size: 11px;
        color: #bbb;
      }
    }
  }
}

.empty-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #999;
  
  .empty-icon {
    color: #ddd;
    margin-bottom: 16px;
  }
  
  p {
    margin: 0 0 8px 0;
    font-size: 15px;
    font-weight: 500;
  }
  
  .empty-hint {
    font-size: 13px;
    color: #bbb;
  }
}

// 欢迎状态
.welcome-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  
  .welcome-icon {
    color: #ddd;
    margin-bottom: 16px;
  }
  
  p {
    margin: 0;
    font-size: 14px;
  }
}

// 收藏详情
.favorite-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  
  .detail-header {
    padding: 20px 24px;
    border-bottom: 1px solid #e8e8e8;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    
    .detail-info {
      flex: 1;
      
      h3 {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }
      
      .detail-meta {
        display: flex;
        align-items: center;
        gap: 12px;
        
        .type-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          
          &.type-private {
            background: #e3f2fd;
            color: #1976d2;
          }
          
          &.type-group {
            background: #f3e5f5;
            color: #7b1fa2;
          }
          
          &.type-chatroom {
            background: #fce4ec;
            color: #c2185b;
          }
        }
        
        .sender-info {
          font-size: 13px;
          color: #666;
          padding: 4px 10px;
          background: #f5f5f5;
          border-radius: 12px;
        }
        
        .detail-time {
          font-size: 13px;
          color: #999;
        }
      }
    }
    
    .detail-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .remove-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border: 1px solid #e0e0e0;
        background: white;
        border-radius: 6px;
        color: #666;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
        
        &:hover {
          background: #fee;
          border-color: #f44336;
          color: #f44336;
        }
      }
    }
  }
  
  .code-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: #1e1e1e;
    
    .code-header {
      padding: 12px 20px;
      background: #252525;
      border-bottom: 1px solid #3a3a3a;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
      
      .language {
        font-size: 12px;
        font-weight: 700;
        color: #fbbf24;
        text-transform: uppercase;
      }
      
      .filename {
        font-size: 13px;
        color: #999;
        font-family: monospace;
        flex: 1;
      }
      
      .copy-code-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border: 1px solid #3a3a3a;
        background: #2a2a2a;
        border-radius: 6px;
        color: #ddd;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        
        &:hover {
          background: #3a3a3a;
          border-color: rgb(165, 42, 42);
        }
      }
    }
    
    pre {
      flex: 1;
      margin: 0;
      padding: 20px;
      overflow: auto;
      
      code {
        font-family: 'Courier New', 'Consolas', monospace;
        font-size: 14px;
        line-height: 1.6;
        color: #d4d4d4;
      }
    }
  }
  
  .text-content {
    flex: 1;
    padding: 24px;
    overflow-y: auto;
    
    p {
      margin: 0;
      font-size: 15px;
      line-height: 1.8;
      color: #333;
      white-space: pre-wrap;
      word-break: break-word;
    }
  }
  
  .image-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #f5f5f5;
    
    .favorite-image {
      flex: 1;
      width: 100%;
      object-fit: contain;
      cursor: pointer;
      transition: transform 0.2s;
      
      &:hover {
        transform: scale(1.02);
      }
    }
    
    .image-info {
      padding: 16px 24px;
      background: white;
      border-top: 1px solid #e8e8e8;
      display: flex;
      align-items: center;
      justify-content: space-between;
      
      .file-name {
        font-size: 14px;
        color: #666;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .download-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border: 1px solid #e0e0e0;
        background: white;
        border-radius: 6px;
        color: #666;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
        
        &:hover {
          background: #f5f5f5;
          border-color: rgb(165, 42, 42);
          color: rgb(165, 42, 42);
        }
      }
    }
  }
  
  .file-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    
    .file-icon {
      margin-bottom: 24px;
      color: #999;
    }
    
    .file-details {
      text-align: center;
      
      .file-name {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        margin-bottom: 8px;
        word-break: break-all;
      }
      
      .file-size {
        font-size: 14px;
        color: #999;
        margin-bottom: 24px;
      }
      
      .download-file-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 24px;
        border: none;
        background: linear-gradient(135deg, rgb(165, 42, 42) 0%, rgb(140, 30, 30) 100%);
        color: white;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(165, 42, 42, 0.4);
        }
      }
    }
  }
}

/* 响应式布局 - 大屏幕 */
@media (min-width: 1300px) {
  .container {
    margin: 5vh 10vw;
    border-radius: 1rem;
  }
}

/* 响应式布局 - 中等屏幕 */
@media (max-width: 1299px) and (min-width: 1025px) {
  .container {
    margin: 2vh 5vw;
    border-radius: 0.8rem;
  }
}

/* 响应式布局 - 平板设备 */
@media (max-width: 1024px) and (min-width: 769px) {
  .container {
    border-radius: 0.5rem;
    margin: 1vh 2vw;
  }
}

/* 响应式布局 - 移动设备 */
@media (max-width: 768px) {
  .favorites-page {
    height: 100vh;
    overflow: hidden;
  }

  .container {
    border-radius: 0;
    margin: 0;
    height: 100vh;
  }
}
</style>
