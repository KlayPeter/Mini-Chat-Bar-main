import { ref, createApp } from 'vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

// 全局确认弹窗实例
let confirmInstance = null

export function useConfirm() {
  
  function confirm(options = {}) {
    return new Promise((resolve) => {
      // 如果已有实例，先销毁
      if (confirmInstance) {
        confirmInstance.unmount()
        confirmInstance = null
      }

      // 创建容器
      const container = document.createElement('div')
      document.body.appendChild(container)

      // 创建确认弹窗实例
      confirmInstance = createApp(ConfirmDialog, {
        title: options.title || '确认',
        message: options.message || '确定要执行此操作吗？',
        confirmText: options.confirmText || '确定',
        cancelText: options.cancelText || '取消',
        onConfirm() {
          // 清理并返回确认结果
          cleanup()
          resolve(true)
        },
        onCancel() {
          // 清理并返回取消结果
          cleanup()
          resolve(false)
        }
      })

      // 挂载到容器
      const vm = confirmInstance.mount(container)
      
      // 显示弹窗
      vm.show()

      function cleanup() {
        if (confirmInstance) {
          confirmInstance.unmount()
          confirmInstance = null
        }
        if (container && container.parentNode) {
          container.parentNode.removeChild(container)
        }
      }
    })
  }

  return {
    confirm
  }
}
