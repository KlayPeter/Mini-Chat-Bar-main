<template>
  <div class="container">
    <div class="section1">
      <Sidebar
        @showchat="handleshowchat"
        @showcontacts="handleshowcontacts"
        @todetail="showAI"
      />
    </div>
    <div class="section3-wrapper">
      <div class="section3">
        <div class="empty-state">
          <i class="fas fa-eye"></i>
          <p>朋友圈功能开发中...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import Sidebar from '../components/Sidebar.vue'

const router = useRouter()

function handleshowchat() {
  router.push('/')
}

function handleshowcontacts() {
  router.push('/')
}

function showAI() {
  router.push('/chat-ai')
}
</script>

<style scoped lang="scss">
.container {
  border-radius: 1rem;
  flex: 1;
  display: flex;
  box-shadow: 0 0 5px 1px rgba(0, 0, 0, 0.5);
  -webkit-app-region: drag;
  max-height: 100vh;
  background: #f9f9f9;
  transition: all 1.5s ease-in;
}

.section1,
.section3 {
  max-height: 100%;
  border-radius: 1rem;
  background-color: transparent;
}

.section1 {
  flex: 0 0 8%;
  position: relative;
  z-index: 10;
}

.section3-wrapper {
  flex: 1 1 92%;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.section3 {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary, white);
  border-radius: 1rem;
  margin: 0.5rem;
  margin-left: 0;
}

.empty-state {
  text-align: center;
  color: #999;

  i {
    font-size: 64px;
    margin-bottom: 20px;
  }

  p {
    font-size: 16px;
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

  .section1 {
    flex: 0 0 10%;
  }

  .section3-wrapper {
    flex: 1 1 90%;
  }
}

/* 响应式布局 - 移动设备 */
@media (max-width: 768px) {
  .container {
    border-radius: 0;
    margin: 0;
    height: 100vh;
  }

  .section1 {
    display: none;
  }

  .section3-wrapper {
    flex: 1;
  }

  .section3 {
    margin: 0;
    border-radius: 0;
  }
}

/* 小屏移动设备 */
@media (max-width: 480px) {
  .container {
    font-size: 14px;
  }

  .empty-state {
    i {
      font-size: 48px;
    }

    p {
      font-size: 14px;
    }
  }
}

/* 横屏适配 */
@media (orientation: landscape) and (max-height: 500px) {
  .container {
    height: 100vh;
  }
}
</style>