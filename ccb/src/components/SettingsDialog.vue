<template>
  <div class="settings-dialog" v-if="show" @click="closeDialog">
    <div class="settings-content" @click.stop>
      <div class="header">
        <h2>设置</h2>
        <button class="close-btn" @click="closeDialog">
          <Xmark class="close-icon" />
        </button>
      </div>

      <!-- 头像修改区域 -->
      <div class="settings-section">
        <div class="section-title">
          <ProfileCircle class="section-icon" />
          <span>修改头像</span>
        </div>
        <div class="avatar-edit">
          <div class="current-avatar">
            <img :src="currentAvatar || '/images/avatar/default-avatar.webp'" alt="当前头像" />
          </div>
          <div class="avatar-actions">
            <input
              type="file"
              ref="avatarFileInput"
              accept="image/*"
              @change="handleAvatarUpload"
              style="display: none"
            />
            <button class="upload-btn" @click="triggerAvatarUpload" :disabled="isUploading">
              <Upload class="btn-icon" />
              <span>{{ isUploading ? '上传中...' : '上传头像' }}</span>
            </button>
          </div>
        </div>
        <div class="preset-avatars">
          <p class="preset-label">或选择预设头像：</p>
          <div class="preset-grid">
            <div 
              v-for="avatar in predefinedAvatars" 
              :key="avatar.name"
              class="preset-item"
              @click="selectPresetAvatar(avatar.url)"
            >
              <img :src="avatar.url" :alt="avatar.name" />
            </div>
          </div>
        </div>
      </div>

      <!-- 用户名编辑区域 -->
      <div class="settings-section">
        <div class="section-title">
          <EditPencil class="section-icon" />
          <span>修改用户名</span>
        </div>
        <div class="username-edit">
          <input
            type="text"
            v-model="newUsername"
            :placeholder="currentUsername"
            maxlength="20"
            class="username-input"
          />
          <button 
            class="save-btn" 
            @click="saveUsername"
            :disabled="!newUsername.trim() || newUsername === currentUsername || isSaving"
          >
            <Check v-if="!isSaving" class="btn-icon" />
            <span v-if="isSaving">保存中...</span>
            <span v-else>保存</span>
          </button>
        </div>
        <p class="hint">用户名长度 2-20 个字符</p>
      </div>

      <!-- 主题选择区域 -->
      <div class="settings-section">
        <div class="section-title">
          <Palette class="section-icon" />
          <span>主题配色</span>
        </div>
        <div class="themes-grid">
          <div
            v-for="theme in themes"
            :key="theme.key"
            class="theme-card"
            :class="{ active: currentTheme === theme.key }"
            @click="selectTheme(theme.key)"
          >
            <div class="theme-preview" :style="{ background: theme.preview.bg }">
              <div class="preview-circle" :style="{ background: theme.preview.primary }"></div>
              <div class="preview-circle" :style="{ background: theme.preview.primary, opacity: 0.7 }"></div>
              <div class="preview-circle" :style="{ background: theme.preview.primary, opacity: 0.4 }"></div>
            </div>
            <div class="theme-info">
              <h3>{{ theme.name }}</h3>
              <p>{{ theme.description }}</p>
            </div>
            <div v-if="currentTheme === theme.key" class="active-badge">
              <Check class="check-icon" />
            </div>
          </div>
        </div>
      </div>

      <!-- 退出登录区域 -->
      <div class="settings-section logout-section">
        <button class="logout-btn" @click="handleLogout">
          <LogOut class="btn-icon" />
          <span>退出登录</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Xmark, EditPencil, Palette, Check, ProfileCircle, Upload, LogOut } from '@iconoir/vue'
import { useThemeStore } from '../stores/useThemeStore'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'
import { socket } from '../../utils/socket'
import axios from 'axios'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  currentUsername: {
    type: String,
    default: ''
  },
  currentAvatar: {
    type: String,
    default: ''
  },
  userId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'username-updated', 'avatar-updated'])

const toast = useToast()
const { confirm } = useConfirm()
const themeStore = useThemeStore()
const themes = computed(() => themeStore.themes)
const currentTheme = computed(() => themeStore.currentTheme)

const newUsername = ref('')
const isSaving = ref(false)
const isUploading = ref(false)
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

// 当弹窗打开时，重置输入框
watch(() => props.show, (val) => {
  if (val) {
    newUsername.value = ''
  }
})

const selectTheme = (themeKey) => {
  themeStore.setTheme(themeKey)
}

const closeDialog = () => {
  emit('close')
}

// 触发头像文件选择
const triggerAvatarUpload = () => {
  avatarFileInput.value.click()
}

// 处理头像文件上传
const handleAvatarUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    toast.warning('请选择图片文件')
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    toast.warning('图片文件大小不能超过5MB')
    return
  }

  isUploading.value = true

  try {
    const token = localStorage.getItem('token')
    const formData = new FormData()
    formData.append('file', file)

    // 上传文件
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
    await axios.put(
      `${import.meta.env.VITE_BASE_URL}/api/user/avatar`,
      { avatar: avatarUrl },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    )

    // 通过Socket通知其他用户
    socket.emit('avatar-updated', {
      userId: props.userId,
      newAvatarUrl: avatarUrl,
    })

    toast.success('头像上传成功')
    emit('avatar-updated', avatarUrl)

    // 清空文件输入
    if (avatarFileInput.value) {
      avatarFileInput.value.value = ''
    }
  } catch (err) {
    console.error('头像上传失败:', err)
    toast.error('头像上传失败，请重试')
  } finally {
    isUploading.value = false
  }
}

// 选择预设头像
const selectPresetAvatar = async (avatarUrl) => {
  try {
    const token = localStorage.getItem('token')
    await axios.put(
      `${import.meta.env.VITE_BASE_URL}/api/user/avatar`,
      { avatar: avatarUrl },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    )

    // 通过Socket通知其他用户
    socket.emit('avatar-updated', {
      userId: props.userId,
      newAvatarUrl: avatarUrl,
    })

    toast.success('头像更换成功')
    emit('avatar-updated', avatarUrl)
  } catch (err) {
    console.error('头像更换失败:', err)
    toast.error('头像更换失败，请重试')
  }
}

const saveUsername = async () => {
  if (!newUsername.value.trim()) {
    toast.warning('请输入用户名')
    return
  }

  if (newUsername.value.trim().length < 2) {
    toast.warning('用户名至少需要2个字符')
    return
  }

  if (newUsername.value.trim().length > 20) {
    toast.warning('用户名不能超过20个字符')
    return
  }

  isSaving.value = true

  try {
    const token = localStorage.getItem('token')
    await axios.put(
      `${import.meta.env.VITE_BASE_URL}/api/user/username`,
      { username: newUsername.value.trim() },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    )

    toast.success('用户名修改成功')
    emit('username-updated', newUsername.value.trim())
    newUsername.value = ''
  } catch (err) {
    console.error('修改用户名失败:', err)
    const message = err.response?.data?.message || '修改用户名失败，请重试'
    toast.error(message)
  } finally {
    isSaving.value = false
  }
}

// 退出登录
const handleLogout = async () => {
  const confirmed = await confirm({
    title: '退出登录',
    message: '确定要退出登录吗？'
  })

  if (confirmed) {
    localStorage.clear()
    location.reload()
  }
}
</script>

<style scoped lang="scss">
.settings-dialog {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3000;
  backdrop-filter: blur(8px);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.settings-content {
  background: var(--bg-tertiary, white);
  border-radius: 24px;
  padding: 32px;
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;

  h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .close-btn {
    width: 36px;
    height: 36px;
    border: none;
    background: #f5f5f5;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    transition: all 0.3s ease;

    .close-icon {
      width: 18px;
      height: 18px;
      stroke-width: 1.5;
    }

    &:hover {
      background: #e0e0e0;
      transform: rotate(90deg);
    }
  }
}

.settings-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e9ecef;

  &:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #333);

  .section-icon {
    width: 20px;
    height: 20px;
    color: var(--primary-color);
    stroke-width: 1.5;
  }
}

.username-edit {
  display: flex;
  gap: 12px;
  align-items: center;
}

.username-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  font-size: 15px;
  outline: none;
  transition: all 0.3s ease;
  background: var(--bg-secondary, #f8f9fa);
  color: var(--text-primary, #333);

  &:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(var(--primary-rgb, 165, 42, 42), 0.1);
  }

  &::placeholder {
    color: #aaa;
  }
}

.save-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;

  .btn-icon {
    width: 16px;
    height: 16px;
    stroke-width: 2;
  }

  &:hover:not(:disabled) {
    background: var(--primary-dark, #8b2323);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(var(--primary-rgb, 165, 42, 42), 0.3);
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }
}

.hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: #999;
}

/* 头像编辑区域 */
.avatar-edit {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 16px;
}

.current-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid var(--primary-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.avatar-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;

  .btn-icon {
    width: 16px;
    height: 16px;
    stroke-width: 2;
  }

  &:hover:not(:disabled) {
    background: var(--primary-dark, #8b2323);
    transform: translateY(-2px);
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
}

.preset-avatars {
  margin-top: 12px;
}

.preset-label {
  margin: 0 0 10px;
  font-size: 13px;
  color: #666;
}

.preset-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.preset-item {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.3s ease;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &:hover {
    border-color: var(--primary-color);
    transform: scale(1.1);
  }
}

/* 退出登录区域 */
.logout-section {
  border-bottom: none !important;
  padding-top: 8px;
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  background: #fff;
  color: #e74c3c;
  border: 2px solid #e74c3c;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;

  .btn-icon {
    width: 18px;
    height: 18px;
    stroke-width: 2;
  }

  &:hover {
    background: #e74c3c;
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
  }
}

.themes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.theme-card {
  background: #f8f9fa;
  border-radius: 16px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 3px solid transparent;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }

  &.active {
    border-color: var(--primary-color);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }

  .theme-preview {
    height: 80px;
    border-radius: 12px;
    margin-bottom: 12px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;

    .preview-circle {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      animation: float 3s ease-in-out infinite;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

      &:nth-child(1) { animation-delay: 0s; }
      &:nth-child(2) { animation-delay: 0.5s; }
      &:nth-child(3) { animation-delay: 1s; }
    }
  }

  .theme-info {
    h3 {
      margin: 0 0 4px 0;
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }

    p {
      margin: 0;
      font-size: 12px;
      color: #888;
    }
  }

  .active-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 24px;
    height: 24px;
    background: var(--primary-color);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

    .check-icon {
      width: 14px;
      height: 14px;
      color: white;
      stroke-width: 2.5;
    }
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}

/* 滚动条样式 */
.settings-content::-webkit-scrollbar {
  width: 8px;
}

.settings-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.settings-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;

  &:hover {
    background: #a8a8a8;
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .settings-content {
    padding: 24px 16px;
    max-width: 95%;
  }

  .header h2 {
    font-size: 20px;
  }

  .username-edit {
    flex-direction: column;
  }

  .username-input {
    width: 100%;
  }

  .save-btn {
    width: 100%;
    justify-content: center;
  }

  .themes-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .theme-card {
    padding: 12px;

    .theme-preview {
      height: 60px;
    }
  }
}
</style>
