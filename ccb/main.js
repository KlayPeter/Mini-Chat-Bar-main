import { app, BrowserWindow, Menu, shell, protocol, Tray, ipcMain, nativeImage, screen } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFile } from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDev = process.env.NODE_ENV === 'development';

// 保持对窗口对象的全局引用，如果不这么做的话，当JavaScript对象被
// 垃圾回收的时候，窗口会被自动地关闭
let mainWindow;

let tray = null; // 托盘变量
let flashInterval = null; // 闪烁定时器
let unreadCount = 0; // 未读消息数
let previewWindow = null; // 预览窗口
let previewTimeout = null; // 预览窗口延迟显示定时器
let recentMessages = []; // 最近的消息列表

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Mini Chat Bar',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'public/images/logo.png'), // 应用图标
    show: false, // 先不显示窗口，等加载完成后再显示
    titleBarStyle: 'default'
  });

  // 加载应用
  if (isDev) {
    // 开发环境：加载本地开发服务器
    mainWindow.loadURL('http://localhost:5173');
    // 打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境：使用自定义协议加载打包后的文件
    mainWindow.loadURL('app://./index.html');
  }

  // 当窗口准备好显示时
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.setTitle('Mini Chat Bar');
    
    // 如果是开发环境，聚焦到窗口
    if (isDev) {
      mainWindow.focus();
    }
  });

  // 当窗口被关闭时发出
  mainWindow.on('closed', () => {
    // 取消引用 window 对象，如果你的应用支持多窗口的话，
    // 通常会把多个 window 对象存放在一个数组里面，
    // 与此同时，你应该删除相应的元素。
    // mainWindow = null;
    // 如果用户点击关闭按钮，不退出，只隐藏到托盘
  if (process.platform === 'win32') {
    event.preventDefault();
    mainWindow.hide();
  }
  });

  // 处理窗口导航
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    // 只允许导航到本地服务器、文件或自定义app协议
    if (parsedUrl.origin !== 'http://localhost:5173' && 
        !navigationUrl.startsWith('file://') && 
        !navigationUrl.startsWith('app://')) {
      event.preventDefault();
    }
  });

  // 处理新窗口创建
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // 阻止创建新窗口，在默认浏览器中打开链接
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 当窗口获得焦点时，停止闪烁并清除未读数
  mainWindow.on('focus', () => {
    stopFlashing();
    clearBadge();
  });
}

// 开始任务栏图标闪烁
function startFlashing() {
  if (flashInterval || !mainWindow) return;
  
  // Windows: 闪烁任务栏
  if (process.platform === 'win32') {
    mainWindow.flashFrame(true);
  }
  
  // macOS: 弹跳Dock图标
  if (process.platform === 'darwin') {
    app.dock.bounce('critical');
  }
}

// 停止闪烁
function stopFlashing() {
  if (flashInterval) {
    clearInterval(flashInterval);
    flashInterval = null;
  }
  
  if (mainWindow && process.platform === 'win32') {
    mainWindow.flashFrame(false);
  }
}

// 设置badge（未读消息数）
function setBadge(count) {
  unreadCount = count;
  
  if (process.platform === 'win32' && mainWindow) {
    // Windows: 设置overlay图标（任务栏右下角的小图标）
    if (count > 0) {
      // 创建一个16x16的红色圆点图标
      const size = 16;
      const canvas = Buffer.from(
        `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#ff4444"/>
          <text x="${size/2}" y="${size/2}" text-anchor="middle" dy=".3em" font-family="Arial" font-size="10" font-weight="bold" fill="white">${count > 99 ? '99+' : count}</text>
        </svg>`
      );
      
      const overlayIcon = nativeImage.createFromBuffer(canvas);
      mainWindow.setOverlayIcon(overlayIcon, `${count} 条未读消息`);
    } else {
      mainWindow.setOverlayIcon(null, '');
    }
  } else if (process.platform === 'darwin') {
    // macOS: 设置Dock badge
    app.dock.setBadge(count > 0 ? count.toString() : '');
  }
  
  // 更新托盘图标提示
  if (tray) {
    tray.setToolTip(count > 0 ? `Mini Chat Bar (${count} 条未读)` : 'Mini Chat Bar');
  }
}

// 清除badge
function clearBadge() {
  setBadge(0);
  
  // 同时清除Windows的overlay图标
  if (process.platform === 'win32' && mainWindow) {
    mainWindow.setOverlayIcon(null, '');
  }
}

// 创建托盘预览窗口
function createPreviewWindow() {
  if (previewWindow) return;
  
  previewWindow = new BrowserWindow({
    width: 280,
    height: 100, // 初始高度，会动态调整
    show: false,
    frame: false,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js') // 添加 preload 脚本
    }
  });
  
  updatePreviewContent();
  
  // 临时：打开开发者工具调试
  if (isDev) {
    previewWindow.webContents.openDevTools({ mode: 'detach' });
  }
  
  // 鼠标离开预览窗口时立即隐藏（像微信一样）
  previewWindow.on('blur', () => {
    if (previewWindow) {
      previewWindow.hide();
    }
  });
}

// 更新预览窗口内容
function updatePreviewContent() {
  if (!previewWindow) return;
  
  // 只显示有未读消息的聊天
  const unreadMessages = recentMessages.filter(msg => msg.count > 0);
  
  let messagesHTML = '';
  
  if (unreadMessages.length > 0) {
    messagesHTML = unreadMessages.slice(0, 5).map((msg, index) => {
      // 找到原始索引
      const originalIndex = recentMessages.indexOf(msg);
      return `
      <div class="message-item" onclick="window.openChat('${msg.userId}', '${msg.type}', ${originalIndex})">
        <div class="avatar-container">
          ${msg.avatar ? 
            `<img src="${msg.avatar}" class="avatar" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><rect width=%2240%22 height=%2240%22 fill=%22%23${msg.type === 'group' ? '2196F3' : '4CAF50'}%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22white%22 font-size=%2218%22>${msg.from.charAt(0)}</text></svg>'"/>` :
            `<div class="avatar-placeholder ${msg.type === 'group' ? 'group' : ''}">${msg.from.charAt(0)}</div>`
          }
          <div class="badge">${msg.count > 99 ? '99+' : msg.count}</div>
        </div>
        <div class="message-info">
          <div class="message-from">${msg.from}</div>
          <div class="message-type">${msg.type === 'group' ? '[群聊]' : '[私聊]'}</div>
        </div>
      </div>
    `}).join('');
  } else {
    messagesHTML = '<div class="no-messages">暂无新消息</div>';
  }
  
  // 动态计算窗口高度
  const headerHeight = 50; // 标题栏高度
  const itemHeight = 64; // 每个消息项高度
  const padding = 24; // 上下padding
  const noMessageHeight = 100; // 无消息时的高度
  
  const contentHeight = unreadMessages.length > 0 
    ? headerHeight + (unreadMessages.length * itemHeight) + padding
    : noMessageHeight;
  
  // 设置窗口高度
  if (previewWindow) {
    previewWindow.setSize(280, contentHeight);
  }
  
  const previewHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Microsoft YaHei', Arial, sans-serif;
          background: rgba(255, 255, 255, 0.98);
          color: #333;
          padding: 12px;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          border: 1px solid rgba(0,0,0,0.1);
        }
        .header {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(0,0,0,0.08);
          color: #333;
        }
        .message-item {
          display: flex;
          align-items: center;
          padding: 8px;
          margin-bottom: 6px;
          background: rgba(0,0,0,0.02);
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .message-item:hover {
          background: rgba(0,0,0,0.08);
        }
        .avatar-container {
          position: relative;
          margin-right: 10px;
          flex-shrink: 0;
        }
        .avatar, .avatar-placeholder {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }
        .avatar-placeholder {
          background: #4CAF50;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: bold;
          color: white;
        }
        .avatar-placeholder.group {
          background: #2196F3;
        }
        .badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ff4444;
          color: white;
          font-size: 10px;
          font-weight: bold;
          padding: 2px 5px;
          border-radius: 10px;
          min-width: 18px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .message-info {
          flex: 1;
          overflow: hidden;
        }
        .message-from {
          font-size: 13px;
          font-weight: 500;
          color: #333;
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .message-type {
          font-size: 11px;
          color: #999;
        }
        .no-messages {
          text-align: center;
          color: #999;
          padding: 30px 10px;
          font-size: 12px;
        }
      </style>
      <script>
        window.openChat = function(userId, type, index) {
          console.log('预览窗口点击:', { userId, type, index });
          // 使用 electronAPI（通过 preload 脚本暴露）
          if (window.electronAPI && window.electronAPI.send) {
            window.electronAPI.send('open-chat-from-notification', { userId, type, index });
          } else {
            console.error('electronAPI 不可用');
          }
        }
        
        // 测试 electronAPI 是否可用
        console.log('electronAPI 可用:', !!window.electronAPI);
      </script>
    </head>
    <body>
      <div class="header">Mini Chat Bar${unreadCount > 0 ? ` (${unreadCount})` : ''}</div>
      ${messagesHTML}
    </body>
    </html>
  `;
  
  previewWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(previewHTML));
}

// 显示托盘预览
function showTrayPreview() {
  if (!previewWindow) {
    createPreviewWindow();
  } else {
    updatePreviewContent(); // 更新内容
  }
  
  // 获取托盘图标位置和屏幕信息
  const bounds = tray.getBounds();
  const display = screen.getPrimaryDisplay();
  const screenHeight = display.bounds.height; // 屏幕总高度
  const workArea = display.workArea; // 工作区域（不包括任务栏）
  const taskbarHeight = screenHeight - workArea.height; // 任务栏高度
  const windowSize = previewWindow.getSize();
  const windowWidth = windowSize[0];
  const windowHeight = windowSize[1];
  
  // Windows 任务栏通常在底部
  // 计算位置：在任务栏上方，水平居中对齐托盘图标
  const x = Math.round(bounds.x + (bounds.width / 2) - (windowWidth / 2));
  const y = screenHeight - taskbarHeight - windowHeight - 5; // 任务栏上方，留5px间距
  
  console.log('预览窗口位置:', { x, y, screenHeight, taskbarHeight, windowHeight });
  
  previewWindow.setPosition(x, y);
  previewWindow.show();
}

// 隐藏托盘预览
function hideTrayPreview() {
  if (previewWindow && previewWindow.isVisible()) {
    previewWindow.hide();
  }
}


// IPC通信：接收渲染进程的消息
ipcMain.on('new-message', (event, count) => {
  console.log('主进程收到新消息通知, 未读数:', count, '窗口焦点:', mainWindow.isFocused());
  
  // 临时测试：总是闪烁（不管窗口焦点）
  startFlashing();
  setBadge(count);
});

ipcMain.on('clear-badge', () => {
  console.log('主进程清除badge');
  clearBadge();
  stopFlashing();
});

// 接收最近消息数据
ipcMain.on('update-recent-messages', (event, messages) => {
  recentMessages = messages;
  if (previewWindow) {
    updatePreviewContent();
  }
});

// 处理从通知打开聊天
ipcMain.on('open-chat-from-notification', (event, data) => {
  console.log('🔔 主进程收到打开聊天请求:', data);
  const { userId, type, index } = data;
  
  // 显示并聚焦主窗口
  if (mainWindow) {
    console.log('📱 显示主窗口');
    mainWindow.show();
    mainWindow.focus();
    
    // 发送消息给渲染进程，让它打开对应的聊天
    console.log('📤 发送 open-chat 事件到渲染进程:', { userId, type });
    mainWindow.webContents.send('open-chat', { userId, type });
    
    // 从列表中移除已读的消息
    if (index !== undefined && recentMessages[index]) {
      recentMessages.splice(index, 1);
      // 重新计算未读数
      unreadCount = recentMessages.reduce((sum, msg) => sum + (msg.count || 0), 0);
      setBadge(unreadCount);
      updatePreviewContent();
    }
  }
  
  // 隐藏预览窗口
  hideTrayPreview();
});

// 在app ready之前注册协议为特权协议
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      allowServiceWorkers: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
]);

// 创建托盘图标函数
function createTray() {
  // 托盘图标路径（建议放在项目的 build 或 assets 目录）
  const iconPath = path.join(__dirname, 'public/images/logo.png');

  // 创建托盘对象
  tray = new Tray(iconPath);

  // 鼠标悬停提示
  tray.setToolTip('Mini Chat Bar');

  tray.displayBalloon({
  icon: iconPath,
  title: '提示',
  content: 'Mini Chat Bar 正在后台运行'
});

  // 托盘右键菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开 Mini Chat Bar',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: '退出应用',
      click: () => {
        app.quit();
      }
    }
  ]);

  // 设置菜单
  tray.setContextMenu(contextMenu);

  // 点击托盘图标时显示/隐藏主窗口
  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  
  // 鼠标悬停在托盘图标上时显示预览
  tray.on('mouse-move', () => {
    // 清除之前的定时器
    if (previewTimeout) {
      clearTimeout(previewTimeout);
    }
    
    // 延迟300ms显示预览窗口（微信风格）
    previewTimeout = setTimeout(() => {
      showTrayPreview();
    }, 300);
  });
  
  // 鼠标离开托盘区域时取消显示
  tray.on('mouse-leave', () => {
    if (previewTimeout) {
      clearTimeout(previewTimeout);
      previewTimeout = null;
    }
  });
}

// Electron 会在初始化后并准备创建浏览器窗口时，调用这个函数。
// 部分 API 在 ready 事件触发后才能使用。
app.whenReady().then(() => {
  // 设置Windows任务栏显示的应用名称
  if (process.platform === 'win32') {
    app.setAppUserModelId('Mini Chat Bar');
  }
  
  // 注册自定义协议来处理静态资源
  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    // 在打包后的环境中，资源文件位于不同的位置
    const filePath = isDev 
      ? path.join(__dirname, 'dist-new', url.pathname)
      : path.join(__dirname, 'dist-new', url.pathname === '/' ? 'index.html' : url.pathname);
    
    try {
      const data = await readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      // 根据文件扩展名设置正确的MIME类型
      let mimeType = 'application/octet-stream';
      switch (ext) {
        case '.html': mimeType = 'text/html'; break;
        case '.css': mimeType = 'text/css'; break;
        case '.js': mimeType = 'application/javascript'; break;
        case '.png': mimeType = 'image/png'; break;
        case '.jpg': case '.jpeg': mimeType = 'image/jpeg'; break;
        case '.gif': mimeType = 'image/gif'; break;
        case '.svg': mimeType = 'image/svg+xml'; break;
        case '.webp': mimeType = 'image/webp'; break;
        case '.ico': mimeType = 'image/x-icon'; break;
        case '.mp4': mimeType = 'video/mp4'; break;
        case '.webm': mimeType = 'video/webm'; break;
      }
      
      return new Response(data, {
        headers: { 'Content-Type': mimeType }
      });
    } catch (error) {
      console.error('Failed to load resource:', filePath, error);
      return new Response('Not Found', { status: 404 });
    }
  });
  
  createWindow();

  createTray();

  // 在 macOS 上，当点击 dock 图标并且没有其他窗口打开时，
  // 通常在应用程序中重新创建一个窗口。
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // 设置应用菜单
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: '切换开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: '切换全屏', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: '关闭', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
});

// 当全部窗口关闭时退出。
app.on('window-all-closed', () => {
  // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
  // 否则绝大部分应用及其菜单栏会保持激活。
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 安全设置：阻止新窗口创建
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    // 阻止创建新窗口
    event.preventDefault();
    
    // 在默认浏览器中打开链接
    shell.openExternal(navigationUrl);
  });
});

// 处理证书错误
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith('http://localhost:')) {
    // 对于本地开发服务器，忽略证书错误
    event.preventDefault();
    callback(true);
  } else {
    // 对于其他URL，使用默认行为
    callback(false);
  }
});
