import { io } from 'socket.io-client'

const socket = io(`${import.meta.env.VITE_BASE_URL}`, {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnectionDelayMax: 10000,
  autoConnect: true,
})

function waitForSocketConnection(callback) {
  // 如果有回调函数，使用原有逻辑
  if (typeof callback === 'function') {
    if (socket.connected) {
      callback()
    } else {
      socket.on('connect', () => {
        callback()
      })
    }
    return
  }
  
  // 如果没有回调函数，返回Promise（支持async/await）
  return new Promise((resolve) => {
    if (socket.connected) {
      resolve()
    } else {
      socket.on('connect', () => {
        resolve()
      })
    }
  })
}

export { socket, waitForSocketConnection }
