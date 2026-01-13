<template>
  <div class="summary-dialog-overlay" @click.self="$emit('close')">
    <div class="summary-dialog">
      <!-- 头部 -->
      <div class="dialog-header">
        <h3>
          <Notes class="header-icon" />
          {{ title }}
        </h3>
        <button class="close-btn" @click="$emit('close')">
          <Xmark />
        </button>
      </div>

      <!-- 时间范围选择 -->
      <div class="time-range-section" v-if="!loading && !summary">
        <div class="range-label">选择时间范围</div>
        <div class="range-options">
          <button 
            v-for="option in timeOptions" 
            :key="option.value"
            :class="['range-btn', { active: selectedRange === option.value }]"
            @click="selectedRange = option.value"
          >
            {{ option.label }}
          </button>
        </div>
        <div class="custom-range" v-if="selectedRange === 'custom'">
          <input type="date" v-model="customStart" />
          <span>至</span>
          <input type="date" v-model="customEnd" />
        </div>
        <button class="generate-btn" @click="generateSummary" :disabled="loading">
          <Sparks class="btn-icon" />
          <span>生成总结</span>
        </button>
      </div>

      <!-- 加载状态 -->
      <div class="loading-section" v-if="loading">
        <div class="loading-spinner"></div>
        <p>AI 正在分析聊天记录...</p>
        <p class="loading-tip">{{ loadingTip }}</p>
      </div>

      <!-- 总结结果 -->
      <div class="summary-content" v-if="summary && !loading">
        <!-- 概览 -->
        <div class="summary-section">
          <div class="section-title">
            <Page class="section-icon" />
            {{ summary.title || '聊天总结' }}
          </div>
          <p class="overview">{{ summary.overview }}</p>
          <div class="stats">
            <span><ChatBubble class="stat-icon" /> {{ messageCount }} 条消息</span>
            <span><Group class="stat-icon" /> {{ statistics?.participantCount || 0 }} 人参与</span>
          </div>
        </div>

        <!-- 关键要点 -->
        <div class="summary-section" v-if="summary.keyPoints?.length">
          <div class="section-title">
            <LightBulb class="section-icon" />
            关键要点
          </div>
          <ul class="key-points">
            <li v-for="(point, index) in summary.keyPoints" :key="index">
              {{ point }}
            </li>
          </ul>
        </div>

        <!-- 结论 -->
        <div class="summary-section" v-if="summary.conclusions?.length">
          <div class="section-title">
            <Check class="section-icon" />
            结论
          </div>
          <ul class="conclusions">
            <li v-for="(conclusion, index) in summary.conclusions" :key="index">
              {{ conclusion }}
            </li>
          </ul>
        </div>

        <!-- 待办事项 -->
        <div class="summary-section" v-if="summary.actionItems?.length">
          <div class="section-title">
            <ClipboardCheck class="section-icon" />
            待办事项
          </div>
          <ul class="action-items">
            <li v-for="(item, index) in summary.actionItems" :key="index">
              <span class="task">{{ item.task }}</span>
              <span class="assignee" v-if="item.assignee">负责人: {{ item.assignee }}</span>
              <span class="deadline" v-if="item.deadline">截止: {{ item.deadline }}</span>
            </li>
          </ul>
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <button class="btn-secondary" @click="resetSummary">
            <Refresh class="btn-icon" />
            重新生成
          </button>
          <button class="btn-primary" @click="copySummary">
            <Copy class="btn-icon" />
            复制总结
          </button>
        </div>
      </div>

      <!-- 错误状态 -->
      <div class="error-section" v-if="error">
        <WarningCircle class="error-icon" />
        <p>{{ error }}</p>
        <button @click="resetSummary">
          <Refresh class="btn-icon" />
          重试
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'
import { useToast } from '../composables/useToast'
import { 
  Xmark, 
  ChatBubble, 
  Group, 
  Check, 
  Copy, 
  Refresh,
  LightBulb,
  Page,
  ClipboardCheck,
  WarningCircle,
  Notes,
  Sparks
} from '@iconoir/vue'

const props = defineProps({
  chatType: {
    type: String,
    required: true,
    validator: (value) => ['private', 'group'].includes(value)
  },
  targetId: {
    type: String,
    required: true
  },
  targetName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close'])
const toast = useToast()
const baseUrl = import.meta.env.VITE_BASE_URL

const loading = ref(false)
const error = ref('')
const summary = ref(null)
const statistics = ref(null)
const messageCount = ref(0)
const selectedRange = ref('today')
const customStart = ref('')
const customEnd = ref('')

const loadingTips = [
  '正在读取聊天记录...',
  '分析讨论内容...',
  '提取关键信息...',
  '生成结构化总结...'
]
const loadingTip = ref(loadingTips[0])

const title = computed(() => {
  return props.chatType === 'group' ? '群聊纪要' : '对话总结'
})

const timeOptions = [
  { label: '今天', value: 'today' },
  { label: '最近3天', value: '3days' },
  { label: '最近7天', value: '7days' },
  { label: '最近30天', value: '30days' },
  { label: '全部', value: 'all' },
  { label: '自定义', value: 'custom' }
]

function getTimeRange() {
  const now = new Date()
  let start = null
  let end = now

  switch (selectedRange.value) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case '3days':
      start = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      break
    case '7days':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '30days':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case 'custom':
      start = customStart.value ? new Date(customStart.value) : null
      end = customEnd.value ? new Date(customEnd.value) : now
      break
    case 'all':
    default:
      start = null
      break
  }

  return start ? { start: start.toISOString(), end: end.toISOString() } : null
}

async function generateSummary() {
  loading.value = true
  error.value = ''
  
  let tipIndex = 0
  const tipInterval = setInterval(() => {
    tipIndex = (tipIndex + 1) % loadingTips.length
    loadingTip.value = loadingTips[tipIndex]
  }, 2000)

  try {
    const token = localStorage.getItem('token')
    const timeRange = getTimeRange()

    const requestBody = {
      chatType: props.chatType,
      timeRange
    }

    if (props.chatType === 'private') {
      requestBody.targetId = props.targetId
    } else {
      requestBody.roomId = props.targetId
    }

    const res = await axios.post(
      `${baseUrl}/api/agent/summarize`,
      requestBody,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 60000
      }
    )

    if (res.data.success) {
      summary.value = res.data.data.summary
      statistics.value = res.data.data.statistics
      messageCount.value = res.data.data.messageCount
    } else {
      error.value = res.data.error || '生成失败，请重试'
    }
  } catch (err) {
    console.error('生成总结失败:', err)
    error.value = err.response?.data?.error || err.message || '生成失败，请重试'
  } finally {
    loading.value = false
    clearInterval(tipInterval)
  }
}

function resetSummary() {
  summary.value = null
  statistics.value = null
  messageCount.value = 0
  error.value = ''
}

function copySummary() {
  if (!summary.value) return

  let text = `【${summary.value.title || '聊天总结'}】\n\n`
  text += `${summary.value.overview}\n\n`

  if (summary.value.keyPoints?.length) {
    text += `【关键要点】\n`
    summary.value.keyPoints.forEach((point, i) => {
      text += `${i + 1}. ${point}\n`
    })
    text += '\n'
  }

  if (summary.value.conclusions?.length) {
    text += `【结论】\n`
    summary.value.conclusions.forEach((c, i) => {
      text += `${i + 1}. ${c}\n`
    })
    text += '\n'
  }

  if (summary.value.actionItems?.length) {
    text += `【待办事项】\n`
    summary.value.actionItems.forEach((item, i) => {
      text += `${i + 1}. ${item.task}`
      if (item.assignee) text += ` (${item.assignee})`
      if (item.deadline) text += ` [${item.deadline}]`
      text += '\n'
    })
  }

  navigator.clipboard.writeText(text).then(() => {
    toast.success('已复制到剪贴板')
  }).catch(() => {
    toast.error('复制失败')
  })
}
</script>


<style scoped lang="scss">
.summary-dialog-overlay {
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

.summary-dialog {
  background: var(--bg-primary, #fff);
  border-radius: 20px;
  width: 90%;
  max-width: 560px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid var(--border-color, #eee);
  background: var(--bg-secondary, #fafafa);
  
  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary, #333);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .header-icon {
    width: 22px;
    height: 22px;
    color: var(--primary-color, coral);
  }
  
  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-secondary, #999);
    padding: 6px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    
    &:hover {
      background: var(--bg-hover, #f0f0f0);
      color: var(--text-primary, #333);
    }
    
    svg {
      width: 20px;
      height: 20px;
    }
  }
}

.time-range-section {
  padding: 24px;
  
  .range-label {
    font-size: 14px;
    color: var(--text-secondary, #666);
    margin-bottom: 14px;
    font-weight: 500;
  }
  
  .range-options {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 20px;
  }
  
  .range-btn {
    padding: 10px 18px;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 20px;
    background: var(--bg-primary, #fff);
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
    color: var(--text-primary, #333);
    
    &:hover {
      border-color: var(--primary-color, coral);
      color: var(--primary-color, coral);
    }
    
    &.active {
      background: var(--primary-color, coral);
      color: #fff;
      border-color: var(--primary-color, coral);
    }
  }
  
  .custom-range {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    
    input {
      padding: 10px 14px;
      border: 1px solid var(--border-color, #ddd);
      border-radius: 10px;
      font-size: 14px;
      background: var(--bg-primary, #fff);
      color: var(--text-primary, #333);
      
      &:focus {
        outline: none;
        border-color: var(--primary-color, coral);
      }
    }
    
    span {
      color: var(--text-secondary, #999);
    }
  }
  
  .generate-btn {
    width: 100%;
    padding: 14px;
    background: var(--primary-color, coral);
    color: #fff;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    
    .btn-icon {
      width: 20px;
      height: 20px;
    }
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(255, 127, 80, 0.4);
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

.loading-section {
  padding: 50px 24px;
  text-align: center;
  
  .loading-spinner {
    width: 44px;
    height: 44px;
    border: 3px solid var(--border-color, #f3f3f3);
    border-top: 3px solid var(--primary-color, coral);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
  }
  
  p {
    margin: 8px 0;
    color: var(--text-primary, #333);
    font-size: 15px;
  }
  
  .loading-tip {
    color: var(--text-secondary, #999);
    font-size: 14px;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.summary-content {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}

.summary-section {
  margin-bottom: 24px;
  
  .section-title {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--text-primary, #333);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .section-icon {
    width: 18px;
    height: 18px;
    color: var(--primary-color, coral);
  }
  
  .overview {
    color: var(--text-secondary, #666);
    line-height: 1.7;
    font-size: 14px;
    margin: 0;
  }
  
  .stats {
    display: flex;
    gap: 20px;
    margin-top: 14px;
    font-size: 13px;
    color: var(--text-secondary, #999);
    
    span {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .stat-icon {
      width: 16px;
      height: 16px;
    }
  }
  
  ul {
    margin: 0;
    padding-left: 0;
    list-style: none;
    
    li {
      margin-bottom: 10px;
      line-height: 1.6;
      font-size: 14px;
      color: var(--text-primary, #333);
      padding-left: 20px;
      position: relative;
      
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 8px;
        width: 6px;
        height: 6px;
        background: var(--primary-color, coral);
        border-radius: 50%;
      }
    }
  }
  
  .action-items li {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: var(--bg-secondary, #f9f9f9);
    padding: 12px 16px;
    padding-left: 28px;
    border-radius: 10px;
    
    .task {
      font-weight: 500;
    }
    
    .assignee, .deadline {
      font-size: 12px;
      color: var(--text-secondary, #999);
    }
  }
}

.action-buttons {
  display: flex;
  gap: 12px;
  padding: 18px 24px;
  border-top: 1px solid var(--border-color, #eee);
  background: var(--bg-secondary, #fafafa);
  
  button {
    flex: 1;
    padding: 12px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    
    .btn-icon {
      width: 16px;
      height: 16px;
    }
  }
  
  .btn-secondary {
    background: var(--bg-primary, #fff);
    border: 1px solid var(--border-color, #ddd);
    color: var(--text-secondary, #666);
    
    &:hover {
      background: var(--bg-hover, #f5f5f5);
      border-color: var(--text-secondary, #999);
    }
  }
  
  .btn-primary {
    background: var(--primary-color, coral);
    border: none;
    color: #fff;
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(255, 127, 80, 0.4);
    }
  }
}

.error-section {
  padding: 50px 24px;
  text-align: center;
  
  .error-icon {
    width: 48px;
    height: 48px;
    color: #dc3545;
    margin-bottom: 16px;
  }
  
  p {
    color: #dc3545;
    margin-bottom: 20px;
    font-size: 14px;
  }
  
  button {
    padding: 12px 28px;
    background: var(--primary-color, coral);
    color: #fff;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    
    .btn-icon {
      width: 16px;
      height: 16px;
    }
    
    &:hover {
      transform: translateY(-1px);
    }
  }
}
</style>
