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
        <div class="box">
          <div class="main">
            <div class="header">
              <div class="header-left">
                <h4>收藏夹</h4>
              </div>
            </div>
            <div class="middle">
              <div class="content">
                <div class="development-notice">
                  <div class="icon"><Star class="star-icon" /></div>
                  <h3>功能开发中</h3>
                  <p>收藏夹功能正在紧张开发中，敬请期待...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 移动端底部导航栏 -->
    <BottomNavbar />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import Sidebar from '../components/Sidebar.vue'
import BottomNavbar from '../components/BottomNavbar.vue'
import { Star } from '@iconoir/vue'

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
}

.box {
  width: 100%;
  height: 100%;
  padding: 0.5rem;
  padding-left: 0;
}

.main {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 1rem;
  background-color: var(--bg-tertiary, #ffffff);
  box-shadow: var(--shadow-md, 0 4px 20px rgba(0, 0, 0, 0.08));
  display: flex;
  flex-direction: column;

  .header {
    border-top-left-radius: 1rem;
    border-top-right-radius: 1rem;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    padding: 0 24px;
    background-color: var(--bg-tertiary, #ffffff);
    border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.06));
    min-height: 70px;

    .header-left {
      display: flex;
      align-items: center;

      h4 {
        margin: 0;
        font-size: 19px;
        font-weight: 600;
        color: var(--text-primary, #2c3e50);
      }
    }
  }

  .middle {
    border-radius: 1rem;
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-app-region: no-drag;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background-color: var(--bg-secondary);
  }
}

.content {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.development-notice {
  text-align: center;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  padding: 3rem 2rem;
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  width: 100%;

  .icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    animation: pulse 2s infinite;
    color: #f39c12;
    display: flex;
    align-items: center;
    justify-content: center;

    .star-icon {
      width: 64px;
      height: 64px;
      stroke-width: 1.5;
    }
  }

  h3 {
    margin: 0 0 1rem 0;
    font-size: 2rem;
    font-weight: 600;
    color: #333;
  }

  p {
    margin: 0;
    font-size: 1.1rem;
    opacity: 0.8;
    line-height: 1.6;
    color: #555;
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
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
    flex-direction: column;
    padding-bottom: 70px;
  }

  .section1 {
    display: none;
  }

  .section3-wrapper {
    flex: 1;
  }

  .box {
    padding: 0;
  }

  .main {
    border-radius: 0;
    height: calc(100vh - 70px);
  }

  .development-notice {
    padding: 2rem 1.5rem;
    margin: 1rem;

    .icon {
      font-size: 3rem;
    }

    h3 {
      font-size: 1.5rem;
    }

    p {
      font-size: 1rem;
    }
  }
}

/* 小屏移动设备 */
@media (max-width: 480px) {
  .container {
    font-size: 14px;
  }
}

/* 横屏适配 */
@media (orientation: landscape) and (max-height: 500px) {
  .container {
    height: 100vh;
  }
}
</style>