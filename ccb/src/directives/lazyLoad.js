/**
 * 图片懒加载指令
 * 使用 IntersectionObserver API 实现高性能懒加载
 */

// 默认占位图
const DEFAULT_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E加载中...%3C/text%3E%3C/svg%3E'

// 错误占位图
const ERROR_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f5f5f5" width="400" height="300"/%3E%3Ctext fill="%23ccc" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E加载失败%3C/text%3E%3C/svg%3E'

// 存储所有观察器
const observers = new WeakMap()

// 存储加载状态
const loadingStates = new WeakMap()

/**
 * 创建 IntersectionObserver
 * @param {HTMLElement} el - 图片元素
 * @param {Object} binding - 指令绑定对象
 */
function createObserver(el, binding) {
  const options = {
    root: binding.arg || null, // 可以指定滚动容器
    rootMargin: '50px', // 提前 50px 开始加载
    threshold: 0.01 // 1% 可见时触发
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadImage(el, binding)
        observer.unobserve(el)
      }
    })
  }, options)

  observer.observe(el)
  observers.set(el, observer)
}

/**
 * 加载图片
 * @param {HTMLElement} el - 图片元素
 * @param {Object} binding - 指令绑定对象
 */
function loadImage(el, binding) {
  const imageUrl = binding.value

  if (!imageUrl) {
    el.src = ERROR_PLACEHOLDER
    return
  }

  // 如果已经在加载中，不重复加载
  if (loadingStates.get(el) === 'loading') {
    return
  }

  loadingStates.set(el, 'loading')

  // 创建临时图片对象预加载
  const img = new Image()
  
  img.onload = () => {
    // 添加淡入动画
    el.style.opacity = '0'
    el.src = imageUrl
    
    // 使用 requestAnimationFrame 确保平滑过渡
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.3s ease-in-out'
      el.style.opacity = '1'
    })
    
    loadingStates.set(el, 'loaded')
    el.classList.add('lazy-loaded')
    el.classList.remove('lazy-loading', 'lazy-error')
  }

  img.onerror = () => {
    el.src = ERROR_PLACEHOLDER
    loadingStates.set(el, 'error')
    el.classList.add('lazy-error')
    el.classList.remove('lazy-loading')
  }

  el.classList.add('lazy-loading')
  img.src = imageUrl
}

/**
 * 懒加载指令
 */
export const lazyLoad = {
  mounted(el, binding) {
    // 设置占位图
    if (!el.src || el.src === '') {
      el.src = binding.modifiers.placeholder || DEFAULT_PLACEHOLDER
    }

    // 检查浏览器是否支持 IntersectionObserver
    if ('IntersectionObserver' in window) {
      createObserver(el, binding)
    } else {
      // 降级方案：直接加载
      loadImage(el, binding)
    }
  },

  updated(el, binding) {
    // 如果图片 URL 改变，重新加载
    if (binding.value !== binding.oldValue) {
      const observer = observers.get(el)
      if (observer) {
        observer.unobserve(el)
      }
      
      el.src = binding.modifiers.placeholder || DEFAULT_PLACEHOLDER
      loadingStates.delete(el)
      
      if ('IntersectionObserver' in window) {
        createObserver(el, binding)
      } else {
        loadImage(el, binding)
      }
    }
  },

  unmounted(el) {
    // 清理观察器
    const observer = observers.get(el)
    if (observer) {
      observer.unobserve(el)
      observer.disconnect()
      observers.delete(el)
    }
    
    loadingStates.delete(el)
  }
}

/**
 * 背景图懒加载指令
 */
export const lazyBackground = {
  mounted(el, binding) {
    const options = {
      root: binding.arg || null,
      rootMargin: '50px',
      threshold: 0.01
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const imageUrl = binding.value
          
          if (imageUrl) {
            // 预加载图片
            const img = new Image()
            img.onload = () => {
              el.style.backgroundImage = `url(${imageUrl})`
              el.classList.add('lazy-loaded')
            }
            img.onerror = () => {
              el.classList.add('lazy-error')
            }
            img.src = imageUrl
          }
          
          observer.unobserve(el)
        }
      })
    }, options)

    observer.observe(el)
    observers.set(el, observer)
  },

  unmounted(el) {
    const observer = observers.get(el)
    if (observer) {
      observer.unobserve(el)
      observer.disconnect()
      observers.delete(el)
    }
  }
}

export default {
  install(app) {
    app.directive('lazy', lazyLoad)
    app.directive('lazy-bg', lazyBackground)
  }
}
