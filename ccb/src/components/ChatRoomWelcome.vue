<template>
  <div class="chatroom-welcome">
    <div class="welcome-icon-wrapper">
      <Code class="welcome-icon" :size="100" />
    </div>
    <p class="welcome-text">选择一个技术聊天室开始交流</p>
  </div>
</template>

<script setup>
import { Code } from 'lucide-vue-next'
</script>

<style scoped>
.chatroom-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: white;
}

.welcome-icon-wrapper {
  margin-bottom: 32px;
}

.welcome-icon {
  color: rgb(165, 42, 42);
  opacity: 0.5;
}

.welcome-text {
  font-size: 16px;
  color: #c0c0c0;
  margin: 0;
  font-weight: 400;
}
</style>
