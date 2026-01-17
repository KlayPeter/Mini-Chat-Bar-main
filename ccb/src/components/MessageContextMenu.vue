<template>
  <Teleport to="body">
    <div 
      v-if="visible" 
      class="context-menu-overlay"
      @click="close"
      @contextmenu.prevent
    >
      <div 
        class="context-menu"
        :style="{ top: position.y + 'px', left: position.x + 'px' }"
        @click.stop
      >
        <div class="menu-item" @click="handleAction('favorite')">
          <Star :size="16" :fill="isFavorited ? 'currentColor' : 'none'" />
          <span>{{ isFavorited ? '取消收藏' : '收藏' }}</span>
        </div>
        
        <div class="menu-item" @click="handleAction('forward')">
          <Forward :size="16" />
          <span>转发</span>
        </div>
        
        <div class="menu-item" @click="handleAction('copy')">
          <Copy :size="16" />
          <span>复制</span>
        </div>
        
        <div class="menu-item" @click="handleAction('reply')">
          <MessageCircle :size="16" />
          <span>引用</span>
        </div>
        
        <div v-if="canDelete" class="menu-item danger" @click="handleAction('delete')">
          <Trash2 :size="16" />
          <span>删除</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Star, Forward, Copy, MessageCircle, Trash2 } from 'lucide-vue-next'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  canDelete: {
    type: Boolean,
    default: false
  },
  isFavorited: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'action'])

function close() {
  emit('close')
}

function handleAction(action) {
  emit('action', action)
  close()
}

// 监听 ESC 键关闭菜单
watch(() => props.visible, (newVal) => {
  if (newVal) {
    document.addEventListener('keydown', handleEscape)
  } else {
    document.removeEventListener('keydown', handleEscape)
  }
})

function handleEscape(e) {
  if (e.key === 'Escape') {
    close()
  }
}
</script>

<style scoped lang="scss">
.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: transparent;
}

.context-menu {
  position: fixed;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 6px;
  min-width: 160px;
  z-index: 10000;
  animation: menuFadeIn 0.15s ease-out;
}

@keyframes menuFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: all 0.2s;
  user-select: none;
  
  svg {
    flex-shrink: 0;
    color: #666;
  }
  
  &:hover {
    background: #f5f5f5;
    
    svg {
      color: rgb(165, 42, 42);
    }
  }
  
  &.danger {
    color: #f44336;
    
    svg {
      color: #f44336;
    }
    
    &:hover {
      background: #ffebee;
    }
  }
}
</style>
