6<template>
  <div class="page-container">
    <div class="sidebar-section">
      <Sidebar
        @showchat="handleshowchat"
        @showcontacts="handleshowcontacts"
        @todetail="showAI"
      />
    </div>
    <div class="content-section">
      <ChatHall v-if="!showChatRoom" @enter-room="enterChatRoom" />
      <ChatRoom v-else :room-info="currentRoom" @back="backToHall" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Sidebar from '../components/Sidebar.vue'
import ChatHall from './ChatHall.vue'
import ChatRoom from './ChatRoom.vue'

const router = useRouter()
const showChatRoom = ref(false)
const currentRoom = ref(null)

function handleshowchat() {
  router.push('/')
}

function handleshowcontacts() {
  router.push('/')
}

function showAI() {
  router.push('/chat-ai')
}

function enterChatRoom(roomInfo) {
  currentRoom.value = roomInfo
  showChatRoom.value = true
}

function backToHall() {
  showChatRoom.value = false
  currentRoom.value = null
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

@media (max-width: 768px) {
  .sidebar-section {
    display: none;
  }

  .content-section {
    flex: 1;
  }
}
</style>