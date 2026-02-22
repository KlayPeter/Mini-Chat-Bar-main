import { ref } from 'vue'
import axios from 'axios'

export function useLinkPreview() {
  const loading = ref(false)
  const previews = ref(new Map())

  async function fetchPreview(url) {
    if (previews.value.has(url)) {
      return previews.value.get(url)
    }

    loading.value = true
    try {
      const baseUrl = import.meta.env.VITE_BASE_URL
      const token = localStorage.getItem('token')

      const response = await axios.post(
        `${baseUrl}/api/link-preview/fetch`,
        { url },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.success) {
        previews.value.set(url, response.data.preview)
        return response.data.preview
      }
    } catch (err) {
      console.error('获取链接预览失败:', err)
      console.error('URL:', url)
      console.error('错误详情:', err.response?.data)
    } finally {
      loading.value = false
    }
    return null
  }

  return {
    loading,
    previews,
    fetchPreview
  }
}
