const { contextBridge, ipcRenderer } = require('electron');

// 安全地暴露IPC方法给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 通知主进程有新消息
  notifyNewMessage: (count) => {
    ipcRenderer.send('new-message', count);
  },
  
  // 清除badge
  clearBadge: () => {
    ipcRenderer.send('clear-badge');
  },
  
  // 更新最近消息列表
  updateRecentMessages: (messages) => {
    ipcRenderer.send('update-recent-messages', messages);
  },
  
  // 发送消息到主进程（用于预览窗口）
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  
  // 监听主进程消息
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  }
});
