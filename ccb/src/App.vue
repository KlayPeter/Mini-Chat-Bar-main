<template>
  <SocketStatusIndicator />
  <router-view />
</template>

<script setup>
import ChatView from './components/chat/ChatView.vue'
import SocketStatusIndicator from './components/layout/SocketStatusIndicator.vue'
import { useThemeStore } from './stores/useThemeStore'
import { useOnlineStatus } from './composables/useOnlineStatus'
import { onMounted, onUnmounted } from 'vue'

const themeStore = useThemeStore()
const { initOnlineStatus, fullCleanup } = useOnlineStatus()

onMounted(() => {
  themeStore.initTheme()
  // 初始化在线状态
  initOnlineStatus()
})

onUnmounted(() => {
  // 清理在线状态
  fullCleanup()
})
</script>

<style>
@import './styles/themes.scss';

/* 全局重置和基础样式 */
* {
  box-sizing: border-box;
}

/* 文本选中样式 - 使用主题色 */
::selection {
  background: rgba(255, 127, 80, 0.3);
  color: inherit;
}

::-moz-selection {
  background: rgba(255, 127, 80, 0.3);
  color: inherit;
}

html,
body,
#app {
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
  display: flex;
  background: linear-gradient(135deg, #e8e9ef 0%, #f0f1f5 100%);
  overflow: hidden;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 大屏幕设备 */
@media (min-width: 1200px) {
  html,
  body,
  #app {
    border-radius: 1rem;
  }
}

/* 平板设备 */
@media (max-width: 1199px) and (min-width: 769px) {
  html,
  body,
  #app {
    border-radius: 0.5rem;
  }
}

/* 移动设备 */
@media (max-width: 768px) {
  html,
  body,
  #app {
    border-radius: 0;
    height: 100vh;
    height: -webkit-fill-available; /* iOS Safari 兼容 */
  }

  /* 防止移动端滚动 */
  body {
    position: fixed;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
}

/* 小屏移动设备 */
@media (max-width: 480px) {
  html,
  body,
  #app {
    font-size: 14px;
  }
}

/* 横屏适配 */
@media (orientation: landscape) and (max-height: 500px) {
  html,
  body,
  #app {
    height: 100vh;
  }
}
</style>
