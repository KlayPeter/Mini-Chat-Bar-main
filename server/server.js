require('dotenv').config()
const express = require('express')
const http = require('http')
const path = require('path')
const { Server } = require('socket.io')
const cors = require('cors')
const session = require('express-session')

// 网络配置 - 解决OAuth API连接问题
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0' // 临时禁用TLS验证
process.env.HTTPS_PROXY = process.env.HTTPS_PROXY || ''
process.env.HTTP_PROXY = process.env.HTTP_PROXY || ''

const passport = require('./config/passport')

const connectDB = require('./config/db')
const group_msg = require('./sockets/room')
const private_msg = require('./sockets/chat')
console.log('开始导入路由模块...')
const roomRouter = require('./routes/room')
console.log('Room路由导入成功')
const userRouter = require('./routes/user')
console.log('User路由导入成功')
const chatRouter = require('./routes/chat')
console.log('Chat路由导入成功')
const uploadRouter = require('./routes/upload')
console.log('Upload路由导入成功')
const dsRouter = require('./routes/ds')
console.log('DS路由导入成功')
const authRouter = require('./routes/auth')
console.log('Auth路由导入成功')
const agentRouter = require('./routes/agent')
console.log('Agent路由导入成功')
const auth = require('./middlewares/auth')
console.log('Auth中间件导入成功')

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

// Session 配置 - OAuth登录需要
app.use(session({
  secret: 'MORTALKOMBAT_OAUTH_SECRET',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // 开发环境设为false，生产环境应设为true
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
}))

// 初始化 Passport
app.use(passport.initialize())
app.use(passport.session())

app.use('/room', roomRouter)
app.use('/api/user', userRouter)
app.use('/api/chat', chatRouter)
app.use('/api/upload', uploadRouter)
app.use('/api', dsRouter)
app.use('/auth', authRouter)
app.use('/api/agent', agentRouter)

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
