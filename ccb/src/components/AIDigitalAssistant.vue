<template>
  <div class="ai-digital-assistant" :class="{ 'is-speaking': isSpeaking }">
    <!-- AI 数字人头像 -->
    <div 
      class="ai-avatar-container"
      @click="handleClick"
      :class="{ 'breathing': !isSpeaking, 'speaking': isSpeaking }"
    >
      <div class="avatar-glow"></div>
      <div class="avatar-circle">
        <div class="avatar-face">
          <div class="eyes">
            <div class="eye left" :class="{ 'blinking': isBlinking }"></div>
            <div class="eye right" :class="{ 'blinking': isBlinking }"></div>
          </div>
          <div class="mouth" :class="{ 'talking': isSpeaking }"></div>
        </div>
        <Sparkles class="ai-icon" :size="24" />
      </div>
      
      <!-- 状态指示器 -->
      <div v-if="hasNotification" class="notification-dot"></div>
    </div>
    
    <!-- 语音气泡 -->
    <transition name="bubble">
      <div v-if="currentMessage" class="speech-bubble">
        <div class="bubble-content">
          <p class="message-text">{{ displayedText }}</p>
          <div v-if="currentMessage.actions" class="bubble-actions">
            <button 
              v-for="action in currentMessage.actions" 
              :key="action.type"
              class="action-btn"
              @click.stop="handleAction(action)"
            >
              {{ action.label }}
            </button>
          </div>
        </div>
        <div class="bubble-tail"></div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Sparkles } from 'lucide-vue-next'

const props = defineProps({
  mode: {
    type: String,
    default: 'chatroom', // 'chatroom' | 'chat' | 'group'
    validator: (value) => ['chatroom', 'chat', 'group'].includes(value)
  },
  insights: {
    type: Object,
    default: () => ({ suggestions: [] })
  },
  aiSpeech: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['click', 'action', 'refresh'])

const currentMessage = ref(null)
const displayedText = ref('')
const isSpeaking = ref(false)
const isBlinking = ref(false)
const hasNotification = ref(false)
const messageQueue = ref([]) // 消息队列
const isProcessingQueue = ref(false) // 是否正在处理队列

let typingInterval = null
let blinkInterval = null
let messageTimeout = null
let idleTimer = null // 空闲计时器

// 添加消息到队列
const addToQueue = (message) => {
  console.log('🎤 AI 准备说话:', message.text)
  if (message.immediate) {
    // 立即显示，清空队列，打断当前消息
    console.log('⚡ 立即模式：清空队列并打断当前消息')
    messageQueue.value = []
    isProcessingQueue.value = false
    
    // 清除当前的超时
    if (messageTimeout) {
      clearTimeout(messageTimeout)
    }
    
    showMessage(message)
  } else {
    messageQueue.value.push(message)
    processQueue()
  }
}

// 处理消息队列
const processQueue = () => {
  if (isProcessingQueue.value || messageQueue.value.length === 0) return
  
  isProcessingQueue.value = true
  const message = messageQueue.value.shift()
  showMessage(message)
}

// 随机闲聊消息（当长时间没有交互时）
const getIdleMessage = () => {
  const messages = [
    '有什么技术问题可以问我哦',
    '我一直在这里待命',
    '需要帮助随时叫我',
    '看起来大家讨论得很热烈',
    '有代码问题可以 @我'
  ]
  return messages[Math.floor(Math.random() * messages.length)]
}

// 启动空闲计时器
const startIdleTimer = () => {
  if (idleTimer) clearTimeout(idleTimer)
  
  // 60 秒后说一句闲聊
  idleTimer = setTimeout(() => {
    if (props.mode === 'chatroom' && !currentMessage.value) {
      addToQueue({
        text: getIdleMessage(),
        duration: 4000
      })
    }
    startIdleTimer() // 继续下一轮
  }, 60000)
}

// 根据模式和智能提示生成消息
const generateMessage = () => {
  if (props.mode === 'chatroom') {
    // 聊天室模式：使用后端返回的 AI 播报文本
    if (props.aiSpeech) {
      return {
        text: props.aiSpeech,
        duration: 6000
      }
    }
    
    // 如果没有 aiSpeech，使用默认逻辑
    const suggestions = props.insights.suggestions || []
    
    if (suggestions.length === 0) {
      return {
        text: '嗨！我是你的技术助手，有问题随时 @我',
        duration: 4000
      }
    }
    
    // 优先显示紧急问题
    const urgent = suggestions.find(s => s.type === 'urgent')
    if (urgent) {
      return {
        text: urgent.text + '，需要我帮忙吗？',
        duration: 5000,
        actions: [
          { type: 'view_questions', label: '查看问题' },
          { type: 'ai_help', label: 'AI 帮忙' }
        ]
      }
    }
    
    // AI 可帮助的问题
    const aiHelp = suggestions.find(s => s.type === 'ai_help')
    if (aiHelp) {
      return {
        text: aiHelp.text,
        duration: 5000,
        actions: [
          { type: 'ai_answer', label: '让 AI 回答' }
        ]
      }
    }
    
    // 未解决问题统计
    const openQuestions = suggestions.find(s => s.type === 'open_questions')
    if (openQuestions) {
      return {
        text: openQuestions.text,
        duration: 4000,
        actions: [
          { type: 'show_all', label: '查看全部' }
        ]
      }
    }
    
    return {
      text: '一切正常！有问题随时找我',
      duration: 3000
    }
  } else {
    // 群聊/私聊模式：提示点击展开
    return {
      text: '点击我展开 AI 对话框',
      duration: 3000
    }
  }
}

// 打字机效果显示文本
const typeText = (text) => {
  console.log('⌨️ typeText 被调用:', text)
  displayedText.value = ''
  let index = 0
  
  if (typingInterval) clearInterval(typingInterval)
  
  typingInterval = setInterval(() => {
    if (index < text.length) {
      displayedText.value += text[index]
      index++
    } else {
      console.log('✅ 打字完成')
      clearInterval(typingInterval)
      isSpeaking.value = false
    }
  }, 50)
}

// 显示消息
const showMessage = (message) => {
  console.log('💬 showMessage 被调用:', message)
  if (!message) {
    console.log('⚠️ message 为空，返回')
    return
  }
  
  console.log('✅ 开始显示消息，设置状态...')
  
  // 重置空闲计时器
  startIdleTimer()
  
  currentMessage.value = message
  isSpeaking.value = true
  hasNotification.value = true
  
  console.log('📝 currentMessage.value:', currentMessage.value)
  console.log('🗣️ isSpeaking.value:', isSpeaking.value)
  
  typeText(message.text)
  
  // 根据文字长度自动计算显示时间（每个字 150ms，最少 3 秒，最多 8 秒）
  const textLength = message.text.length
  const calculatedDuration = Math.max(3000, Math.min(8000, textLength * 150))
  const finalDuration = message.duration || calculatedDuration
  
  console.log(`⏱️ 消息将显示 ${finalDuration}ms (文字长度: ${textLength})`)
  
  // 自动隐藏
  if (messageTimeout) clearTimeout(messageTimeout)
  messageTimeout = setTimeout(() => {
    console.log('⏰ 消息超时，隐藏气泡')
    currentMessage.value = null
    displayedText.value = ''
    hasNotification.value = false
    isProcessingQueue.value = false
    
    // 继续处理队列
    processQueue()
  }, finalDuration)
}

// 处理点击
const handleClick = () => {
  if (props.mode === 'chatroom') {
    // 聊天室模式：刷新智能提示
    emit('refresh')
    // 不在这里显示消息，由父组件调用 speakRefreshing()
  } else {
    // 其他模式：触发点击事件（打开对话框）
    emit('click')
    
    // 显示提示
    addToQueue({
      text: '对话框已打开，开始聊天吧！',
      duration: 2000
    })
  }
}

// 处理操作按钮
const handleAction = (action) => {
  emit('action', action)
  currentMessage.value = null
}

// 眨眼动画
const startBlinking = () => {
  blinkInterval = setInterval(() => {
    isBlinking.value = true
    setTimeout(() => {
      isBlinking.value = false
    }, 200)
  }, 3000 + Math.random() * 2000) // 3-5秒随机眨眼
}

// 监听智能提示变化 - 立即播报，不延迟
watch(() => props.insights, (newInsights, oldInsights) => {
  if (props.mode === 'chatroom' && newInsights.suggestions?.length > 0) {
    // 检查是否真的有变化
    const hasChanged = JSON.stringify(newInsights) !== JSON.stringify(oldInsights)
    if (hasChanged) {
      const message = generateMessage()
      addToQueue(message)
    }
  }
}, { deep: true, immediate: false })

// 监听 aiSpeech 变化 - 立即播报
watch(() => props.aiSpeech, (newSpeech, oldSpeech) => {
  if (props.mode === 'chatroom' && newSpeech && newSpeech !== oldSpeech) {
    addToQueue({
      text: newSpeech,
      duration: 6000
    })
  }
}, { immediate: false })

// 监听模式变化 - 切换到聊天室时说欢迎语
watch(() => props.mode, (newMode, oldMode) => {
  if (newMode === 'chatroom' && oldMode !== 'chatroom') {
    addToQueue({
      text: '欢迎来到技术聊天室！',
      duration: 3000
    })
  }
}, { immediate: false })

onMounted(() => {
  startBlinking()
  startIdleTimer() // 启动空闲计时器
  
  // 聊天室模式：立即显示消息（不延迟）
  if (props.mode === 'chatroom') {
    if (props.aiSpeech) {
      addToQueue({
        text: props.aiSpeech,
        duration: 6000
      })
    } else if (props.insights.suggestions?.length > 0) {
      const message = generateMessage()
      addToQueue(message)
    } else {
      // 默认欢迎语
      addToQueue({
        text: '嗨！我是你的技术助手，有问题随时 @我',
        duration: 4000
      })
    }
  } else {
    // 其他模式：延迟显示欢迎消息
    setTimeout(() => {
      const message = generateMessage()
      addToQueue(message)
    }, 1000)
  }
})

onUnmounted(() => {
  if (typingInterval) clearInterval(typingInterval)
  if (blinkInterval) clearInterval(blinkInterval)
  if (messageTimeout) clearTimeout(messageTimeout)
  if (idleTimer) clearTimeout(idleTimer)
})

// 暴露方法供父组件调用
defineExpose({
  speak: (text, duration = 5000, actions = null, immediate = false) => {
    console.log('🎤 speak 被调用:', text, '立即模式:', immediate)
    addToQueue({ text, duration, actions, immediate })
  },
  speakRefreshing: () => {
    console.log('🔄 speakRefreshing 被调用')
    addToQueue({ 
      text: '正在刷新智能提示...', 
      duration: 2000,
      immediate: true
    })
  },
  speakRefreshComplete: (speech) => {
    console.log('✅ speakRefreshComplete 被调用:', speech)
    addToQueue({ 
      text: speech || '刷新完成！', 
      duration: 6000 
    })
  }
})
</script>

<style scoped lang="scss">
.ai-digital-assistant {
  position: relative;
  z-index: 100;
}

.ai-avatar-container {
  position: relative;
  width: 60px;
  height: 60px;
  cursor: pointer;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
}

.avatar-glow {
  position: absolute;
  inset: -4px;
  background: linear-gradient(135deg, rgb(165, 42, 42) 0%, rgb(140, 30, 30) 100%);
  border-radius: 50%;
  opacity: 0.3;
  filter: blur(8px);
  animation: glow-pulse 2s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

.avatar-circle {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgb(165, 42, 42) 0%, rgb(140, 30, 30) 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(165, 42, 42, 0.4);
  overflow: hidden;
  
  &.breathing {
    animation: breathing 3s ease-in-out infinite;
  }
  
  &.speaking {
    animation: speaking 0.5s ease-in-out infinite;
  }
}

@keyframes breathing {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes speaking {
  0%, 100% {
    transform: scale(1);
  }
  25% {
    transform: scale(1.08);
  }
  75% {
    transform: scale(1.03);
  }
}

.avatar-face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.eyes {
  display: flex;
  gap: 12px;
}

.eye {
  width: 6px;
  height: 6px;
  background: white;
  border-radius: 50%;
  transition: height 0.1s ease;
  
  &.blinking {
    height: 2px;
  }
}

.mouth {
  width: 16px;
  height: 8px;
  border: 2px solid white;
  border-top: none;
  border-radius: 0 0 16px 16px;
  transition: all 0.2s ease;
  
  &.talking {
    animation: mouth-talk 0.3s ease-in-out infinite;
  }
}

@keyframes mouth-talk {
  0%, 100% {
    height: 8px;
  }
  50% {
    height: 12px;
  }
}

.ai-icon {
  color: white;
  position: relative;
  z-index: 1;
  animation: icon-float 3s ease-in-out infinite;
}

@keyframes icon-float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

.notification-dot {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  background: #ef4444;
  border: 2px solid white;
  border-radius: 50%;
  animation: dot-pulse 2s ease-in-out infinite;
}

@keyframes dot-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

.speech-bubble {
  position: absolute;
  left: 70px;
  top: 0;
  min-width: 200px;
  max-width: 300px;
  background: white;
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 2px solid rgb(165, 42, 42);
  z-index: 10;
}

.bubble-tail {
  position: absolute;
  left: -8px;
  top: 20px;
  width: 0;
  height: 0;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-right: 8px solid rgb(165, 42, 42);
  
  &::after {
    content: '';
    position: absolute;
    left: 2px;
    top: -7px;
    width: 0;
    height: 0;
    border-top: 7px solid transparent;
    border-bottom: 7px solid transparent;
    border-right: 7px solid white;
  }
}

.bubble-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #333;
  font-weight: 500;
}

.bubble-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 4px 10px;
  background: linear-gradient(135deg, rgb(165, 42, 42) 0%, rgb(140, 30, 30) 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(165, 42, 42, 0.3);
  }
}

.bubble-enter-active,
.bubble-leave-active {
  transition: all 0.3s ease;
}

.bubble-enter-from {
  opacity: 0;
  transform: translateX(-10px) scale(0.9);
}

.bubble-leave-to {
  opacity: 0;
  transform: translateX(10px) scale(0.9);
}
</style>
