<template>
  <div class="ai-insights-dropdown">
    <!-- 折叠的摘要栏 -->
    <div class="insights-summary" @click="toggleExpanded">
      <div class="summary-content">
        <span class="summary-text">{{ summaryText }}</span>
      </div>
      <ChevronDown 
        :size="20" 
        class="toggle-icon" 
        :class="{ 'expanded': isExpanded }"
      />
    </div>
    
    <!-- 展开的详细内容 -->
    <transition name="expand">
      <div v-if="isExpanded" class="insights-details">
        <!-- 紧急问题 -->
        <div v-if="urgentQuestions.length > 0" class="insight-section urgent">
          <div class="section-header">
            <AlertCircle :size="18" class="section-icon" />
            <span class="section-title">紧急问题</span>
            <span class="section-count">{{ urgentQuestions.length }}</span>
          </div>
          <div class="question-list">
            <div 
              v-for="q in urgentQuestions" 
              :key="q.id"
              class="question-item"
              @click="$emit('jump-to-question', q.id)"
            >
              <div class="question-user">{{ q.fromName }}</div>
              <div class="question-content">{{ q.content }}</div>
              <div class="question-meta">
                <Clock :size="12" />
                <span>{{ q.minutesAgo }} 分钟前</span>
                <MessageCircle :size="12" />
                <span>{{ q.replyCount }} 回复</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- AI 可帮助 -->
        <div v-if="aiCanHelp.length > 0" class="insight-section ai-help">
          <div class="section-header">
            <Lightbulb :size="18" class="section-icon" />
            <span class="section-title">AI 可帮助</span>
            <span class="section-count">{{ aiCanHelp.length }}</span>
          </div>
          <div class="question-list">
            <div 
              v-for="q in aiCanHelp" 
              :key="q.id"
              class="question-item"
            >
              <div class="question-user">{{ q.fromName }}</div>
              <div class="question-content">{{ q.content }}</div>
              <button 
                class="ai-answer-btn"
                @click.stop="$emit('ai-answer', q.id)"
              >
                <Bot :size="14" />
                让 AI 回答
              </button>
            </div>
          </div>
        </div>
        
        <!-- 热门讨论 -->
        <div v-if="hotTopics.length > 0" class="insight-section hot-topics">
          <div class="section-header">
            <Flame :size="18" class="section-icon" />
            <span class="section-title">热门讨论</span>
          </div>
          <div class="topic-list">
            <div 
              v-for="(topic, index) in hotTopics" 
              :key="index"
              class="topic-item"
            >
              <div class="topic-rank">{{ index + 1 }}</div>
              <div class="topic-content">
                <div class="topic-text">{{ topic.topic }}</div>
                <div class="topic-stats">
                  <MessageCircle :size="12" />
                  <span>{{ topic.messageCount }} 条消息</span>
                  <Users :size="12" />
                  <span>{{ topic.participantCount }} 人参与</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 未解决问题总览 -->
        <div v-if="totalOpenQuestions > 0" class="insight-section open-questions">
          <div class="section-header">
            <Search :size="18" class="section-icon" />
            <span class="section-title">未解决问题</span>
            <span class="section-count">{{ totalOpenQuestions }}</span>
          </div>
          <button 
            class="view-all-btn"
            @click="$emit('show-all-questions')"
          >
            查看所有未解决问题
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { 
  ChevronDown, AlertCircle, Lightbulb, Flame, Search, 
  Clock, MessageCircle, Users, Bot 
} from 'lucide-vue-next'

const props = defineProps({
  insights: {
    type: Object,
    required: true
  },
  aiSpeech: {
    type: String,
    default: ''
  }
})

defineEmits(['jump-to-question', 'ai-answer', 'show-all-questions'])

const isExpanded = ref(false)

const urgentQuestions = computed(() => props.insights.urgentQuestions || [])
const aiCanHelp = computed(() => props.insights.aiCanHelp || [])
const hotTopics = computed(() => props.insights.hotTopics || [])
const totalOpenQuestions = computed(() => props.insights.totalOpenQuestions || 0)

const summaryText = computed(() => {
  if (props.aiSpeech) {
    return props.aiSpeech
  }
  
  const parts = []
  if (totalOpenQuestions.value > 0) {
    parts.push(`${totalOpenQuestions.value} 个未解决问题`)
  }
  if (urgentQuestions.value.length > 0) {
    parts.push(`${urgentQuestions.value.length} 个紧急`)
  }
  if (hotTopics.value.length > 0) {
    parts.push(`热议：${hotTopics.value[0].topic.substring(0, 15)}...`)
  }
  
  return parts.length > 0 ? parts.join(' · ') : '暂无问题，讨论顺利'
})

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}
</script>

<style scoped lang="scss">
.ai-insights-dropdown {
  background: white;
  border-bottom: 1px solid #f0f0f0;
  overflow: hidden;
}

.insights-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  cursor: pointer;
  transition: background 0.2s;
  min-height: 44px;
  
  &:hover {
    background: rgba(165, 42, 42, 0.05);
  }
  
  .summary-content {
    flex: 1;
    
    .summary-text {
      font-size: 13px;
      color: #666;
      font-weight: 500;
    }
  }
  
  .toggle-icon {
    color: rgb(165, 42, 42);
    transition: transform 0.3s;
    flex-shrink: 0;
    
    &.expanded {
      transform: rotate(180deg);
    }
  }
}

.insights-details {
  border-top: 1px solid #f0f0f0;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #fafafa;
}

.insight-section {
  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    
    .section-icon {
      flex-shrink: 0;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }
    
    .section-count {
      margin-left: auto;
      background: rgba(165, 42, 42, 0.1);
      color: rgb(165, 42, 42);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
  }
  
  &.urgent {
    .section-icon {
      color: #ef4444;
    }
  }
  
  &.ai-help {
    .section-icon {
      color: #f59e0b;
    }
  }
  
  &.hot-topics {
    .section-icon {
      color: #f97316;
    }
  }
  
  &.open-questions {
    .section-icon {
      color: #3b82f6;
    }
  }
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.question-item {
  background: #f9fafb;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #f3f4f6;
    transform: translateX(4px);
  }
  
  .question-user {
    font-size: 12px;
    color: rgb(165, 42, 42);
    font-weight: 600;
    margin-bottom: 4px;
  }
  
  .question-content {
    font-size: 13px;
    color: #333;
    line-height: 1.4;
    margin-bottom: 6px;
  }
  
  .question-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #6b7280;
    
    svg {
      flex-shrink: 0;
    }
  }
  
  .ai-answer-btn {
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: linear-gradient(135deg, rgb(165, 42, 42) 0%, rgb(140, 30, 30) 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(165, 42, 42, 0.3);
    }
  }
}

.topic-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.topic-item {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  background: #f9fafb;
  border-radius: 8px;
  
  .topic-rank {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgb(165, 42, 42) 0%, rgb(140, 30, 30) 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }
  
  .topic-content {
    flex: 1;
    
    .topic-text {
      font-size: 13px;
      color: #333;
      margin-bottom: 6px;
      line-height: 1.4;
    }
    
    .topic-stats {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #6b7280;
      
      svg {
        flex-shrink: 0;
      }
    }
  }
}

.view-all-btn {
  width: 100%;
  padding: 10px;
  background: white;
  border: 2px solid rgb(165, 42, 42);
  color: rgb(165, 42, 42);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgb(165, 42, 42);
    color: white;
  }
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  max-height: 1000px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
