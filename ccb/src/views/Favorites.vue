<template>
  <div class="page-container">
    <div class="sidebar-section">
      <Sidebar
        @showchat="handleshowchat"
        @showcontacts="handleshowcontacts"
        @todetail="showAI"
      />
    </div>
    <div class="content-section">
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
                <div class="icon">⭐</div>
                <h3>功能开发中</h3>
                <p>收藏夹功能正在紧张开发中，敬请期待...</p>
              </div>
            </div>
          </div>
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
.page-container {
  display: flex;
  height: 100vh;
  width: 100%;
  background: #f9f9f9;
}

.sidebar-section {
  flex: 0 0 80px;
  min-width: 80px;
  max-width: 80px;
}

.content-section {
  flex: 1;
  overflow: hidden;
}

.box {
  width: 100%;
  height: 100%;
  padding: 2%;
}

.main {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 1rem;
  background-color: rgba(128, 128, 128, 0.1);
  box-shadow: 0 0 5px 2px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;

  .header {
    border-top-left-radius: 1rem;
    border-top-right-radius: 1rem;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 1px 1px 0px rgba(0, 0, 0, 0.1);
    padding: 0 20px;
    background-color: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
    min-height: 60px;

    .header-left {
      display: flex;
      align-items: center;

      h4 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }
    }
  }

  .middle {
    border-radius: 1rem;
    flex: 1;
    overflow-y: scroll;
    overflow-x: hidden;
    -webkit-app-region: no-drag;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
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

@media (max-width: 768px) {
  .sidebar-section {
    display: none;
  }

  .content-section {
    flex: 1;
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
</style>