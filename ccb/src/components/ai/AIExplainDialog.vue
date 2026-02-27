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
      <div class="popup-body" ref="bodyRef">
        <!-- 选中的文本 -->
        <div class="selected-text">"{{ truncatedText }}"</div>

        <!-- 对话历史 -->
        <div class="chat-history">
          <div v-for="(msg, index) in chatHistory" :key="index" :class="['chat-message', msg.role]">
            <div class="message-content">{{ msg.content }}</div>
          </div>
          
          <!-- 加载状态 -->
          <div v-if="loading" class="chat-message assistant">
            <div class="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>

        <!-- 错误提示 -->
        <div v-if="error" class="error-state">{{ error }}</div>
      </div>

      <!-- 追问输入框 -->
      <div class="popup-footer">
        <input
          ref="inputRef"
          v-model="followUpText"
          type="text"
          placeholder="继续追问..."
          @keyup.enter="sendFollowUp"
          :disabled="loading"
        />
        <button class="send-btn" @click="sendFollowUp" :disabled="loading || !followUpText.trim()">
          <SendDiagonal class="send-icon" />
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { Sparks, Xmark, SendDiagonal } from '@iconoir/vue'
import axios from 'axios'

const props = defineProps({
  show: { type: Boolean, default: false },
  selectedText: { type: String, default: '' },
  position: { type: Object, default: () => ({ x: 0, y: 0 }) }
})

const emit = defineEmits(['close'])

const loading = ref(false)
const error = ref('')
const followUpText = ref('')
const chatHistory = ref([])
const bodyRef = ref(null)
const inputRef = ref(null)

const truncatedText = computed(() => {
  return props.selectedText.length > 50 ? props.selectedText.slice(0, 50) + '...' : props.selectedText
})

watch(() => props.show, (val) => {
  if (val && props.selectedText) {
    chatHistory.value = []
    error.value = ''
    followUpText.value = ''
    getExplanation()
  }
})

async function getExplanation() {
  if (!props.selectedText.trim()) return
  loading.value = true
  error.value = ''

  try {
    const token = localStorage.getItem('token')
    const res = await axios.post(
      `${import.meta.env.VITE_BASE_URL}/api/agent/explain`,
      { text: props.selectedText },
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (res.data.success) {
      chatHistory.value.push({ role: 'assistant', content: res.data.explanation })
      scrollToBottom()
    } else {
      error.value = '获取解释失败'
    }
  } catch (err) {
    error.value = err.response?.data?.message || '网络错误，请重试'
  } finally {
    loading.value = false
  }
}

async function sendFollowUp() {
  if (!followUpText.value.trim() || loading.value) return
  
  const question = followUpText.value.trim()
  chatHistory.value.push({ role: 'user', content: question })
  followUpText.value = ''
  loading.value = true
  error.value = ''
  scrollToBottom()

  try {
    const token = localStorage.getItem('token')
    // 构建上下文：原文 + 对话历史
    const context = `原文：${props.selectedText}\n\n对话历史：\n${chatHistory.value.map(m => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`).join('\n')}`
    
    const res = await axios.post(
      `${import.meta.env.VITE_BASE_URL}/api/agent/explain`,
      { text: context, isFollowUp: true },
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (res.data.success) {
      chatHistory.value.push({ role: 'assistant', content: res.data.explanation })
      scrollToBottom()
    } else {
      error.value = '获取回答失败'
    }
  } catch (err) {
    error.value = err.response?.data?.message || '网络错误，请重试'
  } finally {
    loading.value = false
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (bodyRef.value) {
      bodyRef.value.scrollTop = bodyRef.value.scrollHeight
    }
  })
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
  width: 340px;
  max-height: 400px;
  display: flex;
  flex-direction: column;
  animation: popupIn 0.2s ease;
  border: 1px solid rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

@keyframes popupIn {
  from { opacity: 0; transform: translateY(-10px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.popup-arrow {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 8px solid white;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
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

    &:hover { background: #f0f0f0; color: #666; }

    .close-icon { width: 14px; height: 14px; }
  }
}

.popup-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
}

.selected-text {
  font-size: 12px;
  color: #666;
  font-style: italic;
  padding: 6px 8px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 2px solid var(--primary-color, coral);
  line-height: 1.4;
}

.chat-history {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-message {
  &.assistant .message-content {
    background: #f5f5f5;
    color: #333;
    border-radius: 8px 8px 8px 2px;
    padding: 8px 10px;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  &.user .message-content {
    background: var(--primary-color, coral);
    color: white;
    border-radius: 8px 8px 2px 8px;
    padding: 8px 10px;
    font-size: 13px;
    line-height: 1.5;
    margin-left: auto;
    max-width: 85%;
  }

  .loading-dots {
    display: flex;
    gap: 4px;
    padding: 8px 10px;
    background: #f5f5f5;
    border-radius: 8px;
    width: fit-content;

    span {
      width: 6px;
      height: 6px;
      background: var(--primary-color, coral);
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out both;
      &:nth-child(1) { animation-delay: -0.32s; }
      &:nth-child(2) { animation-delay: -0.16s; }
    }
  }
}

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.error-state {
  font-size: 12px;
  color: #e74c3c;
  text-align: center;
  padding: 8px;
}

.popup-footer {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;

  input {
    flex: 1;
    border: 1px solid #e0e0e0;
    border-radius: 18px;
    padding: 6px 12px;
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s;

    &:focus { border-color: var(--primary-color, coral); }
    &:disabled { background: #f5f5f5; }
  }

  .send-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: var(--primary-color, coral);
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    transition: opacity 0.2s;

    &:disabled { opacity: 0.5; cursor: not-allowed; }
    &:not(:disabled):hover { opacity: 0.9; }

    .send-icon { width: 16px; height: 16px; }
  }
}

.popup-body::-webkit-scrollbar { width: 4px; }
.popup-body::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }
</style>
