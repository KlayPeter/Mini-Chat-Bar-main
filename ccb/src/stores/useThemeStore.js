import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  // 主题列表
  const themes = ref([
    {
      key: 'classic-red',
      name: '经典红色',
      description: '温暖而经典的红色主题',
      preview: {
        primary: 'rgb(165, 42, 42)',
        bg: '#f9f9f9'
      }
    },
    {
      key: 'elegant-blue',
      name: '优雅蓝色',
      description: '清爽专业的蓝色主题',
      preview: {
        primary: '#1890ff',
        bg: '#f0f5ff'
      }
    },
    {
      key: 'fresh-green',
      name: '清新绿色',
      description: '自然活力的绿色主题',
      preview: {
        primary: '#52c41a',
        bg: '#f6ffed'
      }
    },
    {
      key: 'deep-purple',
      name: '深邃紫色',
      description: '神秘优雅的紫色主题',
      preview: {
        primary: '#722ed1',
        bg: '#f9f0ff'
      }
    },
    {
      key: 'warm-orange',
      name: '温暖橙色',
      description: '热情友好的橙色主题',
      preview: {
        primary: '#fa8c16',
        bg: '#fff7e6'
      }
    },
    {
      key: 'dark',
      name: '深色模式',
      description: '护眼舒适的深色主题',
      preview: {
        primary: '#177ddc',
        bg: '#141414'
      }
    }
  ])

  // 当前主题
  const currentTheme = ref(localStorage.getItem('app-theme') || 'classic-red')

  // 设置主题
  const setTheme = (themeKey) => {
    currentTheme.value = themeKey
    document.documentElement.setAttribute('data-theme', themeKey)
    localStorage.setItem('app-theme', themeKey)
  }

  // 获取当前主题信息
  const getCurrentThemeInfo = () => {
    return themes.value.find(t => t.key === currentTheme.value) || themes.value[0]
  }

  // 监听主题变化
  watch(currentTheme, (newTheme) => {
    document.documentElement.setAttribute('data-theme', newTheme)
  }, { immediate: true })

  // 初始化主题
  const initTheme = () => {
    const savedTheme = localStorage.getItem('app-theme') || 'classic-red'
    setTheme(savedTheme)
  }

  return {
    themes,
    currentTheme,
    setTheme,
    getCurrentThemeInfo,
    initTheme
  }
})
