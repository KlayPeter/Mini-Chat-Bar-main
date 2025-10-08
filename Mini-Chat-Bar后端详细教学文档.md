# Mini Chat Bar 后端详细教学文档

## 项目概述

Mini Chat Bar 是一个基于 Node.js + Express + Socket.IO + MongoDB 的实时聊天应用后端系统。该系统支持用户注册登录、私聊、群聊、文件上传以及 AI 助手功能。

## 技术栈

- **运行环境**: Node.js
- **Web框架**: Express.js
- **数据库**: MongoDB (使用 Mongoose ODM)
- **实时通信**: Socket.IO
- **身份验证**: JWT (JSON Web Token)
- **密码加密**: bcrypt
- **文件上传**: multer
- **AI集成**: DeepSeek API
- **跨域处理**: CORS

## 项目结构详解

```
server/
├── .env                    # 环境变量配置
├── server.js              # 主服务器入口文件
├── package.json           # 项目依赖配置
├── config/
│   └── db.js              # 数据库连接配置
├── models/                # 数据模型定义
│   ├── Users.js           # 用户模型
│   ├── Messages.js        # 消息模型
│   ├── Room.js            # 房间模型
│   └── Contacts.js        # 联系人模型
├── middlewares/           # 中间件
│   └── auth.js            # JWT认证中间件
├── routes/                # 路由处理
│   ├── user.js            # 用户相关路由
│   ├── chat.js            # 聊天相关路由
│   ├── room.js            # 房间相关路由
│   ├── upload.js          # 文件上传路由
│   └── ds.js              # AI助手路由
├── sockets/               # Socket.IO事件处理
│   ├── chat.js            # 私聊Socket处理
│   └── room.js            # 群聊Socket处理
└── initData.js            # 初始化测试数据
```

## 核心功能实现详解

### 1. 服务器启动与配置 (server.js)

```javascript
// 主要功能:
// 1. 加载环境变量
// 2. 创建Express应用和HTTP服务器
// 3. 配置Socket.IO
// 4. 连接数据库
// 5. 设置中间件和路由
// 6. 启动服务器

require('dotenv').config();  // 加载.env文件中的环境变量
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const connectDB = require('./config/db')
const group_msg = require('./sockets/room')
const private_msg = require("./sockets/chat")
const roomRouter = require('./routes/room')
const userRouter = require('./routes/user')
const chatRouter = require('./routes/chat')
const uploadRouter = require('./routes/upload')
const dsRouter = require("./routes/ds")
const auth = require("./middlewares/auth")

// 创建Express应用和HTTP服务器
const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

// 连接数据库
connectDB();

// 配置中间件
app.use(cors({ origin: '*' }))           // 允许跨域
app.use(express.json())                  // 解析JSON请求体
app.use(express.urlencoded({ extended: true }))  // 解析URL编码请求体

// 配置路由
app.use('/room', roomRouter)
app.use('/user', userRouter)
app.use("/chat", chatRouter)
app.use("/api", dsRouter)
app.use("/upload", uploadRouter)

// Socket.IO连接处理
io.on("connection", (socket) => {
  private_msg(socket, io)  // 处理私聊
  group_msg(socket, io)    // 处理群聊
})

// 启动服务器
server.listen(3000, () => {
    console.log('服务器正在运行在 http://localhost:3000');
});
```

### 2. 数据库连接配置 (config/db.js)

```javascript
// 使用Mongoose连接MongoDB数据库
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoUrl = process.env.MONGO_URL;  // 从环境变量获取数据库URL
        if (!mongoUrl) {
            console.error('错误: MONGO_URL 环境变量未设置!');
            process.exit(1);
        }
        await mongoose.connect(mongoUrl);
        console.log('MongoDB 连接成功!');
    } catch (err) {
        console.error('MongoDB 连接失败:', err);
        process.exit(1);
    }
};
```

### 3. 数据模型设计

#### 用户模型 (models/Users.js)
```javascript
const userSchema = new mongoose.Schema({
    uID: String,           // 用户唯一ID
    uAvatar: {             // 用户头像
        type: String,
        default: "/images/maodie.jpg"
    },
    uName: String,         // 用户名
    Password: String,      // 加密后的密码
    Friends: [{            // 好友列表
        uID: String
    }]
})
```

#### 消息模型 (models/Messages.js)
```javascript
const msgSchema = new mongoose.Schema({
    from: String,     // 发送者ID
    to: String,       // 接收者ID
    time: Date,       // 发送时间
    content: String,  // 消息内容
})
```

#### 房间模型 (models/Room.js)
```javascript
const roomSchema = new mongoose.Schema({
    RoomID: {type: Number, required: true, unique: true},  // 房间ID
    RoomName: {type: String, required: true},             // 房间名称
    Members: [{                                           // 房间成员
        Nickname: String,   // 昵称
        Avatar: String,     // 头像
        userID: String      // 用户ID
    }]
})
```

### 4. JWT身份验证中间件 (middlewares/auth.js)

```javascript
const jwt = require("jsonwebtoken")

function authMiddlewares(req, res, next) {
    // 从请求头获取token
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
        return res.status(401).json({ message: "未提供 Token" })
    }
    try {
        // 验证token并解码用户信息
        const decoded = jwt.verify(token, "MORTALKOMBAT")
        req.user = decoded  // 将用户信息附加到请求对象
        next()
    } catch (err) {
        return res.status(401).json({ message: "Token 无效或已过期" })
    }
}
```

### 5. 用户管理功能 (routes/user.js)

#### 用户注册
```javascript
router.post("/register", async (req, res) => {
    const { username, password } = req.body;
    try {
        // 检查用户名是否已存在
        const oldUser = await Users.findOne({ uName: username });
        if (oldUser) {
            res.status(409).json({ message: "用户名已存在,注册失败" });
        } else {
            // 生成唯一用户ID
            const uid = Date.now();
            // 使用bcrypt加密密码
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            // 创建新用户
            const newUser = new Users({
                uID: uid,
                uAvatar: "/images/maodie.jpg",
                uName: username,
                Password: hashedPassword,
                Friends: []
            });
            await newUser.save();
            res.status(200).json({ message: `新用户 ${username} 注册成功!` });
        }
    } catch (err) {
        console.error("注册失败", err);
        res.status(500).json({ message: "服务器内部错误" });
    }
})
```

#### 用户登录
```javascript
router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        // 查找用户
        const user = await Users.findOne({ uName: username });
        if (user) {
            // 验证密码
            const isMatch = await bcrypt.compare(password, user.Password);
            if (isMatch) {
                // 生成JWT token
                const token = jwt.sign(
                    { username, uid: user.uID, uava: user.uAvatar }, 
                    SECRET_KEY, 
                    { expiresIn: '7d' }
                );
                return res.json({ token });
            }
        }
        return res.status(401).json({ message: "用户名或密码错误" });
    } catch (err) {
        console.error("登录失败", err);
        res.status(500).json({ message: "服务器内部错误" });
    }
});
```

#### 添加好友
```javascript
router.post("/add", auth, async (req, res) => {
    try {
        const name = req.body.content
        const userid = req.user.uid
        const currentUser = await Users.findOne({ uID: userid })
        const new_friend = await Users.findOne({ uName: name })

        // 各种验证逻辑
        if (!new_friend) {
            return res.status(401).json({ message: "当前用户不存在" });
        }
        if (new_friend.uID === userid) {
            return res.status(400).json({ message: "不能添加自己为好友" })
        }
        if (friends.some(friend => friend.uID === new_friend.uID)) {
            return res.json({ message: "对方已经是您的好友!" })
        }

        // 双向添加好友关系
        await Users.findOneAndUpdate(
            { uID: userid },
            { $addToSet: { Friends: { uID: new_friend.uID } } }
        )
        await Users.findOneAndUpdate(
            { uID: new_friend.uID },
            { $addToSet: { Friends: { uID: userid } } }
        )

        res.json({ message: "好友添加成功!" })
    } catch (err) {
        res.status(500).json({ message: "服务端出错" })
    }
})
```

### 6. 聊天功能 (routes/chat.js)

#### 获取聊天记录
```javascript
router.get("/messages/:id", auth, async (req, res) => {
    const myId = req.user.uid
    const targetId = req.params.id
    try {
        // 查询两个用户之间的所有消息
        const messages = await Msg.find({
            $or: [
                { from: myId, to: targetId },
                { from: targetId, to: myId }
            ]
        }).sort({ time: 1 })  // 按时间升序排列
        res.json(messages)
    } catch (err) {
        res.status(401).json({ messages: "消息获取失败" })
    }
})
```

#### 发送消息
```javascript
router.post("/messages/:id", auth, async (req, res) => {
    const myId = req.user.uid
    const targetId = req.params.id
    const content = req.body.content
    try {
        // 创建新消息
        const new_mes = new Msg({
            from: myId,
            to: targetId,
            time: Date.now(),
            content: content
        })
        await new_mes.save()
        res.send("信息发送成功!")
    } catch (err) {
        res.status(500).json({ message: `信息发送失败：${err}` })
    }
})
```

### 7. Socket.IO 实时通信

#### 私聊功能 (sockets/chat.js)
```javascript
const users = new Map()  // 存储在线用户映射

module.exports = function(socket, io) {
    // 用户登录
    socket.on("login", (userId) => {
        socket.userId = userId
        users.set(userId, socket.id)  // 建立用户ID与socket ID的映射
    })

    // 私聊消息
    socket.on("private-message", ({to}) => {
        const targetId = users.get(to)
        if (targetId) {
            // 向目标用户发送消息通知
            io.to(targetId).emit('private-message', {from: socket.userId})
        }
    })

    // 文件消息
    socket.on("private-file-message", async ({ to, fileUrl, fileName, fileType }) => {
        const targetSocketId = users.get(to);
        if (targetSocketId) {
            io.to(targetSocketId).emit("private-file-message", {
                from: socket.userId,
                fileUrl,
                fileName,
                fileType,
            });
        }
    });

    // 用户断开连接
    socket.on("disconnect", async () => {
        // 清理用户映射
        for (const [userId, id] of users) {
            if (id === socket.id) {
                users.delete(userId)
                break
            }
        }
    });
};
```

#### 群聊功能 (sockets/room.js)
```javascript
module.exports = function(socket, io) {
    const avatars = ["🐔", "🐱", "🐮", "🐶", "🐹", "🐵", "🦊", "🐸"];
    const seats = Array.from({ length: 8 }, () => ({
        username: null,
        useravatar: "🪑",
        userID: null,
    }));

    // 用户加入房间
    socket.on("joinroom", ({ room, username }) => {
        socket.data.room = room;
        socket.data.username = username;

        // 分配座位
        const index = seats.findIndex(seat => seat.username === null);
        if (index !== -1) {
            seats[index].username = username;
            seats[index].useravatar = avatars[index];
            seats[index].userID = socket.id;
            
            socket.join(room);  // 加入Socket.IO房间
            io.emit("update", seats);  // 广播座位更新
            io.to(room).emit("notice", `用户 ${username} 进入房间`);
        } else {
            socket.emit("Full");  // 房间已满
        }
    });

    // 群聊消息
    socket.on("group-message", (msg, uname) => {
        io.to(socket.data.room).emit("group-message", { msg, uname });
    });

    // 用户离开房间
    socket.on("disconnect", async() => {
        // 释放座位
        const index = seats.findIndex(seat => seat.userID === socket.id);
        if (index !== -1) {
            seats[index] = { username: null, useravatar: "🪑", userID: null };
            io.emit("update", seats);
        }
        
        // 检查房间是否为空，如果为空则删除
        const roomID = socket.data.room
        const room = io.sockets.adapter.rooms.get(roomID);
        const roomSize = room ? room.size : 0;
        
        if (roomSize === 0) {
            await Room.deleteOne({ roomID: roomID });
        }
    });
};
```

### 8. 文件上传功能 (routes/upload.js)

```javascript
const multer = require('multer');
const path = require('path');

// 配置存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);  // 指定上传目录
    },
    filename: function (req, file, cb) {
        // 生成唯一文件名
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// 文件上传接口
router.post('/file', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: '未上传文件。' });
    }
    // 返回文件访问URL
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.status(200).json({ message: '文件上传成功', fileUrl: fileUrl });
});
```

### 9. AI助手功能 (routes/ds.js)

```javascript
const axios = require("axios");
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

router.post("/deepseek-chat", auth, async (req, res) => {
    const userQuestion = req.body.question;
    const user = req.user.username;

    try {
        // 调用DeepSeek API
        const response = await axios.post(
            DEEPSEEK_API_URL,
            {
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: `你是一个AI智能小助手...当前访问项目的用户是${user}`
                    },
                    { role: "user", content: userQuestion },
                ],
                temperature: 0.7,
                stream: false,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
                },
            }
        );

        const aiAnswer = response.data.choices[0]?.message?.content || "抱歉，我暂时无法回答您的问题。";
        res.json({ answer: aiAnswer });
    } catch (error) {
        console.error("调用 DeepSeek API 失败:", error);
        res.status(500).json({ error: "从 DeepSeek AI 获取响应失败" });
    }
});
```

## 环境配置

### .env 文件配置
```
PORT=3000
MONGO_URL=mongodb://localhost:27017/mini_chat_bar
DEEPSEEK_API_KEY="your_deepseek_api_key_here"
```

### package.json 依赖
```json
{
  "dependencies": {
    "axios": "^1.9.0",           // HTTP客户端
    "bcrypt": "^6.0.0",          // 密码加密
    "cors": "^2.8.5",            // 跨域处理
    "crypto-js": "^4.2.0",       // 加密工具
    "dotenv": "^16.5.0",         // 环境变量
    "express": "^5.1.0",         // Web框架
    "jsonwebtoken": "^9.0.2",    // JWT认证
    "mongoose": "^8.15.1",       // MongoDB ODM
    "multer": "^2.0.1",          // 文件上传
    "socket.io": "^4.8.1"        // 实时通信
  },
  "devDependencies": {
    "nodemon": "^3.1.10"         // 开发时自动重启
  }
}
```

## 数据流程图

### 用户认证流程
1. 用户注册 → 密码加密 → 存储到数据库
2. 用户登录 → 密码验证 → 生成JWT Token → 返回给客户端
3. 后续请求 → 携带Token → 中间件验证 → 解析用户信息

### 消息传递流程
1. 用户发送消息 → 存储到数据库 → Socket.IO实时推送给接收者
2. 群聊消息 → Socket.IO广播给房间内所有用户
3. 文件消息 → 上传文件 → 获取文件URL → 通过Socket.IO发送

### 房间管理流程
1. 创建房间 → 存储到数据库 → 房主加入
2. 用户加入 → 检查房间容量 → 分配座位 → 广播更新
3. 用户离开 → 释放座位 → 检查房间是否为空 → 自动删除空房间

## 安全特性

1. **密码安全**: 使用bcrypt进行密码哈希，防止明文存储
2. **JWT认证**: 使用JSON Web Token进行用户身份验证
3. **输入验证**: 对用户输入进行基本验证
4. **CORS配置**: 配置跨域资源共享
5. **环境变量**: 敏感信息通过环境变量管理

## 扩展建议

1. **数据验证**: 添加更严格的输入验证和数据校验
2. **错误处理**: 完善错误处理机制和日志记录
3. **性能优化**: 添加数据库索引，实现分页查询
4. **安全增强**: 添加请求频率限制，SQL注入防护
5. **监控告警**: 集成监控系统，实现性能监控
6. **缓存机制**: 使用Redis缓存热点数据
7. **消息队列**: 使用消息队列处理高并发场景

## 部署说明

1. **环境准备**: 安装Node.js和MongoDB
2. **依赖安装**: `npm install`
3. **环境配置**: 配置.env文件
4. **数据初始化**: 运行`node initData.js`
5. **启动服务**: `npm start` 或 `node server.js`
6. **开发模式**: `nodemon server.js`

## 总结

Mini Chat Bar 后端是一个功能完整的实时聊天系统，采用了现代化的技术栈和架构设计。系统具有良好的可扩展性和维护性，支持用户管理、实时通信、文件传输和AI集成等核心功能。通过合理的数据模型设计和Socket.IO的实时通信能力，为用户提供了流畅的聊天体验。