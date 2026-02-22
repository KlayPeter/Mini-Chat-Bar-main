// 检测文本中的URL
export function extractUrls(text) {
  if (!text) return []

  const urlRegex = /(https?:\/\/[^\s]+)/g
  const matches = text.match(urlRegex)
  if (!matches) return []

  // 移除URL末尾的标点符号
  return matches.map(url => url.replace(/[.,;:!?)]+$/, ''))
}

// 检查文本是否包含URL
export function hasUrl(text) {
  return extractUrls(text).length > 0
}
