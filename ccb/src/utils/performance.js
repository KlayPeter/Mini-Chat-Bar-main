/**
 * 防抖函数 - 延迟执行，多次触发只执行最后一次
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 延迟时间（毫秒）
 * @param {boolean} immediate - 是否立即执行
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait = 300, immediate = false) {
  let timeout
  
  return function executedFunction(...args) {
    const context = this
    
    const later = () => {
      timeout = null
      if (!immediate) func.apply(context, args)
    }
    
    const callNow = immediate && !timeout
    
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    
    if (callNow) func.apply(context, args)
  }
}

/**
 * 节流函数 - 限制执行频率，固定时间内只执行一次
 * @param {Function} func - 要执行的函数
 * @param {number} limit - 时间间隔（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit = 300) {
  let inThrottle
  let lastFunc
  let lastRan
  
  return function executedFunction(...args) {
    const context = this
    
    if (!inThrottle) {
      func.apply(context, args)
      lastRan = Date.now()
      inThrottle = true
    } else {
      clearTimeout(lastFunc)
      lastFunc = setTimeout(() => {
        if (Date.now() - lastRan >= limit) {
          func.apply(context, args)
          lastRan = Date.now()
        }
      }, Math.max(limit - (Date.now() - lastRan), 0))
    }
  }
}

/**
 * 请求防抖 - 防止重复请求
 * @param {Function} requestFunc - 请求函数
 * @param {number} wait - 延迟时间
 * @returns {Function} 防抖后的请求函数
 */
export function debounceRequest(requestFunc, wait = 500) {
  let timeout
  let lastRequest
  
  return async function(...args) {
    // 取消上一个请求
    if (lastRequest && typeof lastRequest.cancel === 'function') {
      lastRequest.cancel('Request cancelled due to new request')
    }
    
    return new Promise((resolve, reject) => {
      clearTimeout(timeout)
      
      timeout = setTimeout(async () => {
        try {
          lastRequest = requestFunc(...args)
          const result = await lastRequest
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }, wait)
    })
  }
}

/**
 * RAF 节流 - 使用 requestAnimationFrame 优化动画性能
 * @param {Function} func - 要执行的函数
 * @returns {Function} RAF 节流后的函数
 */
export function rafThrottle(func) {
  let rafId = null
  
  return function(...args) {
    const context = this
    
    if (rafId) return
    
    rafId = requestAnimationFrame(() => {
      func.apply(context, args)
      rafId = null
    })
  }
}

/**
 * 空闲时执行 - 使用 requestIdleCallback 在浏览器空闲时执行
 * @param {Function} func - 要执行的函数
 * @param {Object} options - 配置选项
 * @returns {Function} 包装后的函数
 */
export function idleCallback(func, options = {}) {
  const { timeout = 2000 } = options
  
  return function(...args) {
    const context = this
    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        func.apply(context, args)
      }, { timeout })
    } else {
      // 降级方案
      setTimeout(() => {
        func.apply(context, args)
      }, 0)
    }
  }
}

/**
 * 批量执行 - 将多次调用合并为一次批量执行
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间
 * @returns {Function} 批量执行函数
 */
export function batchExecute(func, wait = 100) {
  let queue = []
  let timeout = null
  
  return function(item) {
    queue.push(item)
    
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(queue)
      queue = []
      timeout = null
    }, wait)
  }
}
