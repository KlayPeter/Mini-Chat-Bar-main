<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog-content">
      <div class="dialog-header">
        <h3>加入聊天室</h3>
        <button @click="$emit('close')" class="close-btn">×</button>
      </div>
      
      <div class="dialog-body">
        <div class="form-group">
          <label>邀请码</label>
          <input 
            v-model="inviteCode" 
            type="text" 
            placeholder="请输入邀请码"
            class="form-input"
            @keyup.enter="joinRoom"
          />
          <span class="form-hint">输入聊天室的邀请码以加入</span>
        </div>
        
        <div class="form-group" v-if="needPassword">
          <label>密码</label>
          <input 
            v-model="password" 
            type="password" 
            placeholder="请输入密码"
            class="form-input"
            @keyup.enter="joinRoom"
          />
        </div>
      </div>
      
      <div class="dialog-footer">
        <button @click="$emit('close')" class="cancel-btn">取消</button>
        <button @click="joinRoom" class="submit-btn" :disabled="!inviteCode.trim()">
          加入
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { useToast } from '../composables/useToast'

const emit = defineEmits(['close', 'joined'])
const toast = useToast()
const baseUrl = import.meta.env.VITE_BASE_URL

const inviteCode = ref('')
const password = ref('')
const needPassword = ref(false)

async function joinRoom() {
  if (!inviteCode.value.trim()) {
    toast.error('请输入邀请码')
    return
  }
  
  try {
    const token = localStorage.getItem('token')
    const res = await axios.post(
      `${baseUrl}/room/join`,
      {
        inviteCode: inviteCode.value.trim(),
        password: password.value
      },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    if (res.data.success) {
      emit('joined', res.data.room)
    }
  } catch (err) {
    console.error('加入聊天室失败:', err)
    if (err.response?.status === 401) {
      needPassword.value = true
      toast.error('需要密码')
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
  max-width: 450px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e8e8e8;
  
  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
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
    
    &:hover {
      background: #f5f5f5;
      color: #333;
    }
  }
}

.dialog-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 20px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #333;
  }
  
  .form-input {
    width: 100%;
    padding: 10px 14px;
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
  
  .form-hint {
    display: block;
    margin-top: 6px;
    font-size: 12px;
    color: #999;
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
