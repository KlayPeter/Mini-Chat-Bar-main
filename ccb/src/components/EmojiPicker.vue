<template>
  <div class="emoji-picker-wrapper" v-if="show">
    <!-- 点击外部关闭的遮罩层 -->
    <div class="picker-overlay" @click="$emit('close')"></div>
    
    <!-- 表情选择器主体 -->
    <div class="emoji-picker-container" ref="pickerRef" @click.stop>
      <!-- Emoji 选择器 - 直接显示，不需要标签切换 -->
      <div class="emoji-panel">
        <EmojiPickerLib
          :native="true"
          :disable-skin-tones="false"
          :disable-sticky-group-names="false"
          :display-recent="true"
          @select="onSelectEmoji"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import EmojiPickerLib from 'vue3-emoji-picker'
import 'vue3-emoji-picker/css'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select', 'close', 'select-sticker'])

const pickerRef = ref(null)

// 选择 Emoji
function onSelectEmoji(emoji) {
  emit('select', emoji.i)
}
</script>

<style scoped lang="scss">
.emoji-picker-wrapper {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 0;
  z-index: 1000;
}

.picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  background: transparent;
}

.emoji-picker-container {
  position: relative;
  z-index: 2;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  width: 350px;
  max-height: 420px;
}

.emoji-panel {
  :deep(.v3-emoji-picker) {
    width: 100% !important;
    border: none !important;
    box-shadow: none !important;
  }
}
</style>
