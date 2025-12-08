require('dotenv').config()
const express = require('express')
const http = require('http')
const path = require('path')
const { Server } = require('socket.io')
const cors = require('cors')

const connectDB = require('./config/db')
const group_msg = require('./sockets/room')
const private_msg = require('./sockets/chat')
const roomRouter = require('./routes/room')
const userRouter = require('./routes/user')
const chatRouter = require('./routes/chat')
const uploadRouter = require('./routes/upload')
const dsRouter = require('./routes/ds')
const auth = require('./middlewares/auth')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: true, // 开发环境允许所有源
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
})

connectDB()

// CORS 配置 - 使用更宽松的配置以解决跨域问题
const corsOptions = {
  origin: true, // 在开发环境允许所有源
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 200,
  preflightContinue: false,
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/room', roomRouter)
app.use('/api/user', userRouter)
app.use('/api/chat', chatRouter)
app.use('/api/upload', uploadRouter)
app.use('/api', dsRouter)

// 静态文件服务 - 提供上传的文件访问
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

io.on('connection', (socket) => {
  console.log('Socket.IO 客户端已连接:', socket.id)
  private_msg(socket, io)
  group_msg(socket, io)
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log('✓ 服务器正在运行在 http://localhost:' + PORT)
  console.log('✓ CORS 已启用（开发模式：允许所有源）')
  console.log('✓ Socket.IO 已启用，支持 websocket 和 polling 传输')
})
