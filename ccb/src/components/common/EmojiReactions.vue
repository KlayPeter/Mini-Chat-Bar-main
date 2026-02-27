<template>
  <div class="emoji-reactions">
    <!-- 添加反应按钮 -->
    <div class="add-reaction" v-if="showAddButton">
      <button class="add-reaction-btn" @click="togglePicker">
        <SmilePlus :size="16" />
      </button>
      
      <!-- Emoji 选择器 -->
      <div v-if="showPicker" class="emoji-picker">
        <button
          v-for="emoji in availableEmojis"
          :key="emoji.type"
          class="emoji-option"
          @click="selectEmoji(emoji.type)"
          :title="emoji.label"
        >
          <component :is="emoji.icon" :size="16" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ThumbsUp, Heart, PartyPopper, Lightbulb, HelpCircle, SmilePlus } from 'lucide-vue-next'

const props = defineProps({
  reactions: {
    type: Array,
    default: () => []
  },
  currentUserId: {
    type: String,
    required: true
  },
  showAddButton: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['toggle-reaction'])

const showPicker = ref(false)

const availableEmojis = [
  { type: 'thumbsup', icon: ThumbsUp, label: '赞' },
  { type: 'heart', icon: Heart, label: '喜欢' },
  { type: 'party', icon: PartyPopper, label: '庆祝' },
  { type: 'bulb', icon: Lightbulb, label: '有用' },
  { type: 'question', icon: HelpCircle, label: '疑问' }
]

function togglePicker() {
  showPicker.value = !showPicker.value
}

function selectEmoji(emojiType) {
  emit('toggle-reaction', emojiType)
  showPicker.value = false
}
</script>

<style scoped lang="scss">
.emoji-reactions {
  display: flex;
  align-items: center;
}

.add-reaction {
  position: relative;
}

.add-reaction-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e8e8e8;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  color: #999;
  transition: all 0.2s;
  
  &:hover {
    background: #f5f5f5;
    border-color: rgb(165, 42, 42);
    color: rgb(165, 42, 42);
  }
}

.emoji-picker {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
  display: flex;
  gap: 4px;
  padding: 8px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.emoji-option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
  
  &:hover {
    background: #f5f5f5;
    color: rgb(165, 42, 42);
    transform: scale(1.1);
  }
}
</style>
