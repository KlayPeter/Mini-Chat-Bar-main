import { app, BrowserWindow, Menu, shell, protocol } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFile } from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDev = process.env.NODE_ENV === 'development';

// 保持对窗口对象的全局引用，如果不这么做的话，当JavaScript对象被
// 垃圾回收的时候，窗口会被自动地关闭
let mainWindow;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    icon: path.join(__dirname, 'build/icon.png'), // 应用图标
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
    mainWindow = null;
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
}

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

// Electron 会在初始化后并准备创建浏览器窗口时，调用这个函数。
// 部分 API 在 ready 事件触发后才能使用。
app.whenReady().then(() => {
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