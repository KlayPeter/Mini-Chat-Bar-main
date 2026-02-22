const { WebSocketServer } = require('ws')
const Y = require('yjs')

const setupCodeCollaboration = (server) => {
  const wss = new WebSocketServer({ noServer: true })
  const docs = new Map()

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url, 'http://localhost').pathname

    if (pathname === '/code-collab') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request)
      })
    }
  })

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost')
    const roomId = url.searchParams.get('room') || 'default'

    if (!docs.has(roomId)) {
      docs.set(roomId, { doc: new Y.Doc(), clients: new Set() })
    }

    const room = docs.get(roomId)
    room.clients.add(ws)

    console.log(`✓ 用户加入代码协作房间: ${roomId}, 当前人数: ${room.clients.size}`)

    ws.on('message', (message) => {
      room.clients.forEach(client => {
        if (client !== ws && client.readyState === 1) {
          client.send(message)
        }
      })
    })

    ws.on('close', () => {
      room.clients.delete(ws)
      console.log(`✗ 用户离开代码协作房间: ${roomId}, 剩余人数: ${room.clients.size}`)

      if (room.clients.size === 0) {
        docs.delete(roomId)
      }
    })
  })

  console.log('✓ 代码协作WebSocket服务已启动')
}

module.exports = setupCodeCollaboration
