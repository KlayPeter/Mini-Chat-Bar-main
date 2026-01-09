<template>
  <div class="box">
    <div class="main">
      <!-- 头部 -->
      <div class="header" @click="hideRoleMenu">
        <div class="header-left">
          <h4>AI智能助手</h4>
          <div class="role-selector">
            <button @click.stop="toggleRoleMenu" class="role-btn">
              {{ getCurrentRoleName() }}
              <span class="arrow">▼</span>
            </button>
            <div v-if="showRoleMenu" class="role-dropdown" @click.stop>
              <div 
                v-for="role in roles" 
                :key="role.key" 
                class="role-item"
                :class="{ active: selectedRole === role.key }"
                @click="selectRole(role.key)"
              >
                <span class="role-icon">{{ role.name.split(' ')[0] }}</span>
                <span class="role-name">{{ role.name.split(' ').slice(1).join(' ') }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="header-right">
          <button @click="clearHistory" class="delete-chat" title="清空历史">
            <img
              src="/images/icon/delete.png"
              alt="清空"
              style="width: 16px; height: 16px"
            />
          </button>
          <button class="off" @click="offmessage">
            <Xmark class="close-icon" />
          </button>
        </div>
      </div>

      <!-- 消息列表 -->
      <ChatMessageList
        ref="messageListRef"
        :messages="formattedMessages"
        :currentUserId="'user'"
        :myAvatar="userAvatar"
        :baseUrl="baseUrl"
        messageType="ai"
        :showAvatar="true"
        :showSenderName="false"
        :autoScroll="true"
        :isLoading="isLoading"
        :loadingMessage="loadingMessage"
        @preview-image="handlePreviewImage"
        @preview-video="handlePreviewVideo"
        @preview-file="handlePreviewFile"
        @play-voice="handlePlayVoice"
      />

      <!-- 输入区域 -->
      <ChatInput
        ref="chatInputRef"
        :placeholder="getPlaceholder()"
        :disabled="isLoading"
        :showEmojiButton="false"
        :showFileButton="false"
        :showVoiceButton="false"
        :showSearchButton="false"
        @send-message="handleSendMessage"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, computed } from "vue";
import axios from "axios";
import { Xmark } from '@iconoir/vue'
import ChatMessageList from '../components/chat/ChatMessageList.vue'
import ChatInput from '../components/chat/ChatInput.vue'
import { useToast } from '../composables/useToast';
import { useConfirm } from '../composables/useConfirm';

// 数据
const messages = ref([]);
const messageListRef = ref(null);
const chatInputRef = ref(null);
const isLoading = ref(false);
const selectedRole = ref("default");
const userAvatar = ref("");
const showRoleMenu = ref(false);
const baseUrl = import.meta.env.VITE_BASE_URL;
const toast = useToast();
const { confirm } = useConfirm();

// 计算属性 - 格式化消息用于ChatMessageList组件
const formattedMessages = computed(() => {
  return messages.value.map(msg => ({
    ...msg,
    messageType: 'text',
    // 确保AI消息有正确的头像
    avatar: msg.from === 'AI' ? getRoleAvatar() : userAvatar.value
  }))
});

// 加载消息
const loadingMessage = computed(() => ({
  from: 'AI',
  content: 'AI正在思考...',
  time: new Date().toISOString(),
  messageType: 'text',
  avatar: getRoleAvatar()
}));

// 事件处理函数
function handleSendMessage(messageData) {
  if (messageData && messageData.content && messageData.content.trim()) {
    send(messageData.content)
  }
}

function handlePreviewImage(fileInfo) {
  window.open(baseUrl + fileInfo.fileUrl, '_blank')
}

function handlePreviewVideo(fileInfo) {
  window.open(baseUrl + fileInfo.fileUrl, '_blank')
}

function handlePreviewFile(fileInfo) {
  window.open(baseUrl + fileInfo.fileUrl, '_blank')
}

function handlePlayVoice(fileInfo) {
  const audio = new Audio(baseUrl + fileInfo.fileUrl)
  audio.play().catch(err => {
    console.error('播放语音失败:', err)
    toast.error('播放语音失败')
  })
}

// 角色列表
const roles = ref([
  { key: 'default', name: ' AI助手' },
  { key: 'assistant', name: '专业助手' },
  { key: 'teacher', name: '耐心老师' },
  { key: 'friend', name: '贴心朋友' },
  { key: 'programmer', name: '程序员' },
  { key: 'writer', name: '专业作家' },
  { key: 'psychologist', name: '心理咨询师' }
]);

// 获取角色头像
const getRoleAvatar = () => {
  const avatarMap = {
    default: '/images/ds.jpg',
    assistant: '/images/ds.jpg',
    teacher: '/images/ds.jpg',
    friend: '/images/ds.jpg',
    programmer: '/images/ds.jpg',
    writer: '/images/ds.jpg',
    psychologist: '/images/ds.jpg'
  };
  return avatarMap[selectedRole.value] || '/images/ds.jpg';
};

// 获取占位符文本
const getPlaceholder = () => {
  const placeholderMap = {
    default: '问我任何问题...',
    assistant: '我可以帮你解决问题...',
    teacher: '有什么不懂的尽管问我...',
    friend: '想聊什么就说吧~',
    programmer: '遇到编程问题了吗？',
    writer: '需要写作帮助吗？',
    psychologist: '愿意倾听你的心声...'
  };
  return placeholderMap[selectedRole.value] || '输入消息...';
};

// 格式化消息（支持Markdown简单格式）
const formatMessage = (content) => {
  if (!content) return '';
  
  // 代码块
  content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  // 行内代码
  content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
  // 加粗
  content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // 换行
  content = content.replace(/\n/g, '<br>');
  
  return content;
};

// 格式化时间
const formatTime = (time) => {
  if (!time) return '';
  const date = new Date(time);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

// 加载对话历史
const loadHistory = async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(
      `${import.meta.env.VITE_BASE_URL}/api/conversation/history`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 50 }
      }
    );

    if (res.data.messages && res.data.messages.length > 0) {
      messages.value = res.data.messages.map(msg => ({
        from: msg.role === 'user' ? 'user' : 'AI',
        content: msg.content,
        time: msg.timestamp
      }));
      selectedRole.value = res.data.role || 'default';
    } else {
      // 显示欢迎消息
      messages.value = [{
        from: "AI",
        content: getWelcomeMessage(),
        time: new Date().toISOString()
      }];
    }
    
  } catch (err) {
    console.error("加载历史失败:", err);
    messages.value = [{
      from: "AI", 
      content: getWelcomeMessage(),
      time: new Date().toISOString()
    }];
  }
};

// 获取欢迎消息
const getWelcomeMessage = () => {
  const welcomeMap = {
    default: '你好！我是你的AI智能助手，有什么可以帮你的吗？',
    assistant: '您好！我是专业助手，随时为您提供帮助。',
    teacher: '同学你好！有什么问题想问老师吗？',
    friend: '嘿！朋友，想聊点什么？',
    programmer: 'Hello World! 有什么编程问题需要帮助吗？',
    writer: '你好！需要写作方面的帮助吗？我很乐意协助。',
    psychologist: '你好，很高兴见到你。想聊聊吗？'
  };
  return welcomeMap[selectedRole.value] || welcomeMap.default;
};

// 发送消息
const send = async (content) => {
  if (isLoading.value) return;
  
  if (!content || !content.trim()) {
    console.warn("输入内容不能为空！");
    return;
  }

  // 添加用户消息
  const userMessage = {
    from: "user",
    content: content,
    time: new Date().toISOString()
  };  messages.value.push(userMessage);
  
  // 清空输入框
  if (chatInputRef.value) {
    chatInputRef.value.clearInput();
  }

  isLoading.value = true;

  try {
    const token = localStorage.getItem("token");
    const res = await axios.post(
      `${import.meta.env.VITE_BASE_URL}/api/deepseek-chat`,
      {
        question: content,
        role: selectedRole.value
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000 // 30秒超时
      }
    );

    const aiAnswer = res.data.answer;
    messages.value.push({
      from: "AI",
      content: aiAnswer,
      time: new Date().toISOString()
    });
    
    // 确保AI回复后滚动到底部
    await nextTick()
    setTimeout(() => {
      if (messageListRef.value) {
        messageListRef.value.scrollToBottom()
      }
    }, 100)
    
  } catch (err) {
    console.error("发送消息失败:", err);
    let errorMsg = "抱歉，我现在遇到了一些问题，请稍后再试。";
    
    if (err.code === 'ECONNABORTED') {
      errorMsg = "请求超时了，请稍后重试。";
    } else if (err.response?.status === 500) {
      errorMsg = "服务器出了点问题，请稍后再试。";
    }
    
    messages.value.push({
      from: "AI",
      content: errorMsg,
      time: new Date().toISOString()
    });
    
    // 错误消息也需要滚动到底部
    await nextTick()
    setTimeout(() => {
      if (messageListRef.value) {
        messageListRef.value.scrollToBottom()
      }
    }, 100)
  } finally {
    isLoading.value = false;
  }
};

// 获取当前角色名称
const getCurrentRoleName = () => {
  const role = roles.value.find(r => r.key === selectedRole.value);
  return role ? role.name : '🤖 AI助手';
};

// 切换角色菜单显示
const toggleRoleMenu = () => {
  showRoleMenu.value = !showRoleMenu.value;
};

// 隐藏角色菜单
const hideRoleMenu = () => {
  showRoleMenu.value = false;
};

// 选择角色
const selectRole = async (roleKey) => {
  if (roleKey === selectedRole.value) {
    showRoleMenu.value = false;
    return;
  }
  
  const confirmed = await confirm({
    title: '切换角色',
    message: '切换角色将清空当前对话历史，确定要继续吗？'
  });
  
  if (confirmed) {
    try {
      selectedRole.value = roleKey;
      const token = localStorage.getItem("token");
      await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/conversation/role`,
        { role: selectedRole.value },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // 清空消息并显示新欢迎语
      messages.value = [{
        from: "AI",
        content: getWelcomeMessage(),
        time: new Date().toISOString()
      }];
      
      showRoleMenu.value = false;
    } catch (err) {
      console.error("切换角色失败:", err);
      alert("切换角色失败，请重试");
    }
  } else {
    showRoleMenu.value = false;
  }
};

// 清空历史
const clearHistory = async () => {
  const confirmed = await confirm({
    title: '清空历史',
    message: '确定要清空所有对话历史吗？'
  });
  
  if (!confirmed) return;
  
  try {
    const token = localStorage.getItem("token");
    await axios.delete(
      `${import.meta.env.VITE_BASE_URL}/api/conversation/history`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    messages.value = [{
      from: "AI",
      content: getWelcomeMessage(),
      time: new Date().toISOString()
    }];
  } catch (err) {
    console.error("清空历史失败:", err);
    alert("清空历史失败，请重试");
  }
};

// 获取用户头像
const getUserAvatar = async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/user/info`, {
      headers: { authorization: `Bearer ${token}` }
    });
    userAvatar.value = res.data.ava;
  } catch (err) {
    console.error("获取用户头像失败：", err);
  }
};

onMounted(async () => {
  await getUserAvatar();
  await loadHistory();
});

const emit = defineEmits(["closemessage"]);
const offmessage = () => {
  emit("closemessage");
};
</script>

<style scoped lang="scss">
.box {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.main {
  width: 100%;
  height: 100%;
  border: none;
  display: flex;
  flex-direction: column;
  background-color: #fff;

  .header {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 1px 1px 0px rgba(0, 0, 0, 0.1);
    padding: 0 20px;
    background-color: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
    min-height: 60px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 1;

      h4 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }

      .role-selector {
        position: relative;

        .role-btn {
          padding: 6px 12px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.3s;
          -webkit-app-region: no-drag;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #333;
          font-weight: 500;

          .arrow {
            font-size: 10px;
            transition: transform 0.3s;
          }

          &:hover {
            border-color: var(--primary-color);
            background: var(--hover-bg);
          }
        }

        .role-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          padding: 8px;
          min-width: 180px;
          z-index: 1000;
          animation: slideDown 0.2s ease;

          .role-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            color: #666;
            font-size: 14px;

            .role-icon {
              font-size: 18px;
            }

            .role-name {
              flex: 1;
            }

            &:hover {
              background: var(--active-bg);
              color: #333;
            }

            &.active {
              background: var(--active-bg);
              color: var(--primary-color);
              font-weight: 600;
            }
          }
        }
      }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;

      button {
        height: 36px;
        width: 36px;
        border: none;
        cursor: pointer;
        font-size: 16px;
        background-color: transparent;
        border-radius: 50%;
        transition: all 0.2s ease;
        -webkit-app-region: no-drag;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
      }
    }
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .middle {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-app-region: no-drag;
    padding: 20px;
    background-color: #f5f5f5;

    ul {
      padding: 0;
      margin: 0;
      list-style: none;

      .message {
        display: flex;
        flex-direction: column;
        padding-bottom: 10px;
        padding-top: 1vh;
        padding-left: 1vw;
        list-style-type: none;

        .message-time-header {
          text-align: center;
          font-size: 12px;
          color: #b2b2b2;
          margin: 8px 0 10px;
          padding: 2px 0;
        }

        .message-content-row {
          display: flex;
          flex-direction: row;
          align-items: flex-end;
          gap: 8px;
          padding: 0 10px;

          .avatar {
            width: 40px;
            height: 40px;
            aspect-ratio: 1/1;
            border-radius: 50%;
            overflow: hidden;
            flex-shrink: 0;
            order: 1;

            img {
              width: 100%;
              aspect-ratio: 1/1;
              object-fit: cover;
            }
          }

          .text {
            height: 100%;
            position: relative;
            flex: 9;
            display: flex;
            flex-direction: column;
            order: 2;

            .content {
              display: inline-block;
              background-color: #ffffff;
              color: #2c3e50;
              padding: 0.75rem 1.2rem;
              margin: 0 1vw 0.4rem;
              border-radius: 18px 18px 18px 4px;
              width: fit-content;
              max-width: 70%;
              word-wrap: break-word;
              word-break: break-word;
              font-size: 16px;
              line-height: 1.5;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
              border: 1px solid rgba(0, 0, 0, 0.04);

              :deep(code) {
                background: rgba(0, 0, 0, 0.05);
                padding: 2px 6px;
                border-radius: 3px;
                font-family: 'Courier New', monospace;
                font-size: 14px;
              }

              :deep(pre) {
                background: rgba(0, 0, 0, 0.03);
                padding: 12px;
                border-radius: 6px;
                overflow-x: auto;
                margin: 8px 0;

                code {
                  background: none;
                  padding: 0;
                }
              }

              :deep(strong) {
                font-weight: 600;
              }

              &.loading-dots {
                span {
                  animation: blink 1.4s infinite;

                  &:nth-child(1) { animation-delay: 0s; }
                  &:nth-child(2) { animation-delay: 0.2s; }
                  &:nth-child(3) { animation-delay: 0.4s; }
                }
              }
            }

            &.me {
              align-items: flex-end;

              .content {
                border-radius: 18px 18px 4px 18px;
                margin-right: 10px;
                background: var(--message-bg-user);
                color: var(--message-text-user);
                box-shadow: var(--shadow-primary);
              }
            }
          }

          &.my-message-row {
            justify-content: flex-end;

            .text {
              order: 1;
            }

            .avatar {
              order: 2;
              margin-left: 0;
              margin-right: 0;
            }
          }
        }
      }
    }
  }

  .bottom {
    flex: 0 0 auto;
    padding: 15px 20px;
    background-color: #fff;
    border-top: 1px solid #e9ecef;
    -webkit-app-region: no-drag;

    .input-area {
      display: flex;
      flex-direction: column;
      gap: 10px;

      textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        resize: none;
        min-height: 60px;
        max-height: 120px;
        font-size: 14px;
        font-family: inherit;
        line-height: 1.5;
        box-sizing: border-box;

        &:focus {
          outline: none;
          border-color: var(--primary-color);
        }

        &:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }
      }

      .toolbar {
        display: flex;
        justify-content: flex-end;
        gap: 10px;

        button {
          padding: 8px 20px;
          background-color: #e0e0e0;
          color: #666;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.3s;

          &:hover:not(:disabled) {
            background-color: #d0d0d0;
          }

          &:disabled {
            background-color: #f0f0f0;
            cursor: not-allowed;
            opacity: 0.5;
          }

          &.active {
            background-color: var(--primary-color);
            color: #fff;

            &:hover {
              background-color: var(--primary-light);
            }
          }
        }
      }
    }
  }
}

@keyframes blink {
  0%, 20%, 50%, 80%, 100% { opacity: 1; }
  40% { opacity: 0.3; }
  60% { opacity: 0.3; }
}

// 滚动条样式
.middle::-webkit-scrollbar {
  width: 6px;
}

.middle::-webkit-scrollbar-track {
  background: transparent;
}

.middle::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;

  &:hover {
    background: rgba(0, 0, 0, 0.3);
  }
}
</style>
