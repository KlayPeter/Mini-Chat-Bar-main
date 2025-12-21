import { createApp } from 'vue'
import Toast from '../components/Toast.vue'

class ToastManager {
  constructor() {
    this.toastApp = null
    this.toastContainer = null
  }

  createContainer() {
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div')
      this.toastContainer.id = 'toast-container-root'
      document.body.appendChild(this.toastContainer)
    }
  }

  show(message, type = 'info', duration = 3000) {
    this.createContainer()

    // 卸载之前的toast
    if (this.toastApp) {
      this.toastApp.unmount()
    }

    // 创建新的toast应用
    this.toastApp = createApp(Toast, {
      message,
      type,
      duration,
      onClose: () => {
        setTimeout(() => {
          if (this.toastApp) {
            this.toastApp.unmount()
            this.toastApp = null
          }
        }, 300)
      }
    })

    // 挂载
    const mountPoint = document.createElement('div')
    this.toastContainer.appendChild(mountPoint)
    const instance = this.toastApp.mount(mountPoint)

    // 显示toast
    if (instance && instance.show) {
      instance.show()
    }

    return instance
  }

  success(message, duration = 3000) {
    return this.show(message, 'success', duration)
  }

  error(message, duration = 3000) {
    return this.show(message, 'error', duration)
  }

  warning(message, duration = 3000) {
    return this.show(message, 'warning', duration)
  }

  info(message, duration = 3000) {
    return this.show(message, 'info', duration)
  }
}

// 创建单例
const toastManager = new ToastManager()

export function useToast() {
  return toastManager
}
