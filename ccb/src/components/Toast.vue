<template>
  <Teleport to="body">
    <Transition name="toast-fade">
      <div v-if="visible" class="toast-container" :class="toastType">
        <div class="toast-content">
          <div class="toast-icon">
            <svg v-if="type === 'success'" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M8 12l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <svg v-else-if="type === 'error'" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <svg v-else-if="type === 'warning'" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 20h20L12 2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              <path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="toast-message">{{ message }}</div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  message: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
  },
  duration: {
    type: Number,
    default: 3000
  }
})

const emit = defineEmits(['close'])

const visible = ref(false)
let timer = null

const toastType = computed(() => `toast-${props.type}`)

const show = () => {
  visible.value = true
  if (props.duration > 0) {
    timer = setTimeout(() => {
      close()
    }, props.duration)
  }
}

const close = () => {
  visible.value = false
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  emit('close')
}

// 当message变化时自动显示
watch(() => props.message, (newVal) => {
  if (newVal) {
    show()
  }
}, { immediate: true })

defineExpose({ show, close })
</script>

<style scoped lang="scss">
.toast-container {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  pointer-events: none;
  max-width: 90%;
  min-width: 300px;

  @media (max-width: 768px) {
    top: 60px;
    min-width: 280px;
  }
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  pointer-events: auto;

  @media (max-width: 768px) {
    padding: 14px 20px;
  }
}

.toast-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;

  svg {
    width: 100%;
    height: 100%;
  }
}

.toast-message {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
  color: #2c3e50;

  @media (max-width: 768px) {
    font-size: 14px;
  }
}

/* Toast类型样式 */
.toast-success {
  .toast-icon {
    color: var(--success-color, #52c41a);
  }

  .toast-content {
    border-left: 4px solid var(--success-color, #52c41a);
  }
}

.toast-error {
  .toast-icon {
    color: var(--error-color, #ff4d4f);
  }

  .toast-content {
    border-left: 4px solid var(--error-color, #ff4d4f);
  }
}

.toast-warning {
  .toast-icon {
    color: var(--warning-color, #faad14);
  }

  .toast-content {
    border-left: 4px solid var(--warning-color, #faad14);
  }
}

.toast-info {
  .toast-icon {
    color: var(--primary-color);
  }

  .toast-content {
    border-left: 4px solid var(--primary-color);
  }
}

/* 过渡动画 */
.toast-fade-enter-active {
  animation: toast-slide-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-fade-leave-active {
  animation: toast-slide-out 0.25s cubic-bezier(0.4, 0, 1, 1);
}

@keyframes toast-slide-in {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

@keyframes toast-slide-out {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px) scale(0.98);
  }
}
</style>
