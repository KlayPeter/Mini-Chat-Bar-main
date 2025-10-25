<template>
  <div class="box">
    <div class="main">
      <!-- 头部 -->
      <div class="top">
        <div class="title-section">
          <h3>🤖 AI智能助手</h3>
          <div class="role-selector">
            <select v-model="selectedRole" @change="handleRoleChange" class="role-select">
              <option v-for="role in roles" :key="role.key" :value="role.key">
                {{ role.name }}
              </option>
            </select>
          </div>
        </div>
        <div class="header-actions">
          <button @click="clearHistory" class="clear-btn" title="清空历史">
            🗑️
          </button>
          <button class="off" @click="offmessage">✖</button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div class="middle" ref="messageList">
        <ul>
          <li class="message" v-for="(message, index) in messages" :key="index">
            <div class="avatar" v-if="message.from === 'AI'">
              <img :src="getRoleAvatar()" alt="AI头像" />
            </div>
            <div class="text" :class="{ me: message.from === 'user' }">
              <div class="content" v-html="formatMessage(message.content)"></div>
              <div class="time">{{ formatTime(message.time) }}</div>
            </div>
            <div class="avatar" v-if="message.from === 'user'">
              <img :src="userAvatar || '/images/avatar/default-avatar.webp'" alt="用户头像" />
            </div>
          </li>
          <!-- 加载动画 -->
          <li class="message" v-if="isLoading">
            <div class="avatar"><img :src="getRoleAvatar()" alt="AI头像" /></div>
            <div class="text">
              <div class="content loading-dots">
                AI正在思考<span>.</span><span>.</span><span>.</span>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <!-- 输入区域 -->
      <div class="bottom">
        <div class="input-wrapper">
          <textarea
            name="content"
            id="content"
            v-model="new_message"
            @keydown.enter.exact.prevent="send"
            :disabled="isLoading"
            :placeholder="getPlaceholder()"
          ></textarea>
          <div class="send-actions">
            <button
              @click="send"
              :class="{ active: new_message.trim().length > 0 }"
              :disabled="isLoading || !new_message.trim()"
              class="send-btn"
            >
              {{ isLoading ? '发送中...' : '发送' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, computed } from "vue";
import axios from "axios";

// 数据
const messages = ref([]);
const messageList = ref(null);
const new_message = ref("");
const isLoading = ref(false);
const selectedRole = ref("default");
const userAvatar = ref("");

// 角色列表
const roles = ref([
  { key: 'default', name: '🤖 AI助手' },
  { key: 'assistant', name: '👔 专业助手' },
  { key: 'teacher', name: '👨‍🏫 耐心老师' },
  { key: 'friend', name: '🫂 贴心朋友' },
  { key: 'programmer', name: '💻 程序员' },
  { key: 'writer', name: '✍️ 专业作家' },
  { key: 'psychologist', name: '🧠 心理咨询师' }
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
    
    scrollToBottom();
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
const send = async (e) => {
  if (e) e.preventDefault();
  if (isLoading.value) return;
  
  const content = new_message.value.trim();
  if (!content) {
    console.warn("输入内容不能为空！");
    return;
  }

  // 添加用户消息
  messages.value.push({
    from: "user",
    content: content,
    time: new Date().toISOString()
  });
  
  new_message.value = "";
  scrollToBottom();

  isLoading.value = true;
  scrollToBottom();

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
  } finally {
    isLoading.value = false;
    scrollToBottom();
  }
};

// 切换角色
const handleRoleChange = async () => {
  if (confirm('切换角色将清空当前对话历史，确定要继续吗？')) {
    try {
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
      
      scrollToBottom();
    } catch (err) {
      console.error("切换角色失败:", err);
      alert("切换角色失败，请重试");
    }
  } else {
    // 恢复原角色
    loadHistory();
  }
};

// 清空历史
const clearHistory = async () => {
  if (!confirm('确定要清空所有对话历史吗？')) return;
  
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
    
    scrollToBottom();
  } catch (err) {
    console.error("清空历史失败:", err);
    alert("清空历史失败，请重试");
  }
};

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    const el = messageList.value;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  });
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
  width: 96%;
  height: 92%;
  padding: 4% 2%;
  padding-top: 2%;
}

.main {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 1rem;
  background-color: rgba(128, 128, 128, 0.1);
  box-shadow: 0 0 5px 2px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;

  .top {
    border-top-left-radius: 1rem;
    border-top-right-radius: 1rem;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 1px 1px 0px rgba(0, 0, 0, 0.1);
    padding: 0 20px;
    background-color: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
    min-height: 70px;

    .title-section {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 1;

      h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }

      .role-selector {
        .role-select {
          padding: 6px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.3s;
          -webkit-app-region: no-drag;

          &:hover {
            border-color: #4CAF50;
          }

          &:focus {
            outline: none;
            border-color: #4CAF50;
            box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
          }
        }
      }
    }

    .header-actions {
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

        &.clear-btn {
          font-size: 18px;
        }
      }
    }
  }

  .middle {
    border-radius: 1rem;
    flex: 1;
    overflow-y: scroll;
    overflow-x: hidden;
    -webkit-app-region: no-drag;
    padding: 20px;

    ul {
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 1rem;

      .message {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        list-style-type: none;

        &:has(.me) {
          flex-direction: row-reverse;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        }

        .text {
          max-width: 70%;
          display: flex;
          flex-direction: column;
          gap: 4px;

          &.me {
            align-items: flex-end;

            .content {
              background-color: #4CAF50;
              color: white;
              border-radius: 18px 18px 4px 18px;
            }
          }

          .content {
            display: inline-block;
            background-color: #f0f0f0;
            color: #333;
            padding: 12px 16px;
            border-radius: 18px 18px 18px 4px;
            word-wrap: break-word;
            word-break: break-word;
            font-size: 15px;
            line-height: 1.5;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

            :deep(code) {
              background: rgba(0, 0, 0, 0.1);
              padding: 2px 6px;
              border-radius: 3px;
              font-family: 'Courier New', monospace;
            }

            :deep(pre) {
              background: rgba(0, 0, 0, 0.05);
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

          .time {
            font-size: 11px;
            color: #999;
            padding: 0 8px;
          }
        }
      }
    }
  }

  .bottom {
    flex: 0 0 auto;
    padding: 20px;
    background-color: #f8f9fa;
    border-bottom-left-radius: 1rem;
    border-bottom-right-radius: 1rem;
    -webkit-app-region: no-drag;

    .input-wrapper {
      display: flex;
      gap: 12px;
      align-items: flex-end;

      textarea {
        flex: 1;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 12px;
        resize: none;
        min-height: 50px;
        max-height: 120px;
        font-size: 15px;
        font-family: inherit;
        line-height: 1.5;
        transition: border-color 0.3s;

        &:focus {
          outline: none;
          border-color: #4CAF50;
        }

        &:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }
      }

      .send-actions {
        display: flex;
        gap: 8px;

        .send-btn {
          padding: 12px 24px;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 500;
          transition: all 0.3s;
          white-space: nowrap;

          &:hover:not(:disabled) {
            background-color: #45a049;
            transform: translateY(-1px);
          }

          &:disabled {
            background-color: #ccc;
            cursor: not-allowed;
            transform: none;
          }

          &.active {
            background-color: #4CAF50;
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
