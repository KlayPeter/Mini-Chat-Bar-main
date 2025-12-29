<template>
  <div class="bottom-navbar">
    <div
      class="nav-item"
      @click="chat"
      :class="{ active: activeTab === 'chat' }"
    >
      <font-awesome-icon icon="comment" />
      <span>聊天</span>
    </div>
    <div
      class="nav-item"
      @click="contacts"
      :class="{ active: activeTab === 'contacts' }"
    >
      <font-awesome-icon icon="users" />
      <span>通讯录</span>
    </div>
    <div 
      class="nav-item" 
      @click="toGroupChat" 
      :class="{ active: activeTab === 'group' }"
    >
      <font-awesome-icon :icon="['fas', 'users']" />
      <span>群聊</span>
    </div>
    <div
      class="nav-item"
      @click="togithub"
      :class="{ active: activeTab === 'favorites' }"
    >
      <font-awesome-icon icon="star" />
      <span>收藏夹</span>
    </div>
    <div
      class="nav-item"
      @click="showProfile"
      :class="{ active: activeTab === 'profile' }"
    >
      <div class="avatar-wrapper">
        <img
          :src="avatar || '/images/avatar/out.webp'"
          alt="头像"
          class="avatar"
        />
      </div>
      <span>我的</span>
    </div>
  </div>

  <!-- 个人资料弹窗 -->
  <div
    v-if="showProfileModal"
    class="profile-modal-overlay"
    @click="hideProfile"
  >
    <div class="profile-modal" @click.stop>
      <div class="profile-header">
        <img
          :src="avatar || '/images/avatar/out.webp'"
          alt="头像"
          class="profile-avatar"
        />
        <h3>个人中心</h3>
      </div>
      <div class="profile-menu">
        <div class="menu-item" @click="logout">
          <font-awesome-icon icon="sign-out-alt" />
          <span>退出登录</span>
          <font-awesome-icon icon="chevron-right" class="arrow" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import axios from 'axios'
import { socket } from '../../utils/socket'
import { useRouter, useRoute } from 'vue-router'

const emit = defineEmits(['showchat', 'showcontacts', 'todetail'])
const router = useRouter()
const route = useRoute()

const avatar = ref('')
const activeTab = ref('chat')
const showProfileModal = ref(false)

// 根据当前路由设置activeTab
function updateActiveTab() {
  const path = route.path
  if (path === '/group-chat') {
    activeTab.value = 'group'
  } else if (path === '/favorites') {
    activeTab.value = 'favorites'
  } else if (path === '/contacts') {
    activeTab.value = 'contacts'
  } else if (path === '/chats' || path === '/' || path.includes('/chatdetail') || path.includes('/chat-ai')) {
    activeTab.value = 'chat'
  }
}

// 监听路由变化
watch(() => route.path, () => {
  updateActiveTab()
})

function chat() {
  activeTab.value = 'chat'
  router.push('/chats')
}

function contacts() {
  activeTab.value = 'contacts'
  router.push('/contacts')
}

function toGroupChat() {
  activeTab.value = 'group'
  router.push('/group-chat')
}

function togithub() {
  hideProfile()
  activeTab.value = 'favorites'
  router.push('/favorites')
}

function showProfile() {
  activeTab.value = 'profile'
  showProfileModal.value = true
}

function hideProfile() {
  showProfileModal.value = false
  // 返回之前的页面，不改变activeTab
  updateActiveTab()
}

function logout() {
  localStorage.clear()
  location.reload()
}

onMounted(async () => {
  // 初始化时设置activeTab
  updateActiveTab()
  
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
    avatar.value = res.data.ava

    // 监听头像更新事件
    socket.on('avatar-updated', (data) => {
      // 如果是当前用户的头像更新，则更新本地头像
      const currentUserId = localStorage.getItem('userId')
      if (data.userId.toString() === currentUserId.toString()) {
        avatar.value = data.newAvatarUrl
        console.log('底部导航栏头像已更新:', data.newAvatarUrl)
      }
    })
  } catch (err) {
    console.error('用户头像获取失败：', err)
  }
})

onBeforeUnmount(() => {
  socket.off('avatar-updated')
})
</script>

<style scoped lang="scss">
.bottom-navbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 75px;
  background: var(--bg-tertiary, #ffffff);
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-shadow: var(--shadow-md, 0 -4px 20px rgba(0, 0, 0, 0.08));
  z-index: 1000;
  padding: 10px 12px;
  border-radius: 24px 24px 0 0;
  margin: 0 8px;
  backdrop-filter: blur(10px);
  border-top: 1px solid var(--border-color, rgba(0, 0, 0, 0.06));

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px 12px;
    border-radius: 12px;
    transition: all 0.3s ease;
    cursor: pointer;
    min-width: 50px;
    position: relative;

    &:active {
      transform: scale(0.95);
    }

    &.active {
      background: linear-gradient(135deg, rgba(255, 127, 80, 0.1) 0%, rgba(255, 140, 100, 0.15) 100%);
      transform: translateY(-2px);

      svg,
      .ai-icon {
        color: rgb(255, 127, 80);
        filter: drop-shadow(0 0 8px rgba(255, 127, 80, 0.3));
      }

      span {
        color: rgb(255, 127, 80);
        font-weight: 600;
      }
    }

    svg {
      font-size: 24px;
      color: var(--text-secondary, #a0a0a0);
      margin-bottom: 4px;
      transition: all 0.3s ease;
    }

    .ai-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      margin-bottom: 4px;
      transition: all 0.3s ease;
      filter: none;
    }

    .avatar-wrapper {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      overflow: hidden;
      margin-bottom: 4px;
      border: 2px solid transparent;
      transition: all 0.3s ease;

      .avatar {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    span {
      font-size: 11px;
      color: var(--text-secondary, #a0a0a0);
      font-weight: 500;
      transition: all 0.3s ease;
      text-align: center;
      line-height: 1.2;
    }

    &:hover:not(.active) {
      background: rgba(255, 127, 80, 0.05);

      svg,
      .ai-icon {
        transform: scale(1.1);
        color: rgb(255, 127, 80);
      }

      .avatar-wrapper {
        transform: scale(1.1);
        border-color: rgb(255, 127, 80);
      }

      span {
        color: rgb(255, 127, 80);
      }
    }

    &.active .avatar-wrapper {
      border-color: rgb(255, 127, 80);
    }
  }
}

// 个人资料弹窗样式
.profile-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: flex-end;
  z-index: 2000;
  backdrop-filter: blur(5px);
}

.profile-modal {
  background: var(--bg-tertiary, #fff);
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 400px;
  padding: 20px;
  animation: slideUp 0.3s ease;
  box-shadow: var(--shadow-lg, 0 -5px 20px rgba(0, 0, 0, 0.2));

  .profile-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border-color-light, #eee);
    margin-bottom: 20px;

    .profile-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
      margin-bottom: 10px;
      border: 3px solid var(--primary-color);
    }

    h3 {
      color: var(--text-primary, #333);
      font-size: 18px;
      font-weight: 600;
    }
  }

  .profile-menu {
    .menu-item {
      display: flex;
      align-items: center;
      padding: 15px 0;
      border-bottom: 1px solid var(--border-color, #f0f0f0);
      cursor: pointer;
      transition: all 0.3s ease;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: var(--hover-bg, #f8f9fa);
        padding-left: 10px;
      }

      svg:first-child {
        color: var(--primary-color);
        margin-right: 15px;
        font-size: 18px;
      }

      span {
        flex: 1;
        color: var(--text-primary, #333);
        font-size: 16px;
        font-weight: 500;
      }

      .arrow {
        color: var(--text-tertiary, #ccc);
        font-size: 14px;
      }
    }
  }
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 只在移动设备上显示 */
@media (min-width: 769px) {
  .bottom-navbar {
    display: none;
  }
}

/* 移动设备优化 */
@media (max-width: 768px) {
  .bottom-navbar {
    height: 65px;
    padding: 8px;
    margin: 0;
    border-radius: 0;
    background: var(--bg-primary, #ffffff);
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);

    .nav-item {
      padding: 6px 10px;
      min-width: 48px;

      svg {
        font-size: 22px;
        margin-bottom: 3px;
      }

      .ai-icon {
        width: 22px;
        height: 22px;
        margin-bottom: 3px;
      }

      .avatar-wrapper {
        width: 26px;
        height: 26px;
        margin-bottom: 3px;
      }

      span {
        font-size: 11px;
      }

      &.active {
        background: linear-gradient(135deg, rgba(255, 127, 80, 0.12) 0%, rgba(255, 140, 100, 0.18) 100%);
      }
    }
  }
}

/* 小屏移动设备 */
@media (max-width: 480px) {
  .bottom-navbar {
    height: 60px;
    padding: 6px;

    .nav-item {
      padding: 4px 8px;
      min-width: 45px;

      svg {
        font-size: 20px;
        margin-bottom: 2px;
      }

      .ai-icon {
        width: 20px;
        height: 20px;
        margin-bottom: 2px;
      }

      .avatar-wrapper {
        width: 24px;
        height: 24px;
        margin-bottom: 2px;
      }

      span {
        font-size: 10px;
      }
    }
  }

  .profile-modal {
    padding: 15px;

    .profile-header {
      .profile-avatar {
        width: 50px;
        height: 50px;
      }

      h3 {
        font-size: 16px;
      }
    }

    .profile-menu {
      .menu-item {
        padding: 12px 0;

        svg:first-child {
          font-size: 16px;
          margin-right: 12px;
        }

        span {
          font-size: 14px;
        }
      }
    }
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .bottom-navbar .nav-item {
    &:active {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(0.95);
    }
  }

  .profile-modal .menu-item {
    &:active {
      background: #e9ecef;
    }
  }
}

/* 横屏模式优化 */
@media (max-width: 768px) and (orientation: landscape) {
  .bottom-navbar {
    height: 60px;

    .nav-item {
      span {
        display: none; // 横屏时隐藏文字，只显示图标
      }

      svg,
      .ai-icon {
        margin-bottom: 0;
      }

      .avatar-wrapper {
        margin-bottom: 0;
      }
    }
  }
}

/* 高分辨率屏幕优化 */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .bottom-navbar {
    .nav-item {
      .ai-icon,
      .avatar-wrapper .avatar {
        image-rendering: -webkit-optimize-contrast;
        image-rendering: crisp-edges;
      }
    }
  }

  .profile-modal {
    .profile-header .profile-avatar {
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
  }
}
</style>
