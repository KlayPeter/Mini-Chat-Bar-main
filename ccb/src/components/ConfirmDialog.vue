<template>
  <div v-if="isVisible" class="confirm-overlay" @click="handleCancel">
    <div class="confirm-dialog" @click.stop>
      <div class="dialog-header">
        <h3>{{ title }}</h3>
      </div>
      
      <div class="dialog-body">
        <p>{{ message }}</p>
      </div>
      
      <div class="dialog-footer">
        <button class="cancel-btn" @click="handleCancel">{{ cancelText }}</button>
        <button class="confirm-btn" @click="handleConfirm">{{ confirmText }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: '确认'
  },
  message: {
    type: String,
    required: true
  },
  confirmText: {
    type: String,
    default: '确定'
  },
  cancelText: {
    type: String,
    default: '取消'
  }
})

const emit = defineEmits(['confirm', 'cancel'])

const isVisible = ref(false)

// 显示确认弹窗
function show() {
  isVisible.value = true
}

// 隐藏确认弹窗
function hide() {
  isVisible.value = false
}

// 处理确认
function handleConfirm() {
  hide()
  emit('confirm')
}

// 处理取消
function handleCancel() {
  hide()
  emit('cancel')
}

// 暴露方法给父组件
defineExpose({
  show,
  hide
})
</script>

<style scoped lang="scss">
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.confirm-dialog {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.dialog-header {
  padding: 20px 20px 10px 20px;
  
  h3 {
    margin: 0;
    font-size: 18px;
    color: #333;
    font-weight: 600;
  }
}

.dialog-body {
  padding: 10px 20px 20px 20px;
  
  p {
    margin: 0;
    color: #666;
    font-size: 14px;
    line-height: 1.5;
  }
}

.dialog-footer {
  padding: 15px 20px 20px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  
  button {
    padding: 8px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
    min-width: 70px;
  }
  
  .cancel-btn {
    background: var(--bg-secondary, #f8f9fa);
    color: var(--text-secondary, #6c757d);
    border: 1px solid var(--border-color-light, #dee2e6);
    
    &:hover {
      background: var(--hover-bg, #e9ecef);
    }
  }
  
  .confirm-btn {
    background: var(--primary-gradient, linear-gradient(135deg, rgba(165, 42, 42, 0.9) 0%, rgba(140, 35, 35, 0.95) 100%));
    color: var(--text-inverse, white);
    
    &:hover {
      background: var(--primary-gradient, linear-gradient(135deg, rgba(140, 35, 35, 1) 0%, rgba(120, 25, 25, 1) 100%));
      transform: translateY(-1px);
      box-shadow: var(--shadow-primary, 0 2px 8px rgba(165, 42, 42, 0.3));
    }
  }
}
</style>
