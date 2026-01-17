<template>
  <div class="dialog-overlay" @click.self="close">
    <div class="dialog-content">
      <div class="dialog-header">
        <h3>创建技术聊天室</h3>
        <button @click="close" class="close-btn">
          <X :size="20" />
        </button>
      </div>

      <div class="dialog-body">
        <div class="form-group">
          <label>聊天室名称</label>
          <input 
            v-model="formData.roomName" 
            type="text" 
            placeholder="例如：Vue3 技术交流"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label>技术方向</label>
          <select v-model="formData.techDirection" class="form-select">
            <option value="">选择技术方向</option>
            <option value="前端开发">前端开发</option>
            <option value="后端开发">后端开发</option>
            <option value="移动开发">移动开发</option>
            <option value="全栈开发">全栈开发</option>
            <option value="DevOps">DevOps</option>
            <option value="数据库">数据库</option>
            <option value="AI/ML">AI/ML</option>
            <option value="其他">其他</option>
          </select>
        </div>

        <div class="form-group">
          <label>加入方式</label>
          <div class="radio-group">
            <label class="radio-item">
              <input type="radio" v-model="formData.joinType" value="public" />
              <div class="radio-content">
                <span class="radio-title">公开</span>
                <span class="radio-desc">任何人都可以直接加入</span>
              </div>
            </label>
            <label class="radio-item">
              <input type="radio" v-model="formData.joinType" value="password" />
              <div class="radio-content">
                <span class="radio-title">密码保护</span>
                <span class="radio-desc">需要输入密码才能加入</span>
              </div>
            </label>
            <label class="radio-item">
              <input type="radio" v-model="formData.joinType" value="invite" />
              <div class="radio-content">
                <span class="radio-title">邀请码</span>
                <span class="radio-desc">需要邀请码和可选密码</span>
              </div>
            </label>
          </div>
        </div>

        <div v-if="formData.joinType === 'password'" class="form-group">
          <label>设置密码</label>
          <input 
            v-model="formData.password" 
            type="password" 
            placeholder="输入密码（其他人需要此密码才能加入）"
            class="form-input"
          />
        </div>
        
        <div v-if="formData.joinType === 'invite'" class="form-group">
          <label>邀请码设置</label>
          <div class="invite-info">
            <p>创建后将自动生成唯一邀请码</p>
            <label class="checkbox-item">
              <input type="checkbox" v-model="needInvitePassword" />
              <span>同时需要密码验证</span>
            </label>
          </div>
          <input 
            v-if="needInvitePassword"
            v-model="formData.password" 
            type="password" 
            placeholder="输入密码"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label>聊天室简介（可选）</label>
          <textarea 
            v-model="formData.announcement" 
            placeholder="介绍一下这个聊天室..."
            class="form-textarea"
            rows="3"
          ></textarea>
        </div>
        
        <div class="form-group">
          <label>聊天室持续时间</label>
          <select v-model="formData.duration" class="form-select">
            <option :value="3">3小时</option>
            <option :value="6">6小时</option>
            <option :value="12">12小时</option>
            <option :value="24">1天（24小时）</option>
            <option :value="72">3天</option>
            <option :value="168">1周（7天）</option>
            <option :value="720">1个月（30天）</option>
          </select>
          <span class="form-hint">聊天室将在到期后自动解散</span>
        </div>
      </div>

      <div class="dialog-footer">
        <button @click="close" class="btn btn-secondary">取消</button>
        <button @click="createRoom" class="btn btn-primary" :disabled="!canCreate">
          创建
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { X } from 'lucide-vue-next'
import axios from 'axios'
import { useToast } from '../composables/useToast'

const emit = defineEmits(['close', 'created'])
const toast = useToast()

const formData = ref({
  roomName: '',
  techDirection: '',
  joinType: 'public',
  password: '',
  announcement: '',
  duration: 24 // 默认24小时
})

const needInvitePassword = ref(false)

const canCreate = computed(() => {
  return formData.value.roomName.trim().length > 0
})

function close() {
  emit('close')
}

async function createRoom() {
  if (!canCreate.value) return

  try {
    const token = localStorage.getItem('token')
    const baseUrl = import.meta.env.VITE_BASE_URL
    
    const res = await axios.post(
      `${baseUrl}/room/create`,
      {
        groupName: formData.value.roomName, // 后端期望 groupName
        type: 'chatroom',
        techDirection: formData.value.techDirection,
        joinType: formData.value.joinType,
        password: formData.value.password,
        announcement: formData.value.announcement
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )

    if (res.data.success) {
      toast.success('聊天室创建成功')
      emit('created', res.data.room)
      close()
    }
  } catch (err) {
    console.error('创建聊天室失败:', err)
    toast.error(err.response?.data?.message || '创建失败')
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
  backdrop-filter: blur(4px);
}

.dialog-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
  
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
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    transition: all 0.2s;
    
    &:hover {
      background: #f5f5f5;
      color: #333;
    }
  }
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
  
  label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #333;
  }
  
  .form-input,
  .form-select,
  .form-textarea {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    background: #f5f5f5;
    color: #333;
    transition: all 0.2s;
    
    &:focus {
      outline: none;
      border-color: rgb(165, 42, 42);
      box-shadow: 0 0 0 3px rgba(165, 42, 42, 0.1);
      background: white;
    }
  }
  
  .form-select {
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 36px;
    
    option {
      background: white;
      color: #333;
      padding: 10px;
      
      &:checked {
        background: rgb(165, 42, 42);
        color: white;
      }
      
      &:hover {
        background: rgba(165, 42, 42, 0.1);
      }
    }
  }
  
  .form-textarea {
    resize: vertical;
    min-height: 80px;
  }
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  
  .radio-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    background: #f5f5f5;
    
    &:hover {
      background: #e8e8e8;
      border-color: rgb(165, 42, 42);
    }
    
    input[type="radio"] {
      cursor: pointer;
      accent-color: rgb(165, 42, 42);
      margin-top: 2px;
      flex-shrink: 0;
    }
    
    .radio-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      
      .radio-title {
        font-size: 14px;
        font-weight: 500;
        color: #333;
      }
      
      .radio-desc {
        font-size: 12px;
        color: #999;
      }
    }
  }
}

.invite-info {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 12px;
  
  p {
    margin: 0 0 10px 0;
    font-size: 13px;
    color: #666;
  }
  
  .checkbox-item {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    
    input[type="checkbox"] {
      cursor: pointer;
      accent-color: rgb(165, 42, 42);
    }
    
    span {
      font-size: 13px;
      color: #333;
    }
  }
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e0e0e0;
  justify-content: flex-end;
}

.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &.btn-secondary {
    background: #f5f5f5;
    color: #333;
    
    &:hover {
      background: #e8e8e8;
    }
  }
  
  &.btn-primary {
    background: linear-gradient(135deg, rgb(165, 42, 42) 0%, rgb(140, 30, 30) 100%);
    color: white;
    box-shadow: 0 2px 8px rgba(165, 42, 42, 0.3);
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(165, 42, 42, 0.4);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
</style>
