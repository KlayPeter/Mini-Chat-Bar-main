// 简单的Electron通知管理器
class NotificationManager {
  constructor() {
    this.unreadCount = 0;
    this.recentMessages = [];
  }
  
  // 收到新消息
  onNewMessage(from, content, avatar, type = 'private', userId = null) {
    // 添加到最近消息列表
    const existingIndex = this.recentMessages.findIndex(msg => msg.from === from);
    
    if (existingIndex !== -1) {
      this.recentMessages[existingIndex].count++;
    } else {
      this.recentMessages.unshift({
        from: from || '未知用户',
        avatar: avatar || '',
        count: 1,
        type: type,
        userId: userId // 保存用户ID或群ID，用于点击跳转
      });
    }
    
    if (this.recentMessages.length > 5) {
      this.recentMessages = this.recentMessages.slice(0, 5);
    }
    
    this.unreadCount++;
    
    // 调用Electron API
    if (window.electronAPI) {
      window.electronAPI.notifyNewMessage(this.unreadCount);
      window.electronAPI.updateRecentMessages(this.recentMessages);
    }
  }
  
  // 清除通知
  clearNotifications() {
    this.unreadCount = 0;
    this.recentMessages = [];
    if (window.electronAPI) {
      window.electronAPI.clearBadge();
      window.electronAPI.updateRecentMessages([]);
    }
  }
}

export default new NotificationManager();
