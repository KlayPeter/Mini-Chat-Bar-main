<template>
  <div v-if="visible" class="upload-progress-container">
    <div class="upload-progress-card">
      <div class="upload-header">
        <div class="file-info">
          <div class="file-icon">
            <img :src="getFileIcon(file.type)" alt="文件图标" />
          </div>
          <div class="file-details">
            <div class="file-name">{{ file.name }}</div>
            <div class="file-size">{{ formatFileSize(file.size) }}</div>
          </div>
        </div>
        <button v-if="canCancel" @click="handleCancel" class="cancel-btn" title="取消上传">
          <Xmark class="icon" />
        </button>
      </div>

      <!-- 计算 MD5 进度 -->
      <div v-if="status === 'hashing'" class="progress-section">
        <div class="progress-label">
          <span>计算文件指纹...</span>
          <span class="progress-percent">{{ hashProgress }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: hashProgress + '%' }"></div>
        </div>
      </div>

      <!-- 上传进度 -->
      <div v-if="status === 'uploading' || status === 'completed'" class="progress-section">
        <div class="progress-label">
          <span>{{ statusText }}</span>
          <span class="progress-percent">{{ uploadProgress }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill success" :style="{ width: uploadProgress + '%' }"></div>
        </div>
        <div v-if="uploadSpeed > 0" class="upload-stats">
          <span>速度: {{ formatSpeed(uploadSpeed) }}</span>
          <span v-if="remainingTime > 0">剩余: {{ formatTime(remainingTime) }}</span>
        </div>
      </div>

      <!-- 秒传提示 -->
      <div v-if="instantUpload" class="instant-upload-tip">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M20 6L9 17l-5-5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>文件已存在，秒传成功！</span>
      </div>

      <!-- 错误提示 -->
      <div v-if="status === 'failed'" class="error-section">
        <div class="error-message">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" stroke-width="2"/>
            <path d="M15 9l-6 6M9 9l6 6" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>{{ errorMessage }}</span>
        </div>
        <button @click="handleRetry" class="retry-btn">重试</button>
      </div>

      <!-- 暂停/恢复按钮 -->
      <div v-if="status === 'uploading' || status === 'paused'" class="action-buttons">
        <button v-if="status === 'uploading'" @click="handlePause" class="action-btn">
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1"/>
            <rect x="14" y="4" width="4" height="16" rx="1"/>
          </svg>
          <span>暂停</span>
        </button>
        <button v-if="status === 'paused'" @click="handleResume" class="action-btn">
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <span>继续</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Xmark } from '@iconoir/vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  file: {
    type: Object,
    required: true
  },
  status: {
    type: String,
    default: 'pending' // pending, hashing, uploading, paused, completed, failed
  },
  hashProgress: {
    type: Number,
    default: 0
  },
  uploadProgress: {
    type: Number,
    default: 0
  },
  uploadSpeed: {
    type: Number,
    default: 0
  },
  remainingTime: {
    type: Number,
    default: 0
  },
  instantUpload: {
    type: Boolean,
    default: false
  },
  errorMessage: {
    type: String,
    default: '上传失败'
  }
})

const emit = defineEmits(['cancel', 'pause', 'resume', 'retry'])

const canCancel = computed(() => {
  return ['hashing', 'uploading', 'paused'].includes(props.status)
})

const statusText = computed(() => {
  switch (props.status) {
    case 'hashing':
      return '计算文件指纹...'
    case 'uploading':
      return '上传中...'
    case 'paused':
      return '已暂停'
    case 'completed':
      return '上传完成'
    case 'failed':
      return '上传失败'
    default:
      return '准备上传'
  }
})

function handleCancel() {
  emit('cancel')
}

function handlePause() {
  emit('pause')
}

function handleResume() {
  emit('resume')
}

function handleRetry() {
  emit('retry')
}

function getFileIcon(fileType) {
  if (!fileType) return '/images/icon/other.png'
  
  if (fileType.includes('image')) return '/images/icon/image.png'
  if (fileType.includes('video')) return '/images/icon/video.png'
  if (fileType.includes('audio')) return '/images/icon/audio.png'
  if (fileType.includes('pdf')) return '/images/icon/pdf.png'
  if (fileType.includes('word') || fileType.includes('doc')) return '/images/icon/doc.png'
  if (fileType.includes('excel') || fileType.includes('sheet')) return '/images/icon/excel.png'
  if (fileType.includes('powerpoint') || fileType.includes('ppt')) return '/images/icon/ppt.png'
  if (fileType.includes('zip') || fileType.includes('rar')) return '/images/icon/folder.png'
  
  return '/images/icon/other.png'
}

function formatFileSize(size) {
  if (!size) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB']
  let index = 0
  let fileSize = size
  
  while (fileSize >= 1024 && index < units.length - 1) {
    fileSize /= 1024
    index++
  }
  
  return `${fileSize.toFixed(1)} ${units[index]}`
}

function formatSpeed(bytesPerSecond) {
  return formatFileSize(bytesPerSecond) + '/s'
}

function formatTime(seconds) {
  if (seconds < 60) {
    return `${Math.floor(seconds)}秒`
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}分${secs}秒`
  } else {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}小时${mins}分`
  }
}
</script>

<style scoped lang="scss">
.upload-progress-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.upload-progress-card {
  width: 360px;
  background: var(--bg-tertiary, #ffffff);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  padding: 16px;
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
}

.upload-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;

  .file-info {
    display: flex;
    gap: 12px;
    flex: 1;

    .file-icon {
      width: 40px;
      height: 40px;
      flex-shrink: 0;

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }

    .file-details {
      flex: 1;
      min-width: 0;

      .file-name {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-primary, #2c3e50);
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .file-size {
        font-size: 12px;
        color: var(--text-secondary, #6c757d);
      }
    }
  }

  .cancel-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    color: var(--text-secondary, #6c757d);
    transition: all 0.2s;

    .icon {
      width: 18px;
      height: 18px;
    }

    &:hover {
      background: var(--active-bg, #f0f0f0);
      color: var(--text-primary, #2c3e50);
    }
  }
}

.progress-section {
  margin-bottom: 12px;

  .progress-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 13px;
    color: var(--text-secondary, #6c757d);

    .progress-percent {
      font-weight: 600;
      color: var(--text-primary, #2c3e50);
    }
  }

  .progress-bar {
    height: 6px;
    background: var(--bg-secondary, #f0f0f0);
    border-radius: 3px;
    overflow: hidden;

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #007bff 0%, #0056b3 100%);
      border-radius: 3px;
      transition: width 0.3s ease;

      &.success {
        background: linear-gradient(90deg, #28a745 0%, #218838 100%);
      }
    }
  }

  .upload-stats {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    font-size: 12px;
    color: var(--text-secondary, #6c757d);
  }
}

.instant-upload-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  border-radius: 8px;
  color: #155724;
  font-size: 13px;
  font-weight: 500;

  .icon {
    width: 20px;
    height: 20px;
    stroke: #155724;
  }
}

.error-section {
  .error-message {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
    border-radius: 8px;
    color: #721c24;
    font-size: 13px;
    margin-bottom: 12px;

    .icon {
      width: 20px;
      height: 20px;
      stroke: #721c24;
      flex-shrink: 0;
    }
  }

  .retry-btn {
    width: 100%;
    padding: 10px;
    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
    }
  }
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 12px;

  .action-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    background: var(--bg-secondary, #f0f0f0);
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary, #2c3e50);
    cursor: pointer;
    transition: all 0.2s;

    .icon {
      width: 16px;
      height: 16px;
    }

    &:hover {
      background: var(--active-bg, #e0e0e0);
      transform: translateY(-1px);
    }
  }
}

@media (max-width: 768px) {
  .upload-progress-container {
    bottom: 10px;
    right: 10px;
    left: 10px;
  }

  .upload-progress-card {
    width: 100%;
  }
}
</style>
