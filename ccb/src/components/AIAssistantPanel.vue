<template>
  <div class="ai-panel" :class="{ visible: visible }">
    <div class="panel-header">
      <div class="header-left">
        <h4>AI智能助手</h4>
        <div class="role-selector">
          <button @click.stop="toggleRoleMenu" class="role-btn">
            {{ getCurrentRoleName() }}
            <span class="arrow">▼</span>
          </button>
          <div v-if="showRoleMenu" class="role-dropdown" @click.stop>
            <div 
              v-for="role in roles" 
              :key="role.key" 
              class="role-item"
              :class="{ active: selectedRole === role.key }"
              @click="selectRole(role.key)"
            >
              <span class="role-name">{{ role.name }}</span>
              </div>
            </div>
          </div>
          <!-- RAG 模式开关 -->
          <div class="rag-toggle" :class="{ active: useRAG }" @click.stop="toggleRAGMode" :title="useRAG ? '点击关闭聊天记录检索' : '点击开启聊天记录检索'">
            <div class="toggle-switch" :class="{ active: useRAG }">
              <div class="toggle-slider"></div>
            </div>
            <span class="rag-label">{{ ragLabel }}</span>
          </div>
          <!-- 时间范围选择 -->
          <div v-if="useRAG" class="time-range-selector">
            <button @click.stop="toggleTimeMenu" class="time-btn">
              {{ getTimeRangeName() }}
              <span class="arrow">▼</span>
            </button>
            <div v-if="showTimeMenu" class="time-dropdown" @click.stop>
              <div 
                v-for="item in timeRangeOptions" 
                :key="item.key" 
                class="time-item"
                :class="{ active: timeRange === item.key }"
                @click="selectTimeRange(item.key)"
              >
                {{ item.name }}
              </div>
            </div>
          </div>
        </div>
        <div class="header-right">
          <button @click="clearHistory" class="icon-btn" title="清空历史">
            <Trash class="icon" />
          </button>
          <button class="icon-btn" @click="close" title="关闭">
            <Xmark class="icon" />
          </button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div class="panel-messages" ref="messagesRef">
        <div v-for="(msg, index) in messages" :key="index" class="message" :class="{ 'is-user': msg.from === 'user' }">
          <div class="message-avatar">
            <img :src="msg.from === 'user' ? userAvatar : '/images/ds.jpg'" alt="" />
          </div>
          <div class="message-content">
            <div class="message-text" v-html="formatMessage(msg.content)"></div>
            <div v-if="msg.sources && msg.sources.length > 0" class="message-sources">
              <span class="sources-label">来源:</span>
              <span v-for="(s, i) in msg.sources.slice(0, 3)" :key="i" class="source-tag">
                {{ s.sender }}
              </span>
            </div>
          </div>
        </div>
        <div v-if="isLoading" class="message">
          <div class="message-avatar">
            <img src="/images/ds.jpg" alt="" />
          </div>
          <div class="message-content">
            <div class="message-text loading">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 来源面板 -->
      <div v-if="currentSources.length > 0" class="sources-panel">
        <div class="sources-header">
          <span>回答来源 ({{ currentSources.length }})</span>
          <button @click="currentSources = []" class="close-sources">
            <Xmark style="width: 14px; height: 14px;" />
          </button>
        </div>
        <div class="sources-list">
          <div v-for="(source, index) in currentSources" :key="index" class="source-item">
            <div class="source-sender">{{ source.sender }}</div>
            <div class="source-content">{{ source.content }}</div>
            <div class="source-meta">
              <span class="relevance">相关度: {{ Math.round(source.relevance * 100) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="panel-input">
        <textarea 
          v-model="inputText" 
          :placeholder="getPlaceholder()"
          :disabled="isLoading"
          @keydown.enter.exact.prevent="send"
          rows="3"
        ></textarea>
        <button class="send-btn" @click="send" :disabled="isLoading || !inputText.trim()">
          发送
        </button>
      </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { Xmark, Trash } from '@iconoir/vue'
import axios from 'axios'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'

const props = defineProps({
  visible: { type: Boolean, default: false },
  chatContext: { type: Object, default: null } // { chatType, roomId, roomName, targetId, targetName }
})

const emit = defineEmits(['close'])

const toast = useToast()
const { confirm } = useConfirm()

// 状态
const messages = ref([])
const inputText = ref('')
const isLoading = ref(false)
const selectedRole = ref('default')
const showRoleMenu = ref(false)
const showTimeMenu = ref(false)
const userAvatar = ref('')
const messagesRef = ref(null)
const useRAG = ref(false) // 默认关闭，有上下文时自动开启
const currentSources = ref([])
const sessionId = ref(`session-${Date.now()}`)
const timeRange = ref('recent') // 时间范围：recent, day, week, month, all

// 角色列表
const roles = [
  { key: 'default', name: 'AI助手' },
  { key: 'assistant', name: '专业助手' },
  { key: 'teacher', name: '耐心老师' },
  { key: 'programmer', name: '程序员' }
]

// 时间范围选项
const timeRangeOptions = [
  { key: 'recent', name: '最近50条' },
  { key: 'day', name: '今天' },
  { key: 'week', name: '最近7天' },
  { key: 'month', name: '最近30天' },
  { key: 'all', name: '全部记录' }
]

// RAG 标签 - 根据上下文显示
const ragLabel = computed(() => {
  if (!useRAG.value) return '聊天记录检索'
  if (props.chatContext?.roomName) {
    return `「${props.chatContext.roomName}」`
  }
  if (props.chatContext?.targetName) {
    return `「${props.chatContext.targetName}」`
  }
  return '全局检索'
})

// 监听显示状态
watch(() => props.visible, async (val) => {
  if (val) {
    await getUserAvatar()
    // 有上下文时默认开启 RAG，没有上下文时默认关闭
    useRAG.value = !!props.chatContext
    
    if (messages.value.length === 0) {
      messages.value = [{
        from: 'AI',
        content: getWelcomeMessage(),
        time: new Date().toISOString()
      }]
    }
    nextTick(() => scrollToBottom())
  }
})

// 监听聊天上下文变化 - 切换聊天时更新状态
watch(() => props.chatContext, (val, oldVal) => {
  if (props.visible) {
    const contextChanged = !oldVal || 
      val?.roomId !== oldVal?.roomId || 
      val?.targetId !== oldVal?.targetId
    
    if (contextChanged) {
      // 切换聊天时，更新 RAG 状态
      useRAG.value = !!val
      
      // 只有一条欢迎消息时才更新
      if (messages.value.length <= 1) {
        messages.value = [{
          from: 'AI',
          content: getWelcomeMessage(),
          time: new Date().toISOString()
        }]
      }
    }
  }
}, { immediate: true, deep: true })

function close() {
  emit('close')
  showRoleMenu.value = false
  showTimeMenu.value = false
}

function toggleRoleMenu() {
  showRoleMenu.value = !showRoleMenu.value
  showTimeMenu.value = false
}

function toggleTimeMenu() {
  showTimeMenu.value = !showTimeMenu.value
  showRoleMenu.value = false
}

function getTimeRangeName() {
  const item = timeRangeOptions.find(t => t.key === timeRange.value)
  return item ? item.name : '最近50条'
}

function selectTimeRange(key) {
  timeRange.value = key
  showTimeMenu.value = false
}

function getCurrentRoleName() {
  const role = roles.find(r => r.key === selectedRole.value)
  return role ? role.name : 'AI助手'
}

async function selectRole(key) {
  if (key === selectedRole.value) {
    showRoleMenu.value = false
    return
  }
  const confirmed = await confirm({
    title: '切换角色',
    message: '切换角色将清空当前对话，确定吗？'
  })
  if (confirmed) {
    selectedRole.value = key
    messages.value = [{
      from: 'AI',
      content: getWelcomeMessage(),
      time: new Date().toISOString()
    }]
    currentSources.value = []
  }
  showRoleMenu.value = false
}

function toggleRAGMode() {
  useRAG.value = !useRAG.value
  
  // 更新欢迎消息（如果只有一条消息）
  if (messages.value.length <= 1) {
    messages.value = [{
      from: 'AI',
      content: getWelcomeMessage(),
      time: new Date().toISOString()
    }]
  }
  
  if (useRAG.value) {
    const contextName = props.chatContext?.roomName || props.chatContext?.targetName
    if (contextName) {
      toast.success(`已开启「${contextName}」记录检索`)
    } else {
      toast.success('已开启全局记录检索')
    }
  } else {
    toast.info('已关闭聊天记录检索')
    currentSources.value = []
  }
}

function getPlaceholder() {
  if (useRAG.value) {
    if (props.chatContext?.roomName) {
      return `在「${props.chatContext.roomName}」中搜索...`
    }
    if (props.chatContext?.targetName) {
      return `在与「${props.chatContext.targetName}」的聊天中搜索...`
    }
    return '搜索所有聊天记录...'
  }
  return '问我任何问题...'
}

function getWelcomeMessage() {
  if (useRAG.value) {
    if (props.chatContext?.roomName) {
      return `你好！我可以帮你回答关于「${props.chatContext.roomName}」群聊的问题，会自动检索群内历史消息。`
    }
    if (props.chatContext?.targetName) {
      return `你好！我可以帮你回答关于与「${props.chatContext.targetName}」私聊的问题，会自动检索聊天记录。`
    }
    return '你好！我是AI智能助手，已开启全局聊天记录检索。'
  }
  return '你好！我是AI智能助手，有什么可以帮你的吗？'
}

function formatMessage(content) {
  if (!content) return ''
  // 代码块
  content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
  // 行内代码
  content = content.replace(/`([^`]+)`/g, '<code>$1</code>')
  // 加粗
  content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // 换行
  content = content.replace(/\n/g, '<br>')
  return content
}

async function send() {
  if (isLoading.value || !inputText.value.trim()) return

  const content = inputText.value.trim()
  messages.value.push({
    from: 'user',
    content,
    time: new Date().toISOString()
  })
  inputText.value = ''
  isLoading.value = true
  currentSources.value = []

  await nextTick()
  scrollToBottom()

  try {
    const token = localStorage.getItem('token')
    let aiAnswer = ''
    let sources = []

    if (useRAG.value) {
      const res = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/agent/chat`,
        {
          question: content,
          chatType: props.chatContext?.chatType || 'group',
          targetId: props.chatContext?.targetId,
          roomId: props.chatContext?.roomId,
          useContext: true,
          sessionId: sessionId.value,
          timeRange: timeRange.value
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 60000
        }
      )
      if (res.data.success) {
        aiAnswer = res.data.data.answer
        sources = res.data.data.sources || []
        if (sources.length > 0) {
          currentSources.value = sources
        }
      } else {
        throw new Error(res.data.error || '请求失败')
      }
    } else {
      const res = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/deepseek-chat`,
        { question: content, role: selectedRole.value },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000
        }
      )
      aiAnswer = res.data.answer
    }

    messages.value.push({
      from: 'AI',
      content: aiAnswer,
      time: new Date().toISOString(),
      sources: sources.length > 0 ? sources : undefined
    })
  } catch (err) {
    console.error('发送失败:', err)
    messages.value.push({
      from: 'AI',
      content: '抱歉，我遇到了一些问题，请稍后再试。',
      time: new Date().toISOString()
    })
  } finally {
    isLoading.value = false
    await nextTick()
    scrollToBottom()
  }
}

async function clearHistory() {
  const confirmed = await confirm({
    title: '清空历史',
    message: '确定要清空所有对话吗？'
  })
  if (confirmed) {
    messages.value = [{
      from: 'AI',
      content: getWelcomeMessage(),
      time: new Date().toISOString()
    }]
    currentSources.value = []
    sessionId.value = `session-${Date.now()}`
  }
}

function scrollToBottom() {
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

async function getUserAvatar() {
  try {
    const token = localStorage.getItem('token')
    const res = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/user/info`, {
      headers: { authorization: `Bearer ${token}` }
    })
    userAvatar.value = res.data.ava || res.data.user?.uAvatar || '/images/avatar/out.webp'
  } catch (err) {
    userAvatar.value = '/images/avatar/out.webp'
  }
}

onMounted(() => {
  getUserAvatar()
})
</script>

<style scoped lang="scss">
.ai-panel {
  width: 100%;
  height: 100%;
  background: var(--bg-tertiary, #fff);
  display: flex;
  flex-direction: column;
  position: absolute;
  left: 0;
  top: 0;
  z-index: 100;
  transform: translateX(-100%);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  
  &.visible {
    transform: translateX(0);
    pointer-events: auto;
  }

  .panel-header {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color, #e9ecef);
    background: var(--bg-secondary, #f8f9fa);

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;

      h4 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary, #333);
      }

      .role-selector {
        position: relative;

        .role-btn {
          padding: 4px 10px;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 6px;
          background: var(--bg-tertiary, white);
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--text-primary, #333);

          .arrow { font-size: 8px; }

          &:hover {
            border-color: var(--primary-color);
          }
        }

        .role-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          background: var(--bg-tertiary, white);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 4px;
          min-width: 120px;
          z-index: 10;

          .role-item {
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            color: var(--text-secondary, #666);

            &:hover { background: var(--hover-bg); }
            &.active {
              background: var(--active-bg);
              color: var(--primary-color);
            }
          }
        }
      }

      .rag-toggle {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        padding: 4px 10px;
        border-radius: 6px;
        border: 1px solid var(--border-color, #ddd);
        background: var(--bg-tertiary, white);
        transition: all 0.2s;

        &:hover { 
          border-color: var(--primary-color);
        }
        
        &.active {
          background: rgba(255, 127, 80, 0.1);
          border-color: var(--primary-color, coral);
          
          .rag-label {
            color: var(--primary-color, coral);
          }
        }

        .rag-label {
          font-size: 12px;
          color: var(--text-secondary, #666);
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .toggle-switch {
          width: 28px;
          height: 16px;
          background: var(--border-color, #ddd);
          border-radius: 8px;
          position: relative;
          transition: background 0.3s;
          flex-shrink: 0;

          .toggle-slider {
            width: 12px;
            height: 12px;
            background: white;
            border-radius: 50%;
            position: absolute;
            top: 2px;
            left: 2px;
            transition: transform 0.3s;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
          }

          &.active {
            background: var(--primary-color, coral);
            .toggle-slider { transform: translateX(12px); }
          }
        }
      }

      .time-range-selector {
        position: relative;

        .time-btn {
          padding: 4px 10px;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 6px;
          background: var(--bg-tertiary, white);
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--text-primary, #333);

          .arrow { font-size: 8px; }

          &:hover {
            border-color: var(--primary-color);
          }
        }

        .time-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          background: var(--bg-tertiary, white);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 4px;
          min-width: 100px;
          z-index: 10;

          .time-item {
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            color: var(--text-secondary, #666);
            white-space: nowrap;

            &:hover { background: var(--hover-bg, #f5f5f5); }
            &.active {
              background: var(--active-bg, rgba(255, 127, 80, 0.1));
              color: var(--primary-color, coral);
            }
          }
        }
      }
    }

    .header-right {
      display: flex;
      gap: 4px;

      .icon-btn {
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary, #666);

        &:hover { background: var(--hover-bg); }

        .icon {
          width: 18px;
          height: 18px;
        }
      }
    }
  }

  .panel-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;

    .message {
      display: flex;
      gap: 10px;

      &.is-user {
        flex-direction: row-reverse;

        .message-content {
          align-items: flex-end;

          .message-text {
            background: var(--primary-color, coral);
            color: white;
            border-radius: 16px 16px 4px 16px;
          }
        }
      }

      .message-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        overflow: hidden;
        flex-shrink: 0;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }

      .message-content {
        display: flex;
        flex-direction: column;
        max-width: 80%;

        .message-text {
          background: var(--bg-secondary, #f0f0f0);
          padding: 10px 14px;
          border-radius: 16px 16px 16px 4px;
          font-size: 14px;
          line-height: 1.5;
          color: var(--text-primary, #333);

          &.loading {
            display: flex;
            gap: 4px;
            padding: 12px 16px;

            span {
              width: 8px;
              height: 8px;
              background: var(--text-tertiary, #999);
              border-radius: 50%;
              animation: bounce 1.4s infinite;

              &:nth-child(1) { animation-delay: 0s; }
              &:nth-child(2) { animation-delay: 0.2s; }
              &:nth-child(3) { animation-delay: 0.4s; }
            }
          }

          :deep(code) {
            background: rgba(0, 0, 0, 0.05);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: monospace;
            font-size: 13px;
          }

          :deep(pre) {
            background: rgba(0, 0, 0, 0.03);
            padding: 10px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 6px 0;

            code {
              background: none;
              padding: 0;
            }
          }
        }

        .message-sources {
          margin-top: 6px;
          font-size: 11px;
          color: var(--text-tertiary, #999);
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;

          .source-tag {
            background: var(--active-bg);
            padding: 2px 6px;
            border-radius: 4px;
            color: var(--primary-color);
          }
        }
      }
    }
  }

  .sources-panel {
    flex: 0 0 auto;
    max-height: 120px;
    border-top: 1px solid var(--border-color);
    background: var(--bg-secondary);
    overflow: hidden;
    display: flex;
    flex-direction: column;

    .sources-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 12px;
      font-size: 12px;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-color);

      .close-sources {
        background: none;
        border: none;
        cursor: pointer;
        padding: 2px;
        border-radius: 4px;
        display: flex;
        color: var(--text-secondary);

        &:hover { background: var(--hover-bg); }
      }
    }

    .sources-list {
      flex: 1;
      overflow-y: auto;
      padding: 6px;

      .source-item {
        background: var(--bg-tertiary);
        border-radius: 6px;
        padding: 6px 10px;
        margin-bottom: 4px;
        border: 1px solid var(--border-color);

        .source-sender {
          font-size: 11px;
          font-weight: 600;
          color: var(--primary-color);
        }

        .source-content {
          font-size: 12px;
          color: var(--text-primary);
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .source-meta {
          margin-top: 2px;

          .relevance {
            font-size: 10px;
            background: var(--primary-color);
            color: white;
            padding: 1px 4px;
            border-radius: 3px;
          }
        }
      }
    }
  }

  .panel-input {
    flex: 0 0 auto;
    padding: 12px;
    border-top: 1px solid var(--border-color, #e0e0e0);
    display: flex;
    gap: 8px;
    background: var(--bg-tertiary, #fff);

    textarea {
      flex: 1;
      padding: 10px 12px;
      border: 1.5px solid #d0d0d0;
      border-radius: 8px;
      resize: none;
      font-size: 14px;
      font-family: inherit;
      background: #fff;
      color: var(--text-primary, #333);
      min-height: 72px; /* 约3行高度 */
      max-height: 120px;
      line-height: 1.5;

      &::placeholder {
        color: #999;
      }

      &:focus {
        outline: none;
        border-color: var(--primary-color, coral);
        box-shadow: 0 0 0 2px rgba(255, 127, 80, 0.15);
      }

      &:disabled {
        background: #f5f5f5;
        cursor: not-allowed;
      }
    }

    .send-btn {
      padding: 0 20px;
      background: var(--primary-color, coral);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
      align-self: flex-end;
      height: 36px;

      &:hover:not(:disabled) {
        opacity: 0.9;
        transform: translateY(-1px);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
}

@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
}

@media (max-width: 480px) {
  .ai-panel {
    width: 100%;
    max-width: 100%;
  }
}
</style>
