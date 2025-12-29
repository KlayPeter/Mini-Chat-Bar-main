import { ref } from 'vue'

export function useAudioRecorder() {
  const isRecording = ref(false)
  const recordingTime = ref(0)
  const audioBlob = ref(null)
  
  let mediaRecorder = null
  let audioChunks = []
  let timerInterval = null
  let stream = null

  const startRecording = async () => {
    try {
      // 请求麦克风权限
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // 创建 MediaRecorder
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      audioChunks = []
      recordingTime.value = 0
      
      // 监听数据可用事件
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }
      
      // 监听停止事件
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' })
        audioBlob.value = blob
      }
      
      // 开始录音
      mediaRecorder.start()
      isRecording.value = true
      
      // 开始计时
      timerInterval = setInterval(() => {
        recordingTime.value++
      }, 1000)
      
      return true
    } catch (error) {
      console.error('启动录音失败:', error)
      alert('无法访问麦克风，请检查权限设置')
      return false
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && isRecording.value) {
      mediaRecorder.stop()
      isRecording.value = false
      
      // 停止计时
      if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
      }
      
      // 停止所有音频轨道
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        stream = null
      }
    }
  }

  const cancelRecording = () => {
    stopRecording()
    audioBlob.value = null
    recordingTime.value = 0
    audioChunks = []
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return {
    isRecording,
    recordingTime,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
    formatTime
  }
}
