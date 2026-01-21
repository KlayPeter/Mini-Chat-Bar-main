/**
 * 统一处理头像URL的工具函数
 * @param {string} avatarPath - 头像路径
 * @param {string} defaultAvatar - 默认头像路径（可选）
 * @returns {string} 处理后的头像URL
 */
export function getAvatarUrl(avatarPath, defaultAvatar = '/images/avatar/default-avatar.webp') {
  // 如果路径为空，返回默认头像
  if (!avatarPath) {
    return defaultAvatar
  }
  
  // 如果是完整的URL（http或https开头），直接返回
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath
  }
  
  // 如果是预设头像路径（/images/ 开头），直接返回（这些是前端静态资源）
  if (avatarPath.startsWith('/images/')) {
    return avatarPath
  }
  
  // 如果是上传的文件路径（/uploads/ 开头），拼接baseUrl
  if (avatarPath.startsWith('/uploads/')) {
    const baseUrl = import.meta.env.VITE_BASE_URL || ''
    return baseUrl + avatarPath
  }
  
  // 其他情况，尝试拼接baseUrl
  const baseUrl = import.meta.env.VITE_BASE_URL || ''
  return baseUrl + avatarPath
}

/**
 * 处理头像加载错误，显示默认头像
 * @param {Event} event - 图片错误事件
 * @param {string} defaultAvatar - 默认头像路径（可选）
 */
export function handleAvatarError(event, defaultAvatar = '/images/avatar/default-avatar.webp') {
  if (event.target.src !== defaultAvatar) {
    event.target.src = defaultAvatar
  }
}
