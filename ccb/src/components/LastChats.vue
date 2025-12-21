<template>
  <div class="contacts">
    <!-- 配色设置弹窗 -->
    <div class="theme-modal" v-if="issetting" @click.self="issetting = false">
      <div class="theme-container">
        <div class="theme-header">
          <h2>🎨 选择主题配色</h2>
          <button class="close-btn" @click="issetting = false">✕</button>
        </div>
        <div class="theme-options">
          <div class="theme-card" @click="toBeige">
            <div class="theme-preview beige-preview">
              <div class="preview-circle"></div>
              <div class="preview-circle"></div>
              <div class="preview-circle"></div>
            </div>
            <div class="theme-info">
              <h3>米色经典</h3>
              <p>Beige Classic</p>
            </div>
            <div class="theme-colors">
              <span class="color-dot" style="background: #f9f9f9"></span>
              <span class="color-dot" style="background: #444444"></span>
            </div>
          </div>

          <div class="theme-card" @click="toMist">
            <div class="theme-preview mist-preview">
              <div class="preview-circle"></div>
              <div class="preview-circle"></div>
              <div class="preview-circle"></div>
            </div>
            <div class="theme-info">
              <h3>晴空薄雾</h3>
              <p>Sky Mist</p>
            </div>
            <div class="theme-colors">
              <span
                class="color-dot"
                style="background: rgba(220, 225, 230, 1)"
              ></span>
              <span class="color-dot" style="background: #2c3e50"></span>
            </div>
          </div>

          <div class="theme-card" @click="toApricot">
            <div class="theme-preview apricot-preview">
              <div class="preview-circle"></div>
              <div class="preview-circle"></div>
              <div class="preview-circle"></div>
            </div>
            <div class="theme-info">
              <h3>温暖杏黄</h3>
              <p>Warm Apricot</p>
            </div>
            <div class="theme-colors">
              <span
                class="color-dot"
                style="background: rgba(255, 235, 215, 1)"
              ></span>
              <span class="color-dot" style="background: #5c4033"></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="dashboard-header">
      <div class="back-btn" @click="back" v-if="isMobile">
        <font-awesome-icon icon="chevron-left" />
      </div>
      <span class="title">个人</span>
      <div class="add-menu-container">
        <button class="add-btn" @click="toggleAddMenu">
          +
        </button>
        <div v-if="showAddMenu" class="add-dropdown-menu">
          <div class="add-menu-item" @click="addFriend">
            <font-awesome-icon icon="user-plus" />
            <span>加好友</span>
          </div>
          <div class="add-menu-item" @click="createGroup">
            <font-awesome-icon icon="users" />
            <span>新建群聊</span>
          </div>
        </div>
      </div>
    </div>

    <div class="profile-section">
      <div class="avatar-container">
        <div class="frame" @click="showAvatarSelector">
          <img
            :src="(userava || '/images/avatar/out.webp') + '?t=' + avatarKey"
            :key="avatarKey"
            alt="avatar"
          />
          <div class="status-indicator-ring" :class="statu"></div>
        </div>
        <div class="settings-icon" @click="setcolor">
          <font-awesome-icon :icon="['fas', 'gear']" />
        </div>
      </div>

      <div class="user-info">
        <div class="username">{{ username ? username : '游客' }}</div>
        <div class="user-status" @click="toggleStatus">
          <span
            class="status-dot"
            :class="statu === 'occupied' ? 'busy' : 'online'"
          ></span>
          <span class="status-text">{{
            statu === 'available' ? '在线' : '忙碌'
          }}</span>
        </div>
      </div>
    </div>

    <div class="search-container">
      <div class="search-input-wrapper">
        <!-- <font-awesome-icon icon="search" class="search-icon" /> -->
        <input
          type="text"
          v-model="searchKeyword"
          @input="handleSearch"
          placeholder="搜索用户..."
        />
      </div>
    </div>

    <div class="list-section">
      <div class="list-header">
        <span class="list-title">{{
          searchKeyword ? '搜索结果' : '最近活动'
        }}</span>
        <span class="view-all" v-if="!searchKeyword">查看全部</span>
      </div>

      <!-- 搜索结果列表 -->
      <div
        v-if="searchKeyword && searchResults.length > 0"
        class="search-results-container"
      >
        <!-- 用户搜索结果 -->
        <div v-if="userSearchResults.length > 0" class="search-section">
          <div class="search-section-header">
            <span class="section-title">联系人</span>
            <span class="section-count">{{ userSearchResults.length }}</span>
          </div>
          <ul class="chat-list">
            <li
              v-for="user in userSearchResults"
              :key="'user-' + user._id"
              class="chat-item"
              @click="jumpToUserChat(user)"
            >
              <div class="chat-avatar">
                <img
                  :src="user.avatar || '/images/avatar/default-avatar.webp'"
                  alt="头像"
                />
              </div>
              <div class="chat-details">
                <div
                  class="chat-name"
                  v-html="user.highlightedName || user.name"
                ></div>
                <div class="chat-message">User</div>
              </div>
            </li>
          </ul>
        </div>

        <!-- 消息搜索结果 -->
        <div v-if="messageSearchResults.length > 0" class="search-section">
          <div class="search-section-header">
            <span class="section-title">消息</span>
            <span class="section-count">{{ messageSearchResults.length }}</span>
          </div>
          <ul class="chat-list">
            <li
              v-for="result in messageSearchResults"
              :key="'msg-' + result._id"
              class="chat-item"
              @click="jumpToSearchResult(result)"
            >
              <div class="chat-avatar">
                <img
                  :src="
                    result.senderAvatar || '/images/avatar/default-avatar.webp'
                  "
                  alt="头像"
                />
              </div>
              <div class="chat-details">
                <div class="chat-name">
                  {{ result.senderName || result.from }}
                </div>
                <div
                  class="chat-message"
                  v-html="result.highlightedContent || result.content"
                ></div>
              </div>
              <div class="chat-time">{{ formatDate(result.time) }}</div>
            </li>
          </ul>
        </div>
      </div>

      <!-- 搜索状态提示 -->
      <div v-else-if="searchKeyword && isSearching" class="search-status">
        <div class="loading">搜索中...</div>
      </div>

      <!-- 无搜索结果提示 -->
      <div
        v-else-if="searchKeyword && !isSearching && searchResults.length === 0"
        class="search-status"
      >
        <div class="no-results">未找到结果</div>
      </div>

      <!-- 正常聊天列表 -->
      <ul class="chat-list" v-else>
        <li
          class="chat-item"
          v-for="friend in friends"
          :key="friend.id"
          @click="switchChat(friend)"
          @contextmenu.prevent="showContextMenu($event, friend)"
        >
          <div class="chat-avatar">
            <div v-if="friend.unreadCount > 0" class="unread-dot"></div>
            <img :src="friend.avatar" alt="avatar" />
          </div>
          <div class="chat-details">
            <div class="chat-name">{{ friend.name }}</div>
            <div
              class="chat-message"
              :class="{ 'unread-text': friend.unreadCount > 0 }"
            >
              {{ friend.lastMessage }}
            </div>
          </div>
          <div class="chat-time">{{ formatDate(friend.lastTime) }}</div>
        </li>
      </ul>
    </div>

    <!-- 头像选择器 -->
    <div v-if="avatarSelector.show" class="avatar-selector">
      <div class="avatar-selector-content">
        <h3>选择头像</h3>

        <!-- 上传自定义头像 -->
        <div class="upload-section">
          <input
            type="file"
            ref="avatarFileInput"
            accept="image/*"
            @change="handleAvatarUpload"
            style="display: none"
          />
          <button @click="triggerAvatarUpload" class="upload-btn">
            <img src="/images/icon/upload.png" alt="上传" />
            上传自定义头像
          </button>
        </div>

        <div class="divider">或选择预设头像</div>

        <div class="avatar-grid">
          <div
            v-for="avatar in predefinedAvatars"
            :key="avatar.name"
            class="avatar-option"
            @click="selectAvatar(avatar.url)"
          >
            <img :src="avatar.url" :alt="avatar.name" />
            <span>{{ avatar.name }}</span>
          </div>
        </div>
        <div class="avatar-selector-actions">
          <button @click="hideAvatarSelector" class="cancel-btn">取消</button>
        </div>
      </div>
      <div
        v-if="avatarSelector.show"
        class="avatar-selector-overlay"
        @click="hideAvatarSelector"
      ></div>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.show"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <div class="context-menu-item" @click="clearAllChats">
        <img
          src="/images/icon/delete-2.png"
          alt="删除"
          style="width: 16px; height: 16px"
        />
        一键清空所有聊天记录
      </div>
      <div
        class="context-menu-item"
        @click="deleteChatWith(contextMenu.friend)"
      >
        ❌ 删除与{{ contextMenu.friend?.name }}的聊天记录
      </div>
    </div>

    <!-- 遮罩层，点击关闭菜单 -->
    <div
      v-if="contextMenu.show"
      class="context-menu-overlay"
      @click="hideContextMenu"
    ></div>
  </div>
</template>

<script setup>
import axios from 'axios'
import { onBeforeUnmount, ref, nextTick, computed } from 'vue'
import { defineEmits } from 'vue'
import { onMounted } from 'vue'
import { useChatStore } from '../stores/useChatStore'
import { socket } from '../../utils/socket'
import { watch } from 'vue'

const statu = ref('available')
const issetting = ref(false)
const isMobile = ref(false)
const showAddMenu = ref(false)

// 检测屏幕尺寸
function checkScreen() {
  isMobile.value = window.innerWidth <= 768
}

// 切换添加菜单
function toggleAddMenu() {
  showAddMenu.value = !showAddMenu.value
}

// 加好友功能
function addFriend() {
  showAddMenu.value = false
  // TODO: 实现加好友功能
  console.log('加好友功能')
  alert('加好友功能开发中...')
}

// 新建群聊功能
function createGroup() {
  showAddMenu.value = false
  router.push('/group-chat')
}

// 切换在线状态
function toggleStatus() {
  statu.value = statu.value === 'available' ? 'occupied' : 'available'
}
const friends = ref([])
const From = ref('')

const userid = ref('')
const username = ref('')
const userava = ref('')
const avatarKey = ref(0) // 用于强制刷新头像的key

// 搜索相关状态
const searchKeyword = ref('')
const searchResults = ref([])
const isSearching = ref(false)

// 计算属性：分离用户和消息搜索结果
const userSearchResults = computed(() => {
  return searchResults.value.filter((result) => result.resultType === 'user')
})

const messageSearchResults = computed(() => {
  return searchResults.value.filter(
    (result) => result.resultType === 'message' || !result.resultType
  )
})

// 右键菜单状态
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  friend: null,
})

// 头像选择器状态
const avatarSelector = ref({
  show: false,
})

// 头像文件输入引用
const avatarFileInput = ref(null)

// 预定义头像列表
const predefinedAvatars = ref([
  { name: '忧郁女头', url: '/images/avatar/b-girl.webp' },
  { name: '氛围男头', url: '/images/avatar/g-boy.webp' },
  { name: '卡皮巴拉', url: '/images/avatar/kapibala.jpg' },
  { name: '蜡笔小新', url: '/images/avatar/labixiaoxin.png' },
  { name: '美少女战士', url: '/images/avatar/meishaonv.webp' },
  { name: '日落意境', url: '/images/avatar/sunset.webp' },
  { name: '默认头像', url: '/images/avatar/default-avatar.webp' },
])

const chatStore = useChatStore()

const emit = defineEmits(['hidechat', 'changecolor', 'todetail'])

function back() {
  emit('hidechat', '关掉聊天')
}

function setcolor() {
  issetting.value = true
}

function toBeige() {
  emit('changecolor', { color: 'beige' })
  issetting.value = false
}
function toMist() {
  emit('changecolor', { color: 'mist' })
  issetting.value = false
}
function toApricot() {
  emit('changecolor', { color: 'apricot' })
  issetting.value = false
}

// UI切换聊天页
async function switchChat(friend) {
  chatStore.switchChatUser(friend.id)
  emit('todetail', {
    uname: friend.name,
    img: friend.avatar,
    userId: friend.id,
  })

  // 标记消息为已读
  if (friend && friend.unreadCount > 0) {
    try {
      const token = localStorage.getItem('token')
      await axios.put(
        `${import.meta.env.VITE_BASE_URL}/api/chat/read/${friend.id}`,
        {},
        {
          headers: {
            authorization: `Bearer ${token}`,
          },
        }
      )

      // 清除未读标记
      friend.unreadCount = 0

      console.log(`已标记与 ${friend.name} 的消息为已读`)
    } catch (err) {
      console.error('标记消息为已读失败:', err)
    }
  }
}

// 时间格式化
function formatDate(dateStr) {
  const date = new Date(dateStr)
  const current_date = new Date()
  if (date.toLocaleDateString() === current_date.toLocaleDateString()) {
    return isNaN(date.getTime()) ? '' : date.toLocaleTimeString().slice(0, 5)
  } else {
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString().slice(0, 10)
  }
}

// 获取用户信息
async function getinfo() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(
      `${import.meta.env.VITE_BASE_URL}/api/user/info`,
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    )

    userava.value = res.data.ava
    avatarKey.value = Date.now() // 使用时间戳强制刷新头像显示
    userid.value = res.data.id
    username.value = res.data.name

    // 发送登录事件
    socket.emit('login', res.data.id)
  } catch (err) {
    console.error('用户名获取失败：', err)
  }
}

// 获取好友列表
async function getfriends() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios(
      `${import.meta.env.VITE_BASE_URL}/api/user/friends`,
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    )

    const newFriends = Array.isArray(res.data) ? res.data : []

    // 转换后端数据结构为前端期望的结构
    const transformedFriends = newFriends.map((friend) => ({
      id: friend.uID,
      name: friend.uName,
      avatar: friend.uAvatar,
      uID: friend.uID,
      uName: friend.uName,
      uAvatar: friend.uAvatar,
    }))

    const lastMsgPromises = transformedFriends.map((friend) =>
      axios
        .get(
          `${import.meta.env.VITE_BASE_URL}/api/chat/last_message/${friend.id}`,
          {
            headers: {
              authorization: `Bearer ${token}`,
            },
          }
        )
        .then((msgRes) => ({
          id: friend.id,
          lastMessage: msgRes.data.content,
          lastTime: msgRes.data.time,
        }))
        .catch((err) => {
          console.error(`初始化时获取${friend.name}的消息失败`, err)
          return { id: friend.id, lastMessage: '', lastTime: '' }
        })
    )

    const lastMessages = await Promise.all(lastMsgPromises)

    transformedFriends.forEach((friend) => {
      const msg = lastMessages.find((m) => m.id === friend.id)
      const existingFriend = friends.value.find((f) => f.id === friend.id)
      Object.assign(friend, {
        lastMessage: msg?.lastMessage || '',
        lastTime: msg?.lastTime || '',
        unreadCount: existingFriend ? existingFriend.unreadCount : 0, // 保留未读数量
      })
    })

    // 获取所有好友的未读消息数量
    try {
      const token = localStorage.getItem('token')
      const unreadRes = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/api/chat/unread`,
        {
          headers: {
            authorization: `Bearer ${token}`,
          },
        }
      )

      // 更新每个好友的未读消息数量
      const unreadCounts = unreadRes.data
      transformedFriends.forEach((friend) => {
        friend.unreadCount = unreadCounts[friend.id] || 0
      })

      console.log('未读消息数量:', unreadCounts)
    } catch (err) {
      console.error('获取未读消息数量失败:', err)
    }

    friends.value = [...transformedFriends].sort(
      (a, b) => new Date(b.lastTime || 0) - new Date(a.lastTime || 0)
    ) // 按时间倒序排列，包含所有好友
  } catch (err) {
    console.error('初始化联系人或消息失败:', err)
  }
}

async function updateFriendMessage(fromUserId, showRedDot = true) {
  const senderIndex = friends.value.findIndex(
    (friend) => friend.id === fromUserId
  )
  if (senderIndex !== -1) {
    try {
      const token = localStorage.getItem('token')
      const msgRes = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/api/chat/last_message/${fromUserId}`,
        {
          headers: {
            authorization: `Bearer ${token}`,
          },
        }
      )

      friends.value[senderIndex].lastMessage = msgRes.data.content || ''
      friends.value[senderIndex].lastTime = msgRes.data.time || ''

      // 获取未读消息数量
      if (
        showRedDot &&
        chatStore.currentChatUser?.toString() !== fromUserId?.toString()
      ) {
        const unreadRes = await axios.get(
          `${import.meta.env.VITE_BASE_URL}/api/chat/unread/${fromUserId}`,
          {
            headers: {
              authorization: `Bearer ${token}`,
            },
          }
        )
        friends.value[senderIndex].unreadCount = unreadRes.data.count
      }

      console.log(`更新 ${friends.value[senderIndex].name} 的最后消息`, {
        lastMessage: msgRes.data.content,
        unreadCount: friends.value[senderIndex].unreadCount,
      })

      // 重新按时间排序
      friends.value.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime))
    } catch (err) {
      console.error(
        `收到新消息通知后，获取用户 ${fromUserId} 最新消息失败:`,
        err
      )
    }
  } else {
    console.warn(
      `未找到 ID 为 ${fromUserId} 的朋友在 friends 列表中。可能需要刷新好友列表`
    )
    // 如果好友列表中没有这个人，刷新整个好友列表
    await getfriends()
  }
}

onMounted(async () => {
  // 检测屏幕尺寸
  checkScreen()
  window.addEventListener('resize', checkScreen)

  await getinfo()
  await getfriends()

  socket.on('private-message', ({ from, to }) => {
    From.value = from
    console.log('收到消息通知:', { from, to, currentUser: userid.value })

    // 确保消息是发给当前用户的，或者是当前用户发送的
    if (to.toString() === userid.value.toString()) {
      // 收到别人发来的消息，显示小红点
      updateFriendMessage(from)
    } else if (from.toString() === userid.value.toString()) {
      // 自己发送的消息，更新lastChat但不显示小红点
      updateFriendMessage(to, false)
    }
  })

  // 监听头像更新事件
  socket.on('avatar-updated', (data) => {
    // 更新好友列表中对应好友的头像
    const friendIndex = friends.value.findIndex(
      (friend) => friend.id.toString() === data.userId.toString()
    )
    if (friendIndex !== -1) {
      friends.value[friendIndex].avatar = data.newAvatarUrl
    }

    // 如果是自己的头像更新，则更新左下角的头像显示
    if (data.userId.toString() === userid.value.toString()) {
      userava.value = data.newAvatarUrl
      avatarKey.value = Date.now() // 强制刷新头像显示
    }
  })

  // 监听刷新好友列表事件（转发消息后触发）
  socket.on('refresh-friend-list', () => {
    getfriends()
  })

  // 点击其他地方关闭右键菜单
  document.addEventListener('click', hideContextMenu)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', hideContextMenu)
  window.removeEventListener('resize', checkScreen)
  socket.off('private-message')
  socket.off('avatar-updated')
  socket.off('refresh-friend-list')
})

// 显示右键菜单
function showContextMenu(event, friend) {
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    friend: friend,
  }
}

// 隐藏右键菜单
function hideContextMenu() {
  contextMenu.value.show = false
}

// 一键清空所有聊天记录
async function clearAllChats() {
  if (confirm('确定要清空所有聊天记录吗？此操作不可恢复！')) {
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${import.meta.env.VITE_BASE_URL}/api/chat/messages`, {
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      // 清空本地聊天列表
      friends.value = []
      alert('所有聊天记录已清空！')
    } catch (err) {
      console.error('清空聊天记录失败:', err)
      alert('清空聊天记录失败，请重试！')
    }
  }
  hideContextMenu()
}

// 删除与指定用户的聊天记录
async function deleteChatWith(friend) {
  if (confirm(`确定要删除与${friend.name}的所有聊天记录吗？此操作不可恢复！`)) {
    try {
      const token = localStorage.getItem('token')
      await axios.delete(
        `${import.meta.env.VITE_BASE_URL}/api/chat/messages/${friend.id}`,
        {
          headers: {
            authorization: `Bearer ${token}`,
          },
        }
      )

      // 从本地聊天列表中移除该好友
      const index = friends.value.findIndex((f) => f.id === friend.id)
      if (index !== -1) {
        friends.value.splice(index, 1)
      }

      alert(`与${friend.name}的聊天记录已删除！`)
    } catch (err) {
      console.error('删除聊天记录失败:', err)
      alert('删除聊天记录失败，请重试！')
    }
  }
  hideContextMenu()
}

// 显示头像选择器
function showAvatarSelector() {
  avatarSelector.value.show = true
}

// 隐藏头像选择器
function hideAvatarSelector() {
  avatarSelector.value.show = false
}

// 触发头像文件选择
function triggerAvatarUpload() {
  avatarFileInput.value.click()
}

// 处理头像文件上传
async function handleAvatarUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    alert('请选择图片文件！')
    return
  }

  // 验证文件大小（限制为5MB）
  if (file.size > 5 * 1024 * 1024) {
    alert('图片文件大小不能超过5MB！')
    return
  }

  try {
    const token = localStorage.getItem('token')
    const formData = new FormData()
    formData.append('file', file)

    // 上传文件到服务器
    const uploadRes = await axios.post(
      `${import.meta.env.VITE_BASE_URL}/api/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          authorization: `Bearer ${token}`,
        },
      }
    )

    const avatarUrl = uploadRes.data.fileUrl

    // 更新用户头像
    const res = await axios.put(
      `${import.meta.env.VITE_BASE_URL}/api/user/avatar`,
      { avatarUrl },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    )

    // 保存新的token（如果服务器返回了新token）
    if (res.data.token) {
      localStorage.setItem('token', res.data.token)
    }

    // 更新本地头像
    userava.value = avatarUrl
    avatarKey.value = Date.now() // 使用时间戳强制刷新头像显示

    // 强制DOM更新
    await nextTick()

    // 刷新用户信息和好友列表
    await getinfo()
    await getfriends()

    // 通过Socket通知其他用户头像更新
    socket.emit('avatar-updated', {
      userId: userid.value,
      newAvatarUrl: avatarUrl,
    })

    alert('头像上传成功！')
    hideAvatarSelector()

    // 清空文件输入
    if (avatarFileInput.value) {
      avatarFileInput.value.value = ''
    }
  } catch (err) {
    console.error('头像上传失败:', err)
    alert('头像上传失败，请重试！')
  }
}

// 选择预设头像
async function selectAvatar(avatarUrl) {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.put(
      `${import.meta.env.VITE_BASE_URL}/api/user/avatar`,
      { avatarUrl },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    )

    // 保存新的token（如果服务器返回了新token）
    if (res.data.token) {
      localStorage.setItem('token', res.data.token)
    }

    // 更新本地头像
    userava.value = avatarUrl
    avatarKey.value = Date.now() // 使用时间戳强制刷新头像显示

    // 强制DOM更新
    await nextTick()

    // 刷新用户信息和好友列表
    await getinfo()
    await getfriends()

    // 通过Socket通知其他用户头像更新
    socket.emit('avatar-updated', {
      userId: userid.value,
      newAvatarUrl: avatarUrl,
    })

    alert('头像更换成功！')
    hideAvatarSelector()
  } catch (err) {
    console.error('头像更换失败:', err)
    alert('头像更换失败，请重试！')
  }
}

// 搜索处理方法
let searchTimeout = null
async function handleSearch() {
  // 清除之前的搜索定时器
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  // 如果搜索关键词为空，清空搜索结果
  if (!searchKeyword.value.trim()) {
    searchResults.value = []
    isSearching.value = false
    return
  }

  // 设置搜索状态
  isSearching.value = true

  // 防抖处理，500ms后执行搜索
  searchTimeout = setTimeout(async () => {
    try {
      const token = localStorage.getItem('token')

      // 只调用用户搜索接口
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/api/chat/search/users`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            keyword: searchKeyword.value,
            page: 1,
            limit: 20,
          },
        }
      )

      console.log('用户搜索响应:', response.data)

      if (response.data && response.data.success) {
        const userResults = response.data.data.results || []
        // 为用户结果添加类型标识
        searchResults.value = userResults.map((user) => ({
          ...user,
          resultType: 'user',
        }))
      } else {
        console.error('搜索失败:', response.data?.message || '未知错误')
        searchResults.value = []
      }
    } catch (error) {
      console.error('搜索请求失败:', error.response?.data || error.message)
      searchResults.value = []
    } finally {
      isSearching.value = false
    }
  }, 500)
}

// 跳转到搜索结果对应的聊天
function jumpToSearchResult(result) {
  // 找到对应的好友
  const friend = friends.value.find(
    (f) =>
      f.id.toString() === result.from.toString() ||
      f.id.toString() === result.to.toString()
  )

  if (friend) {
    // 切换到对应的聊天
    switchChat(friend)
    // 清空搜索
    searchKeyword.value = ''
    searchResults.value = []
  }
}

// 跳转到用户聊天
function jumpToUserChat(user) {
  // 找到对应的好友
  const friend = friends.value.find(
    (f) => f.id.toString() === user._id.toString() || f.name === user.name
  )

  if (friend) {
    // 切换到对应的聊天
    switchChat(friend)
  } else {
    // 如果好友列表中没有，可能需要添加到好友列表或直接开始聊天
    console.log('用户不在好友列表中:', user)
  }

  // 清空搜索
  searchKeyword.value = ''
  searchResults.value = []
}

onBeforeUnmount(() => {
  document.removeEventListener('click', hideContextMenu)
  socket.off('private-message')
  socket.off('avatar-updated')
  socket.off('refresh-friend-list')
})
</script>

<style scoped lang="scss">
:root {
  --primary-color: rgb(165, 42, 42);
  --text-color-main: #2c3e50;
  --text-color-secondary: #95a5a6;
  --bg-light: #f8f9fa;
  --border-radius-lg: 24px;
  --border-radius-md: 16px;
}

.contacts {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 24px;
  overflow: hidden;
  padding: 20px 24px;
  box-sizing: border-box;
}

/* Dashboard Header */
.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  -webkit-app-region: no-drag;

  .title {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 1px;
    color: #95a5a6;
    text-transform: uppercase;
  }

  .add-menu-container {
    position: relative;
  }

  .add-btn {
    background: transparent;
    border: none;
    font-size: 24px;
    color: #95a5a6;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    transition: color 0.2s;

    &:hover {
      color: rgb(165, 42, 42);
    }
  }

  .add-dropdown-menu {
    position: absolute;
    right: 0;
    top: 35px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    padding: 8px;
    min-width: 140px;
    z-index: 1000;
    animation: slideDown 0.2s ease;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .add-menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #666;
    font-size: 14px;

    svg {
      font-size: 16px;
      color: rgb(165, 42, 42);
    }

    &:hover {
      background: rgba(165, 42, 42, 0.1);
      color: #333;
    }
  }

  .back-btn {
    cursor: pointer;
    color: #95a5a6;
    font-size: 18px;
  }
}

/* Profile Section */
.profile-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
  -webkit-app-region: no-drag;

  .avatar-container {
    position: relative;
    margin-bottom: 12px;

    .frame {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      padding: 4px;
      background: white;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
      cursor: pointer;
      position: relative;
      border: 2px solid #f0f0f0;

      img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
      }

      .status-indicator-ring {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #2ecc71; /* Online green */
        border: 3px solid white;

        &.occupied {
          background: #e74c3c; /* Busy red */
        }
      }
    }

    .settings-icon {
      position: absolute;
      top: 0;
      right: -30px;
      color: #bdc3c7;
      cursor: pointer;
      transition: color 0.2s;

      &:hover {
        color: #7f8c8d;
      }
    }
  }

  .user-info {
    text-align: center;

    .username {
      font-size: 20px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 6px;
    }

    .user-status {
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f0f2f5;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      color: #2ecc71;
      cursor: pointer;

      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: #2ecc71;
        margin-right: 6px;

        &.busy {
          background-color: #e74c3c;
        }
      }

      .status-text {
        color: #2ecc71;
      }
    }
  }
}

/* Search Container */
.search-container {
  margin-bottom: 24px;
  -webkit-app-region: no-drag;

  .search-input-wrapper {
    position: relative;
    background: #f8f9fa;
    border-radius: 12px;
    padding: 10px 16px;
    display: flex;
    align-items: center;

    input {
      border: none;
      background: transparent;
      width: 100%;
      font-size: 14px;
      color: #2c3e50;
      outline: none;

      &::placeholder {
        color: #bdc3c7;
      }
    }
  }
}

/* List Section */
.list-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  -webkit-app-region: no-drag;

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .list-title {
      font-size: 12px;
      font-weight: 600;
      color: #95a5a6;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .view-all {
      font-size: 11px;
      font-weight: 600;
      color: rgb(165, 42, 42);
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .chat-list {
    list-style: none;
    padding: 0;
    margin: 0;
    overflow-y: auto;
    flex: 1;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.1);
      border-radius: 4px;
    }

    .chat-item {
      display: flex;
      align-items: center;
      padding: 10px 0;
      cursor: pointer;
      transition: background 0.2s;
      border-radius: 12px;
      margin-bottom: 4px;

      &:hover {
        background: #f8f9fa;
      }

      .chat-avatar {
        position: relative;
        margin-right: 12px;
        flex-shrink: 0;

        img {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          object-fit: cover;
        }

        .unread-dot {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 10px;
          height: 10px;
          background: rgb(165, 42, 42);
          border-radius: 50%;
          border: 2px solid white;
        }
      }

      .chat-details {
        flex: 1;
        min-width: 0;

        .chat-name {
          font-size: 15px;
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chat-message {
          font-size: 13px;
          color: #95a5a6;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;

          &.unread-text {
            color: #2c3e50;
            font-weight: 500;
          }
        }
      }

      .chat-time {
        font-size: 11px;
        color: #bdc3c7;
        margin-left: 8px;
        white-space: nowrap;
      }
    }
  }
}

/* Search Results */
.search-results-container {
  flex: 1;
  overflow-y: auto;

  .search-section {
    margin-bottom: 20px;

    .search-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 4px 8px;
      border-bottom: 1px solid #f0f0f0;
      margin-bottom: 8px;

      .section-title {
        font-size: 12px;
        font-weight: 600;
        color: #95a5a6;
      }

      .section-count {
        font-size: 11px;
        background: #f0f0f0;
        padding: 2px 6px;
        border-radius: 8px;
        color: #7f8c8d;
      }
    }
  }
}

.search-status {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  color: #95a5a6;
  font-size: 14px;
}

/* Context Menu */
.context-menu {
  position: fixed;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px 0;
  z-index: 1000;
  min-width: 200px;

  .context-menu-item {
    padding: 10px 16px;
    font-size: 14px;
    color: #2c3e50;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;

    &:hover {
      background: #f8f9fa;
    }
  }
}

.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

/* Theme Modal & Avatar Selector styles preserved (simplified) */
.theme-modal,
.avatar-selector {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.theme-container,
.avatar-selector-content {
  background: white;
  border-radius: 24px;
  padding: 24px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.theme-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  h2 {
    margin: 0;
    font-size: 18px;
  }
}

.theme-options {
  display: grid;
  gap: 12px;
}

.theme-card {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 3px solid transparent;
  position: relative;
  overflow: hidden;
  -webkit-app-region: no-drag;
}

.theme-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.5), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.theme-card:hover::before {
  opacity: 1;
}

.theme-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
  border-color: #4caf50;
}

.theme-card:active {
  transform: translateY(-4px) scale(0.98);
}

.theme-preview {
  height: 100px;
  border-radius: 12px;
  margin-bottom: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  position: relative;
  overflow: hidden;
}

.preview-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
  animation: float 3s ease-in-out infinite;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.preview-circle:nth-child(1) {
  animation-delay: 0s;
}

.preview-circle:nth-child(2) {
  animation-delay: 0.5s;
}

.preview-circle:nth-child(3) {
  animation-delay: 1s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.beige-preview {
  background: linear-gradient(135deg, #f9f9f9, #e8e8e8);
  color: #444444;
}

.mist-preview {
  background: linear-gradient(
    135deg,
    rgba(220, 225, 230, 1),
    rgba(180, 190, 200, 1)
  );
  color: #2c3e50;
}

.apricot-preview {
  background: linear-gradient(
    135deg,
    rgba(255, 235, 215, 1),
    rgba(255, 215, 180, 1)
  );
  color: #5c4033;
}

.theme-info {
  margin-bottom: 12px;
}

.theme-info h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.theme-info p {
  margin: 0;
  font-size: 13px;
  color: #888;
  font-style: italic;
}

.theme-colors {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;
}

.theme-card:hover .color-dot {
  transform: scale(1.2);
}

/* 响应式设计 */

/* 平板设备 */
@media (max-width: 1024px) and (min-width: 769px) {
  .contacts {
    padding: 16px 20px;
  }

  .profile-section {
    margin-bottom: 20px;

    .avatar-container .frame {
      width: 70px;
      height: 70px;
    }

    .user-info .username {
      font-size: 18px;
    }
  }

  .search-container {
    margin-bottom: 20px;
  }

  .list-section {
    .chat-item {
      padding: 8px 0;

      .chat-avatar img {
        width: 44px;
        height: 44px;
      }
    }
  }
}

/* 移动设备 */
@media (max-width: 768px) {
  .contacts {
    padding: 16px;
    border-radius: 0;
  }

  .dashboard-header {
    margin-bottom: 16px;

    .title {
      font-size: 12px;
    }
  }

  .profile-section {
    margin-bottom: 20px;

    .avatar-container {
      margin-bottom: 10px;

      .frame {
        width: 70px;
        height: 70px;
      }

      .settings-icon {
        right: -25px;
        font-size: 14px;
      }
    }

    .user-info {
      .username {
        font-size: 18px;
      }

      .user-status {
        font-size: 10px;
        padding: 3px 10px;
      }
    }
  }

  .search-container {
    margin-bottom: 20px;

    input {
      font-size: 14px;
      padding: 10px 14px;
    }
  }

  .list-section {
    .list-header {
      margin-bottom: 12px;

      .list-title {
        font-size: 11px;
      }

      .view-all {
        font-size: 10px;
      }
    }

    .chat-item {
      padding: 10px 0;

      .chat-avatar img {
        width: 44px;
        height: 44px;
      }

      .chat-details {
        .chat-name {
          font-size: 14px;
        }

        .chat-message {
          font-size: 12px;
        }
      }

      .chat-time {
        font-size: 10px;
      }
    }
  }

  /* 主题和头像选择器 */
  .theme-container,
  .avatar-selector-content {
    padding: 20px;
    max-width: 95%;
    border-radius: 16px;
  }

  .theme-options {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .theme-header h2 {
    font-size: 20px;
  }

  .theme-card {
    padding: 16px;
  }

  .avatar-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .avatar-option {
    padding: 8px;

    img {
      width: 50px;
      height: 50px;
    }
  }
}

/* 小屏移动设备 */
@media (max-width: 480px) {
  .contacts {
    padding: 12px;
  }

  .profile-section {
    .avatar-container .frame {
      width: 60px;
      height: 60px;
    }

    .user-info .username {
      font-size: 16px;
    }
  }

  .list-section {
    .chat-item {
      .chat-avatar img {
        width: 40px;
        height: 40px;
      }

      .chat-details {
        .chat-name {
          font-size: 13px;
        }

        .chat-message {
          font-size: 11px;
        }
      }
    }
  }

  .avatar-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .chat-item {
    padding: 12px 0 !important;

    &:active {
      background: #f0f0f0 !important;
      transform: scale(0.98);
    }
  }

  .dashboard-header .add-btn:active,
  .profile-section .user-status:active {
    transform: scale(0.95);
  }
}
</style>
