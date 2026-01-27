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
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      let mimeType = 'audio/webm;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/ogg;codecs=opus'
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''
          }
        }
      }
      
      const options = mimeType ? { mimeType } : {}
      mediaRecorder = new MediaRecorder(stream, options)
      
      audioChunks = []
      recordingTime.value = 0
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' })
        audioBlob.value = blob
      }
      
      mediaRecorder.start()
      isRecording.value = true
      
      timerInterval = setInterval(() => {
        recordingTime.value++
      }, 1000)
      
      return true
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        alert('麦克风权限被拒绝，请在浏览器设置中允许访问麦克风')
      } else if (error.name === 'NotFoundError') {
        alert('未找到麦克风设备，请检查设备连接')
      } else {
        alert('无法访问麦克风: ' + error.message)
      }
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
