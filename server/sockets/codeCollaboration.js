const { WebSocketServer } = require('ws')

const setupCodeCollaboration = (server) => {
  const wss = new WebSocketServer({ noServer: true })
  const rooms = new Map()

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

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set())
    }

    const room = rooms.get(roomId)
    room.add(ws)

    console.log(`✓ 用户加入代码协作房间: ${roomId}, 当前人数: ${room.size}`)

    // 通知房间内其他用户有新用户加入
    broadcastToRoom(room, ws, {
      type: 'user-joined',
      userCount: room.size,
      timestamp: Date.now()
    })

    ws.on('message', (message) => {
      try {
        room.forEach(client => {
          if (client !== ws && client.readyState === 1) {
            client.send(message)
          }
        })
      } catch (error) {
        console.error('消息转发失败:', error)
      }
    })

    ws.on('close', () => {
      room.delete(ws)
      console.log(`✗ 用户离开代码协作房间: ${roomId}, 剩余人数: ${room.size}`)

      // 通知房间内其他用户有用户离开
      broadcastToRoom(room, null, {
        type: 'user-left',
        userCount: room.size,
        timestamp: Date.now()
      })

      if (room.size === 0) {
        rooms.delete(roomId)
        console.log(`✓ 房间 ${roomId} 已清空并删除`)
      }
    })

    ws.on('error', (error) => {
      console.error(`WebSocket错误 (房间: ${roomId}):`, error)
    })
  })

  // 广播消息到房间内的所有客户端（排除发送者）
  function broadcastToRoom(room, sender, data) {
    const message = JSON.stringify(data)
    room.forEach(client => {
      if (client !== sender && client.readyState === 1) {
        try {
          client.send(message)
        } catch (error) {
          console.error('广播消息失败:', error)
        }
      }
    })
  }

  console.log('✓ 代码协作WebSocket服务已启动')
}

module.exports = setupCodeCollaboration
