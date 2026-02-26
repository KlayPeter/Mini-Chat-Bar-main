# Coffee Chat Bar - Electron 桌面应用配置指南

## 项目概述

Coffee Chat Bar 现已支持 Electron 桌面应用，可以将 Web 应用打包成跨平台的桌面应用程序，支持 Windows、macOS 和 Linux 系统。

## 环境要求

- Node.js 16.0 或更高版本
- npm 或 yarn 包管理器
- 已配置好的前端开发环境
- 已启动的后端服务器（运行在 http://localhost:3000）
- MongoDB 数据库（运行在 mongodb://localhost:27017）

## 安装依赖

### 1. 安装 Electron 相关依赖

```bash
# 进入前端项目目录
cd ccb

# 安装所有依赖（包括 Electron）
npm install
```

**注意：** 如果遇到网络连接问题，可以使用国内镜像源：

```bash
npm config set registry https://registry.npmmirror.com
npm config set electron_mirror https://cdn.npmmirror.com/binaries/electron/
npm install
```

### 2. 验证安装

```bash
# 检查 Electron 版本
npx electron --version
```

## 项目结构

```
ccb/
├── main.js                 # Electron 主进程文件
├── preload.js              # 预加载脚本
├── package.json            # 项目配置文件
├── build/
│   └── icon.png           # 应用图标
├── dist-new/              # Vite 构建输出目录
├── release-new/           # Electron 打包输出目录
├── src/                   # Vue.js 源代码
└── public/                # 静态资源
```

## 启动命令

### 开发模式

#### 方式一：分别启动（推荐）

1. **启动后端服务器**
   ```bash
   # 在项目根目录
   cd server
   npm install
   nodemon server.js
   ```

2. **启动前端开发服务器**
   ```bash
   # 在新的终端窗口
   cd ccb
   npm run dev
   ```

3. **启动 Electron 应用**
   ```bash
   # 在新的终端窗口
   cd ccb
   npm run electron-dev
   ```

#### 方式二：直接启动 Electron

```bash
# 确保前端开发服务器已启动（http://localhost:5173）
cd ccb
npm run electron
```

### 生产模式

```bash
# 构建前端项目并启动 Electron
cd ccb
npm run build
npm run electron
```

## 打包构建

### 构建所有平台

```bash
cd ccb
npm run dist
```

### 构建特定平台

```bash
# Windows 平台
npm run dist-win

# macOS 平台
npm run dist-mac

# Linux 平台
npm run dist-linux
```

### 快速打包（包含构建）

```bash
npm run electron-pack
```

## 配置说明

### package.json 脚本说明

| 脚本命令 | 功能描述 |
|---------|----------|
| `npm run dev` | 启动前端开发服务器 |
| `npm run build` | 构建前端项目 |
| `npm run electron` | 启动 Electron 应用 |
| `npm run electron-dev` | 开发模式启动 Electron |
| `npm run electron-pack` | 构建并打包应用 |
| `npm run dist` | 构建并打包所有平台 |
| `npm run dist-win` | 构建并打包 Windows 版本 |
| `npm run dist-mac` | 构建并打包 macOS 版本 |
| `npm run dist-linux` | 构建并打包 Linux 版本 |

### Electron 配置

应用配置位于 `package.json` 的 `build` 字段：

```json
{
  "build": {
    "appId": "com.minichatbar.app",
    "productName": "Mini Chat Bar",
    "files": [
      "dist-new/**/*",
      "main.js",
      "preload.js",
      "package.json"
    ],
    "directories": {
      "buildResources": "build",
      "output": "release-new"
    },
    "win": {
      "target": ["portable"],
      "sign": false
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

## 应用特性

### 窗口配置
- **默认尺寸**: 1200x800 像素
- **最小尺寸**: 800x600 像素
- **图标**: 使用 `build/icon.png`
- **安全设置**: 启用上下文隔离，禁用 Node.js 集成

### 菜单功能
- 文件菜单：退出应用
- 编辑菜单：撤销、重做、剪切、复制、粘贴
- 视图菜单：重新加载、开发者工具、缩放控制、全屏切换
- 窗口菜单：最小化、关闭

### 安全特性
- 阻止不安全的外部链接
- 防止新窗口创建
- 上下文隔离保护
- 本地证书错误处理

## 常见问题

### 1. Electron 安装失败

**问题**: 网络连接超时或下载失败

**解决方案**:
```bash
# 使用国内镜像源
npm config set registry https://registry.npmmirror.com
npm config set electron_mirror https://cdn.npmmirror.com/binaries/electron/

# 重新安装
npm install electron --save-dev
```

### 2. 应用启动白屏

**问题**: Electron 应用启动后显示白屏

**解决方案**:
1. 确保前端开发服务器正在运行（http://localhost:5173）
2. 确保后端服务器正在运行（http://localhost:3000）
3. 检查控制台错误信息

### 3. 打包失败

**问题**: electron-builder 打包过程中出错

**解决方案**:
1. 确保已运行 `npm run build` 构建前端项目
2. 检查 `dist-new` 目录是否存在且包含构建文件
3. 确保有足够的磁盘空间

### 4. 图标不显示

**问题**: 应用图标不显示或显示默认图标

**解决方案**:
1. 确保 `build/icon.png` 文件存在
2. 图标建议尺寸：256x256 像素或更高
3. 支持格式：PNG、ICO（Windows）、ICNS（macOS）

## 开发建议

### 1. 开发流程
1. 先启动后端服务器
2. 启动前端开发服务器
3. 最后启动 Electron 应用
4. 修改代码后，前端会自动热重载，Electron 需要手动重启

### 2. 调试技巧
- 使用 `npm run electron-dev` 启动开发模式
- 按 F12 打开开发者工具
- 使用 `console.log` 在主进程和渲染进程中调试

### 3. 性能优化
- 生产环境关闭开发者工具
- 优化前端资源大小
- 使用 Electron 的预加载脚本

## 部署发布

### 1. 构建发布版本

```bash
# 构建前端项目
npm run build

# 打包 Electron 应用
npm run dist
```

### 2. 输出文件

打包完成后，可执行文件将生成在 `release-new` 目录中：

- **Windows**: `.exe` 便携版应用
- **macOS**: `.dmg` 磁盘映像
- **Linux**: `.AppImage` 或 `.deb` 包

### 3. 分发应用

- 将生成的安装包分发给用户
- 用户无需安装 Node.js 或其他依赖
- 应用包含完整的运行时环境

## 技术支持

如果在配置或使用过程中遇到问题，请检查：

1. Node.js 版本是否符合要求
2. 网络连接是否正常
3. 防火墙是否阻止了应用
4. 系统权限是否足够

---

**注意**: 本文档基于 Electron 36.8.1 版本编写，不同版本可能存在差异。建议查阅官方文档获取最新信息。