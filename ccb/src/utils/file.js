/**
 * 文件相关工具函数
 */
import { FILE_ICONS } from '../constants'

/**
 * 获取文件图标
 * @param {string} fileType - 文件类型
 * @returns {string} 图标路径
 */
export function getFileIcon(fileType) {
  if (!fileType) return FILE_ICONS.default
  
  const type = fileType.toLowerCase()
  
  for (const [key, icon] of Object.entries(FILE_ICONS)) {
    if (type.includes(key)) {
      return icon
    }
  }
  
  return FILE_ICONS.default
}

/**
 * 获取文件扩展名
 * @param {string} fileName - 文件名
 * @returns {string} 扩展名
 */
export function getFileExtension(fileName) {
  if (!fileName) return ''
  const parts = fileName.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

/**
 * 验证文件大小
 * @param {File} file - 文件对象
 * @param {number} maxSizeMB - 最大大小（MB）
 * @returns {Object} {valid: boolean, message: string}
 */
export function validateFileSize(file, maxSizeMB = 100) {
  const maxSize = maxSizeMB * 1024 * 1024
  if (file.size > maxSize) {
    return {
      valid: false,
      message: `文件大小不能超过 ${maxSizeMB}MB`
    }
  }
  return { valid: true, message: '' }
}

/**
 * 验证文件类型
 * @param {File} file - 文件对象
 * @param {Array} allowedTypes - 允许的文件类型数组
 * @returns {Object} {valid: boolean, message: string}
 */
export function validateFileType(file, allowedTypes = []) {
  if (allowedTypes.length === 0) return { valid: true, message: '' }
  
  const fileType = file.type
  const isAllowed = allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      return fileType.startsWith(type.replace('/*', ''))
    }
    return fileType === type
  })
  
  if (!isAllowed) {
    return {
      valid: false,
      message: `不支持的文件类型: ${fileType}`
    }
  }
  
  return { valid: true, message: '' }
}

/**
 * 下载文件
 * @param {Blob} blob - 文件Blob
 * @param {string} fileName - 文件名
 */
export function downloadBlob(blob, fileName) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName || 'download'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * 读取文件为Base64
 * @param {File} file - 文件对象
 * @returns {Promise<string>} Base64字符串
 */
export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 压缩图片
 * @param {File} file - 图片文件
 * @param {Object} options - 压缩选项 {maxWidth, maxHeight, quality}
 * @returns {Promise<Blob>} 压缩后的图片Blob
 */
export function compressImage(file, options = {}) {
  const { maxWidth = 1920, maxHeight = 1080, quality = 0.8 } = options
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        
        // 计算缩放比例
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
        }
        
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(resolve, file.type, quality)
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
