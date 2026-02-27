<template>
  <div class="link-preview" @click="openLink">
    <div class="preview-icon">
      <img v-if="preview.favicon" :src="preview.favicon" alt="icon" @error="handleIconError" />
      <Link v-else :size="20" />
    </div>
    <div class="preview-content">
      <div class="preview-title">{{ preview.title || preview.url }}</div>
      <div v-if="preview.description" class="preview-description">{{ preview.description }}</div>
      <div class="preview-url">{{ displayUrl }}</div>
    </div>
    <ExternalLink :size="16" class="open-icon" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Link, ExternalLink } from 'lucide-vue-next'

const props = defineProps({
  preview: {
    type: Object,
    required: true
  }
})

const displayUrl = computed(() => {
  try {
    const url = new URL(props.preview.url)
    return url.hostname
  } catch {
    return props.preview.url
  }
})

function openLink() {
  window.open(props.preview.url, '_blank')
}

function handleIconError(e) {
  e.target.style.display = 'none'
}
</script>

<style scoped lang="scss">
.link-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
  max-width: 100%;
  overflow: hidden;

  &:hover {
    background: #ebebeb;
    border-color: rgb(165, 42, 42);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .preview-icon {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: #e8e8e8;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #666;

    img {
      width: 24px;
      height: 24px;
      object-fit: contain;
    }
  }

  .preview-content {
    flex: 1;
    min-width: 0;

    .preview-title {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .preview-description {
      font-size: 12px;
      color: #666;
      line-height: 1.4;
      margin-bottom: 4px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .preview-url {
      font-size: 11px;
      color: #999;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .open-icon {
    color: #999;
    flex-shrink: 0;
  }
}
</style>
