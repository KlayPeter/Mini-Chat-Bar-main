<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="explain-popup"
      :style="{ top: position.y + 'px', left: position.x + 'px' }"
      @click.stop
    >
      <!-- 小三角箭头 -->
      <div class="popup-arrow"></div>
      
      <!-- 头部 -->
      <div class="popup-header">
        <div class="header-title">
          <Sparks class="title-icon" />
          <span>AI 解释</span>
        </div>
        <button class="close-btn" @click="closeDialog">
          <Xmark class="close-icon" />
        </button>
      </div>

      <!-- 内容区域 -->
      <div class="popup-body">
        <!-- 选中的文本 -->
        <div class="selected-text">"{{ truncatedText }}"</div>

        <!-- AI 解释结果 -->
        <div class="explanation-area">
          <div v-if="loading" class="loading-state">
            <div class="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span class="loading-text">AI 思考中...</span>
          </div>
          <div v-else-if="explanation" class="explanation-content">
            {{ explanation }}
          </div>
          <div v-else-if="error" class="error-state">
            {{ error }}
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Sparks, Xmark } from '@iconoir/vue'
import axios from 'axios'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  selectedText: {
    type: String,
    default: ''
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
})

const emit = defineEmits(['close'])

const loading = ref(false)
const explanation = ref('')
const error = ref('')

// 截断过长的文本显示
const truncatedText = computed(() => {
  if (props.selectedText.length > 50) {
    return props.selectedText.slice(0, 50) + '...'
  }
  return props.selectedText
})

// 当弹窗打开时，自动获取解释
watch(() => props.show, (val) => {
  if (val && props.selectedText) {
    explanation.value = ''
    error.value = ''
    getExplanation()
  }
})

async function getExplanation() {
  if (!props.selectedText.trim()) return

  loading.value = true
  explanation.value = ''
  error.value = ''

  try {
    const token = localStorage.getItem('token')
    const res = await axios.post(
      `${import.meta.env.VITE_BASE_URL}/api/agent/explain`,
      { text: props.selectedText },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )

    if (res.data.success) {
      explanation.value = res.data.explanation
    } else {
      error.value = '获取解释失败'
    }
  } catch (err) {
    console.error('获取AI解释失败:', err)
    error.value = err.response?.data?.message || '网络错误，请重试'
  } finally {
    loading.value = false
  }
}

function closeDialog() {
  emit('close')
}
</script>

<style scoped lang="scss">
.explain-popup {
  position: fixed;
  z-index: 10000;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  width: 320px;
  max-height: 300px;
  display: flex;
  flex-direction: column;
  animation: popupIn 0.2s ease;
  border: 1px solid rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

@keyframes popupIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.popup-arrow {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 8px solid white;
  filter: drop-shadow(0 -2px 2px rgba(0, 0, 0, 0.05));
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;

  .header-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    color: #333;

    .title-icon {
      width: 18px;
      height: 18px;
      color: var(--primary-color, coral);
      stroke-width: 2;
    }
  }

  .close-btn {
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
    transition: all 0.2s ease;

    .close-icon {
      width: 14px;
      height: 14px;
      stroke-width: 2;
    }

    &:hover {
      background: #f0f0f0;
      color: #666;
    }
  }
}

.popup-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.selected-text {
  font-size: 12px;
  color: #666;
  font-style: italic;
  padding: 8px 10px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 2px solid var(--primary-color, coral);
  line-height: 1.4;
}

.explanation-area {
  flex: 1;
  min-height: 60px;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 0;
  justify-content: center;
}

.loading-dots {
  display: flex;
  gap: 4px;

  span {
    width: 6px;
    height: 6px;
    background: var(--primary-color, coral);
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out both;

    &:nth-child(1) { animation-delay: -0.32s; }
    &:nth-child(2) { animation-delay: -0.16s; }
    &:nth-child(3) { animation-delay: 0s; }
  }
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.loading-text {
  font-size: 13px;
  color: #999;
}

.explanation-content {
  font-size: 13px;
  color: #333;
  line-height: 1.7;
  white-space: pre-wrap;
}

.error-state {
  font-size: 13px;
  color: #e74c3c;
  text-align: center;
  padding: 16px 0;
}

/* 滚动条样式 */
.popup-body::-webkit-scrollbar {
  width: 4px;
}

.popup-body::-webkit-scrollbar-track {
  background: transparent;
}

.popup-body::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 2px;

  &:hover {
    background: #ccc;
  }
}

/* 响应式 */
@media (max-width: 480px) {
  .explain-popup {
    width: 280px;
  }
}
</style>
