# Mini Chat Bar

一个基于 Vue.js + Node.js + WebSocket 的实时聊天应用。

## 项目结构

```
Mini-Chat-Bar/
├── ccb/                    # 前端项目 (Vue.js + Electron)
│   ├── src/               # Vue.js 源代码
│   ├── public/            # 静态资源
│   ├── package.json       # 前端依赖
│   └── vite.config.js     # Vite 配置
├── server/                # 后端项目 (Node.js + Express)
│   ├── models/            # 数据模型
│   ├── routes/            # API 路由
│   ├── sockets/           # WebSocket 处理
│   ├── config/            # 数据库配置
│   └── package.json       # 后端依赖
└── assets/                # 项目截图和文档
```

## 功能特性

- 实时聊天消息
- 文件上传分享
- 用户认证系统
- 聊天室管理
- 联系人管理
- Electron 桌面应用

## 技术栈

### 前端
- Vue.js 3
- Vite
- Electron
- WebSocket Client

### 后端
- Node.js
- Express.js
- Socket.io
- Sequelize ORM
- MySQL

## 快速开始

### 后端启动
```bash
cd server
npm install
npm start
```

### 前端启动
```bash
cd ccb
npm install
npm run dev
```

### Electron 应用
```bash
cd ccb
npm run electron:dev
```

## 环境要求

- Node.js >= 14.0.0
- MySQL >= 5.7
- npm >= 6.0.0

## 许可证

MIT License