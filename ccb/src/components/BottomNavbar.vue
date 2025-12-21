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
    <div class="nav-item" @click="toAI" :class="{ active: activeTab === 'ai' }">
      <img src="/images/ai-logo.png" alt="AI" class="ai-icon" />
      <span>AI助手</span>
    </div>
    <div
      class="nav-item"
      @click="tocsdn"
      :class="{ active: activeTab === 'moments' }"
    >
      <font-awesome-icon :icon="['fas', 'eye']" />
      <span>朋友圈</span>
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
        <div class="menu-item" @click="togithub">
          <font-awesome-icon icon="star" />
          <span>收藏夹</span>
          <font-awesome-icon icon="chevron-right" class="arrow" />
        </div>
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
import { ref, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { socket } from '../../utils/socket'
import { useRouter } from 'vue-router'

const emit = defineEmits(['showchat', 'showcontacts', 'todetail'])
const router = useRouter()

const avatar = ref('')
const activeTab = ref('chat')
const showProfileModal = ref(false)

function toAI() {
  activeTab.value = 'ai'
  emit('todetail', '打开AI小助手')
}

function chat() {
  activeTab.value = 'chat'
  emit('showchat', '打开聊天')
}

function contacts() {
  activeTab.value = 'contacts'
  emit('showcontacts', '打开联系人')
}

function tocsdn() {
  activeTab.value = 'moments'
  router.push('/moments')
}

function togithub() {
  hideProfile()
  router.push('/favorites')
}

function showProfile() {
  activeTab.value = 'profile'
  showProfileModal.value = true
}

function hideProfile() {
  showProfileModal.value = false
  activeTab.value = 'chat' // 返回聊天页面
}

function logout() {
  localStorage.clear()
  location.reload()
}

onMounted(async () => {
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
      const currentUserId = JSON.parse(atob(token.split('.')[1])).uid
      if (data.userId.toString() === currentUserId.toString()) {
        avatar.value = data.newAvatarUrl
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
  background: #ffffff;
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
  z-index: 1000;
  padding: 10px 12px;
  border-radius: 24px 24px 0 0;
  margin: 0 8px;
  backdrop-filter: blur(10px);

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
      background: var(--active-bg);
      transform: translateY(-2px);

      svg,
      .ai-icon {
        color: var(--primary-color);
        filter: drop-shadow(0 0 8px var(--primary-color));
      }

      span {
        color: var(--primary-color);
        font-weight: 600;
      }
    }

    svg {
      font-size: 24px;
      color: #a0a0a0;
      margin-bottom: 4px;
      transition: all 0.3s ease;
    }

    .ai-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      margin-bottom: 4px;
      transition: all 0.3s ease;
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
      color: #a0a0a0;
      font-weight: 500;
      transition: all 0.3s ease;
      text-align: center;
      line-height: 1.2;
    }

    &:hover:not(.active) {
      background: var(--hover-bg);

      svg,
      .ai-icon {
        transform: scale(1.1);
        color: var(--primary-color);
      }

      .avatar-wrapper {
        transform: scale(1.1);
        border-color: var(--primary-color);
      }

      span {
        color: var(--primary-color);
      }
    }

    &.active .avatar-wrapper {
      border-color: var(--primary-color);
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
  background: #fff;
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 400px;
  padding: 20px;
  animation: slideUp 0.3s ease;
  box-shadow: 0 -5px 20px rgba(0, 0, 0, 0.2);

  .profile-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-bottom: 20px;
    border-bottom: 1px solid #eee;
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
      color: #333;
      font-size: 18px;
      font-weight: 600;
    }
  }

  .profile-menu {
    .menu-item {
      display: flex;
      align-items: center;
      padding: 15px 0;
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
      transition: all 0.3s ease;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: #f8f9fa;
        padding-left: 10px;
      }

      svg:first-child {
        color: var(--primary-color);
        margin-right: 15px;
        font-size: 18px;
      }

      span {
        flex: 1;
        color: #333;
        font-size: 16px;
        font-weight: 500;
      }

      .arrow {
        color: #ccc;
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
    height: 75px;
    padding: 0 5px;

    .nav-item {
      padding: 6px 8px;
      min-width: 45px;

      svg {
        font-size: 18px;
      }

      .ai-icon {
        width: 18px;
        height: 18px;
      }

      .avatar-wrapper {
        width: 22px;
        height: 22px;
      }

      span {
        font-size: 10px;
      }
    }
  }
}

/* 小屏移动设备 */
@media (max-width: 480px) {
  .bottom-navbar {
    height: 70px;

    .nav-item {
      padding: 5px 6px;
      min-width: 40px;

      svg {
        font-size: 16px;
      }

      .ai-icon {
        width: 16px;
        height: 16px;
      }

      .avatar-wrapper {
        width: 20px;
        height: 20px;
      }

      span {
        font-size: 9px;
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
