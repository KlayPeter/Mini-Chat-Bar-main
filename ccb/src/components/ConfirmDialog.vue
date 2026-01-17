<template>
  <div class="dialog-overlay" @click.self="$emit('cancel')">
    <div class="dialog-container">
      <div class="dialog-header">
        <h3>{{ title }}</h3>
      </div>
      
      <div class="dialog-body">
        <p>{{ message }}</p>
      </div>
      
      <div class="dialog-footer">
        <button @click="$emit('cancel')" class="cancel-btn">取消</button>
        <button @click="$emit('confirm')" class="confirm-btn" :class="{ danger: isDanger }">
          确定
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: '确认'
  },
  message: {
    type: String,
    required: true
  },
  isDanger: {
    type: Boolean,
    default: false
  }
})

defineEmits(['confirm', 'cancel'])
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

.dialog-container {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dialog-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  
  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }
}

.dialog-body {
  padding: 24px;
  
  p {
    margin: 0;
    font-size: 15px;
    color: #666;
    line-height: 1.6;
  }
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
  
  button {
    flex: 1;
    padding: 10px 24px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .cancel-btn {
    background: #f5f5f5;
    color: #666;
    
    &:hover {
      background: #e8e8e8;
    }
  }
  
  .confirm-btn {
    background: linear-gradient(135deg, rgb(185, 62, 62) 0%, rgb(165, 42, 42) 100%);
    color: white;
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(165, 42, 42, 0.4);
    }
    
    &.danger {
      background: linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%);
      
      &:hover {
        box-shadow: 0 4px 12px rgba(255, 77, 79, 0.4);
      }
    }
  }
}
</style>
