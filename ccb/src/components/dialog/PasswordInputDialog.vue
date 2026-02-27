<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog-content">
      <div class="dialog-header">
        <div class="room-info">
          <Code :size="24" class="room-icon" />
          <div>
            <h3>{{ roomName }}</h3>
            <p class="room-desc">此聊天室需要密码才能加入</p>
          </div>
        </div>
        <button @click="$emit('close')" class="close-btn">×</button>
      </div>
      
      <div class="dialog-body">
        <div class="form-group">
          <label>输入密码</label>
          <input 
            v-model="password" 
            type="password" 
            placeholder="请输入聊天室密码"
            class="form-input"
            @keyup.enter="joinRoom"
            autofocus
          />
        </div>
      </div>
      
      <div class="dialog-footer">
        <button @click="$emit('close')" class="cancel-btn">取消</button>
        <button @click="joinRoom" class="submit-btn" :disabled="!password.trim()">
          加入聊天室
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Code } from 'lucide-vue-next'
import axios from 'axios'
import { useToast } from '../../composables/useToast'

const props = defineProps({
  roomId: String,
  roomName: String
})

const emit = defineEmits(['close', 'joined'])
const toast = useToast()
const baseUrl = import.meta.env.VITE_BASE_URL

const password = ref('')

async function joinRoom() {
  if (!password.value.trim()) {
    toast.error('请输入密码')
    return
  }
  
  try {
    const token = localStorage.getItem('token')
    const res = await axios.post(
      `${baseUrl}/room/join-by-password`,
      {
        roomId: props.roomId,
        password: password.value
      },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    if (res.data.success) {
      toast.success('成功加入聊天室')
      emit('joined', res.data.room)
    }
  } catch (err) {
    console.error('加入聊天室失败:', err)
    if (err.response?.status === 401) {
      toast.error('密码错误')
      password.value = ''
    } else {
      toast.error(err.response?.data?.message || '加入聊天室失败')
    }
  }
}
</script>

<style scoped lang="scss">
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.dialog-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 420px;
  overflow: hidden;
  animation: slideUp 0.3s;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e8e8e8;
  
  .room-info {
    display: flex;
    gap: 12px;
    flex: 1;
    
    .room-icon {
      width: 40px;
      height: 40px;
      padding: 8px;
      border-radius: 8px;
      background: linear-gradient(135deg, rgb(165, 42, 42) 0%, rgb(140, 30, 30) 100%);
      color: white;
      flex-shrink: 0;
    }
    
    h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
    
    .room-desc {
      margin: 0;
      font-size: 13px;
      color: #999;
    }
  }
  
  .close-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    font-size: 24px;
    color: #999;
    cursor: pointer;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
    
    &:hover {
      background: #f5f5f5;
      color: #333;
    }
  }
}

.dialog-body {
  padding: 24px;
}

.form-group {
  label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #333;
  }
  
  .form-input {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    font-size: 14px;
    transition: all 0.2s;
    box-sizing: border-box;
    
    &:focus {
      outline: none;
      border-color: rgb(165, 42, 42);
      box-shadow: 0 0 0 3px rgba(165, 42, 42, 0.1);
    }
    
    &::placeholder {
      color: #bbb;
    }
  }
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e8e8e8;
  
  button {
    flex: 1;
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    
    &.cancel-btn {
      background: #f5f5f5;
      color: #666;
      
      &:hover {
        background: #e8e8e8;
      }
    }
    
    &.submit-btn {
      background: linear-gradient(135deg, rgb(165, 42, 42) 0%, rgb(140, 30, 30) 100%);
      color: white;
      
      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(165, 42, 42, 0.3);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
}
</style>
