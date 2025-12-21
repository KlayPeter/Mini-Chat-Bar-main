<template>
  <div class="theme-selector" v-if="show" @click="closeSelector">
    <div class="theme-selector-content" @click.stop>
      <div class="header">
        <h2>选择主题配色</h2>
        <button class="close-btn" @click="closeSelector">✕</button>
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
            <div
              class="preview-circle"
              :style="{ background: theme.preview.primary, opacity: 0.7 }"
            ></div>
            <div
              class="preview-circle"
              :style="{ background: theme.preview.primary, opacity: 0.4 }"
            ></div>
          </div>
          <div class="theme-info">
            <h3>{{ theme.name }}</h3>
            <p>{{ theme.description }}</p>
          </div>
          <div v-if="currentTheme === theme.key" class="active-badge">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M13.5 4L6 11.5L2.5 8"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <div class="footer">
        <p class="tip">✨ 选择你喜欢的主题配色，让聊天更有个性</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useThemeStore } from '../stores/useThemeStore'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const themeStore = useThemeStore()
const themes = computed(() => themeStore.themes)
const currentTheme = computed(() => themeStore.currentTheme)

const selectTheme = (themeKey) => {
  themeStore.setTheme(themeKey)
}

const closeSelector = () => {
  emit('close')
}
</script>

<style scoped lang="scss">
.theme-selector {
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
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.theme-selector-content {
  background: white;
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
    font-size: 20px;
    color: #666;
    transition: all 0.3s ease;

    &:hover {
      background: #e0e0e0;
      transform: rotate(90deg);
    }
  }
}

.themes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.theme-card {
  background: #f8f9fa;
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 3px solid transparent;
  position: relative;
  overflow: hidden;

  &::before {
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

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);

    &::before {
      opacity: 1;
    }
  }

  &.active {
    border-color: var(--primary-color);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);

    .theme-preview {
      border-color: var(--primary-color);
    }
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
    border: 2px solid transparent;
    transition: border-color 0.3s ease;

    .preview-circle {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      animation: float 3s ease-in-out infinite;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

      &:nth-child(1) {
        animation-delay: 0s;
      }

      &:nth-child(2) {
        animation-delay: 0.5s;
      }

      &:nth-child(3) {
        animation-delay: 1s;
      }
    }
  }

  .theme-info {
    h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }

    p {
      margin: 0;
      font-size: 13px;
      color: #888;
      line-height: 1.4;
    }
  }

  .active-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 28px;
    height: 28px;
    background: var(--primary-color);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    animation: scaleIn 0.3s ease;
  }
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

@keyframes scaleIn {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.footer {
  padding-top: 16px;
  border-top: 1px solid #e9ecef;

  .tip {
    margin: 0;
    text-align: center;
    font-size: 14px;
    color: #666;
  }
}

/* 滚动条样式 */
.theme-selector-content::-webkit-scrollbar {
  width: 8px;
}

.theme-selector-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.theme-selector-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;

  &:hover {
    background: #a8a8a8;
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .theme-selector-content {
    padding: 24px 16px;
    max-width: 95%;
  }

  .header h2 {
    font-size: 20px;
  }

  .themes-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .theme-card {
    padding: 12px;

    .theme-preview {
      height: 80px;
    }
  }
}
</style>
