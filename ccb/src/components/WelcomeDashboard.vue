<template>
  <div class="welcome-dashboard">
    <div class="background-pattern">
      <div class="circle c1"></div>
      <div class="circle c2"></div>
      <div class="circle c3"></div>
    </div>
    <div class="content">
      <div class="welcome-text">Welcome Back, {{ username || 'User' }}</div>
      <div class="subtitle">开始越快的聊天吧</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const username = ref('')

onMounted(async () => {
  try {
    const token = localStorage.getItem('token')
    if (token) {
      // Decode token to get basic info if request fails or to be faster
      const payload = JSON.parse(atob(token.split('.')[1]))
      // username.value = payload.name; // If name is in token

      const res = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/api/user/info`,
        {
          headers: {
            authorization: `Bearer ${token}`,
          },
        }
      )
      username.value = res.data.name
    }
  } catch (err) {
    console.error('Failed to get user info', err)
  }
})
</script>

<style scoped>
.welcome-dashboard {
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #ffffff;
  border-radius: 24px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.background-pattern {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.circle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.03);
}

.c1 {
  width: 400px;
  height: 400px;
}
.c2 {
  width: 600px;
  height: 600px;
}
.c3 {
  width: 800px;
  height: 800px;
}

.content {
  position: relative;
  z-index: 1;
  text-align: center;
  animation: fadeIn 0.8s ease-out;
}

.welcome-text {
  font-size: 36px;
  font-weight: 300;
  color: #95a5a6;
  margin-bottom: 16px;
  letter-spacing: 0.5px;
}

.subtitle {
  font-size: 16px;
  color: #bdc3c7;
  font-weight: 300;
  letter-spacing: 0.5px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .welcome-text {
    font-size: 28px;
  }

  .subtitle {
    font-size: 14px;
  }

  .c1 {
    width: 300px;
    height: 300px;
  }
  .c2 {
    width: 450px;
    height: 450px;
  }
  .c3 {
    width: 600px;
    height: 600px;
  }
}

@media (max-width: 480px) {
  .welcome-text {
    font-size: 24px;
  }

  .subtitle {
    font-size: 12px;
  }

  .c1 {
    width: 200px;
    height: 200px;
  }
  .c2 {
    width: 300px;
    height: 300px;
  }
  .c3 {
    width: 400px;
    height: 400px;
  }
}
</style>
