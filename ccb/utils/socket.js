import { io } from 'socket.io-client'

const socket = io(`${import.meta.env.VITE_BASE_URL}`, {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnectionDelayMax: 10000,
  autoConnect: true,
})

function waitForSocketConnection(callback) {
  if (socket.connected) {
    callback()
  } else {
    socket.on('connect', () => {
      callback()
    })
  }
}

export { socket, waitForSocketConnection }
