<template>
  <div class="container">
    <div class="top">
      <div class="left">
        <div class="roomname">{{ roomName }}</div>
        <div class="roomnum">
          房间号：<strong>{{ roomID }}</strong>
        </div>
      </div>
      <div class="right">
        <div class="counts">{{ roomNum }}<strong>Online</strong></div>
        <div class="return" @click="back">✖</div>
      </div>
    </div>

    <div class="middle">
      <div class="users">
        <div class="host">
          <div class="avatar">
            <img src="/images/ava.jpg" alt="图片" />
          </div>
          <div class="avatar-name">{{ uname }}</div>
        </div>

        <div class="audiences">
          <div class="audience" v-for="(seat, index) in seats" :key="index">
            <div class="seat">
              <div class="seat-logo">{{ seat.useravatar }}</div>
              <div class="seat-number">
                {{ seat.username ? seat.username : `${index + 1}号位` }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="chats">
        <div class="notice">
          <div class="notice-content">
            欢迎来到
            <span>{{ roomName }}</span>
            聊天室，请遵循社区基本规则，不要以身试险，祝您愉快!
          </div>
        </div>
        <div class="board">
          <div class="board-content" ref="log">
            <ul>
              <li
                v-for="(message, index) in messages"
                :key="index"
                :class="{ 'system-message': message.role === '系统通知' }"
                :data-username="
                  message.role && message.role !== '系统通知'
                    ? message.role
                    : '游客'
                "
              >
                <template v-if="message.role === '系统通知'">
                  <span class="system-prefix">[系统]</span>
                  {{ message.content }}
                </template>
                <template v-else>
                  <span class="username">{{ message.role || "游客" }}</span
                  ><span class="separator">:</span>
                  <span class="message-content">{{ message.content }}</span>
                </template>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- 调试信息: showPicker = {{ showPicker }} -->
    <div v-if="showPicker" class="emoji-picker-container">
      <div class="custom-emoji-picker">
        <div class="emoji-header">选择表情</div>
        <div class="emoji-grid">
          <span v-for="emoji in emojiList" :key="emoji" class="emoji-item" @click="selectEmoji(emoji)">{{ emoji }}</span>
        </div>
      </div>
    </div>

    <div class="input-area">
      <input
        type="text"
        id="chat-input"
        v-model="msg"
        @keydown.enter="sendMsg"
        autocomplete="off"
      />
      <input
        type="button"
        value="😊"
        id="emoji-btn"
        class="send-button"
        @click="showpicker"
      />
      <!-- <input type="button" value="🦵🏻" class="send-button" /> -->
      <input
        type="button"
        value="发送"
        class="send-button"
        id="send-button"
        @click="sendMsg"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { socket, waitForSocketConnection } from "../../utils/socket";

const props = defineProps({
  roomInfo: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['back'])

const route = useRoute();
const router = useRouter();

const roomName = ref(props.roomInfo?.name || route.query.name);
const roomID = ref(props.roomInfo?.id || route.query.id);
const roomNum = ref(0);
const uname = ref(props.roomInfo?.uname || route.query.uname);
const msg = ref("");
const messages = ref([]);
const log = ref(null);

const showPicker = ref(false);

// 表情列表
const emojiList = ref([
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
  '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
  '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
  '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
  '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾'
]);

// 用户列表
const seats = ref(
  Array.from({ length: 8 }, () => ({ username: null, useravatar: "🪑" }))
);

function selectEmoji(emoji) {
  msg.value += emoji;
  showPicker.value = false;
}

function back() {
  if (props.roomInfo) {
    emit('back')
  } else {
    router.back();
  }
}

function sendMsg() {
  if (!msg.value.trim()) {
    console.warn("内容不能为空");
    return;
  }
  socket.emit("group-message", msg.value, uname.value);
  
  msg.value = "";
}

function showpicker() {
  showPicker.value = !showPicker.value;
}

function setupSocketListeners() {
  cleanupSocketListeners();

  if (socket.connected) {
    socket.emit("joinroom", { room: roomID.value, username: uname.value });
  } else {
    socket.on("connect", () => {
      socket.emit("joinroom", { room: roomID.value, username: uname.value });
    });
  }

  socket.on("group-message", ({ msg, uname: sender }) => {
    messages.value.push({ role: sender, content: msg });
    nextTick(() => {
      if (log.value) {
        log.value.scrollTop = log.value.scrollHeight;
      }
    });
  });

  socket.on("update", (newSeats) => {
    seats.value = newSeats;
    roomNum.value = newSeats.filter((seat) => seat.username !== null).length;
  });

  socket.on("notice", (content) => {
    messages.value.push({ role: "系统通知", content });
    nextTick(() => {
      if (log.value) {
        log.value.scrollTop = log.value.scrollHeight;
      }
    });
  });

  socket.on("Full", () => {
    console.warn("当前房间已满");
    router.back();
  });
}

function cleanupSocketListeners() {
  socket.off("connect");
  socket.off("group-message");
  socket.off("update");
  socket.off("notice");
  socket.off("Full");
  // 清理完成，不再需要pickerElement相关代码
}

// 表情选择器现在使用自定义实现，不需要额外的事件监听器

onMounted(() => {
  setupSocketListeners();
});

onBeforeUnmount(() => {
  cleanupSocketListeners();
});
</script>

<style scoped lang="scss">
.container {
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  height: 100vh;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
        circle at 20% 80%,
        rgba(120, 119, 198, 0.3) 0%,
        transparent 50%
      ),
      radial-gradient(
        circle at 80% 20%,
        rgba(255, 255, 255, 0.1) 0%,
        transparent 50%
      ),
      radial-gradient(
        circle at 40% 40%,
        rgba(120, 119, 198, 0.2) 0%,
        transparent 50%
      );
    pointer-events: none;
  }
}
.top {
  height: 7vh;
  border: none;
  display: flex;
  justify-content: space-between;
  padding: 15px 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
  z-index: 10;

  .left {
    display: flex;
    flex-direction: column;
    justify-content: center;

    .roomname {
      font-size: 1.2rem;
      font-weight: 600;
      color: white;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      margin-bottom: 2px;
    }

    .roomnum {
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.8);

      strong {
        color: #ffd700;
        font-weight: 700;
      }
    }
  }
}
.right {
  display: flex;
  gap: 12px;
  align-items: center;
}
.counts {
  border: none;
  border-radius: 20px;
  padding: 8px 12px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.2),
    rgba(255, 255, 255, 0.1)
  );
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-size: 0.9rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);

  strong {
    margin-left: 4px;
    color: #90ee90;
    font-weight: 600;
  }
}
.return {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.2),
    rgba(255, 255, 255, 0.1)
  );
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
  font-size: 1.1rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: scale(1.1) rotate(90deg);
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.3),
      rgba(255, 255, 255, 0.2)
    );
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  }
}
.middle {
  height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  position: relative;
  z-index: 5;
  padding: 0 15px;
  gap: 15px;
}
.users {
  width: 500px;
  flex-shrink: 0;
  height: 100%;
  overflow-y: auto;
}
.host {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  margin-bottom: 25px;
  padding: 15px 0;
}
.avatar {
  aspect-ratio: 1/1;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.05);
    border-color: rgba(255, 255, 255, 0.5);
    box-shadow: 0 12px 35px rgba(0, 0, 0, 0.3);
  }
}
.avatar img {
  object-fit: cover;
  width: 70px;
  height: 70px;
}
.avatar-name {
  position: absolute;
  bottom: -5px;
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  font-size: 0.9rem;
  border-radius: 12px;
  color: white;
  padding: 5px 14px;
  font-weight: 600;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
}

.audiences {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 15px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  height: calc(100% - 120px);
  overflow-y: auto;
}
.audience {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    transform: translateX(3px);
  }
}
.seat {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  width: 100%;
  transition: all 0.3s ease;
}
.seat-logo {
  font-size: 18px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.2),
    rgba(255, 255, 255, 0.1)
  );
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  flex-shrink: 0;

  &:hover {
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.3),
      rgba(255, 255, 255, 0.2)
    );
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
}
.seat-number {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chats {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin-right: 10px;
}

.notice {
  display: flex;
  justify-content: flex-start;
  padding: 8px 0;
  height: fit-content;
  margin-bottom: 8px;
  padding-left: 20px;
}

.notice-content {
  background: linear-gradient(
    135deg,
    rgba(255, 193, 7, 0.9),
    rgba(255, 152, 0, 0.8)
  );
  border: 1px solid rgba(255, 193, 7, 0.6);
  box-shadow: 0 2px 8px rgba(255, 193, 7, 0.3);
  width: fit-content;
  max-width: 70%;
  padding: 6px 12px;
  font-size: 0.8rem;
  border-radius: 12px;
  text-align: left;
  color: #333;
  font-weight: 600;
  position: relative;

  /* 直播间风格的小三角 */
  &::before {
    content: "";
    position: absolute;
    left: -6px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    border-right: 6px solid rgba(255, 193, 7, 0.9);
  }

  span {
    color: #d32f2f;
    font-weight: 700;
  }
}

.board {
  flex: 1;
  display: flex;
  justify-content: flex-start;
  overflow: hidden;
  max-height: 100%;
  min-height: 0;
  margin-bottom: 15px;
}

.board-content {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1),
    rgba(255, 255, 255, 0.05)
  );
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  width: 100%;
  font-size: 0.9rem;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 15px;
  border-radius: 15px;
  position: relative;

  /* 自定义滚动条 */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.3),
      rgba(255, 255, 255, 0.2)
    );
    border-radius: 3px;

    &:hover {
      background: linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.4),
        rgba(255, 255, 255, 0.3)
      );
    }
  }
}

.board-content li {
  padding: 6px 10px;
  margin: 2px 0;
  font-size: 13px;
  line-height: 1.3;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  text-align: left;
  word-wrap: break-word;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.2);
  }

  /* 用户名样式 */
  .username {
    font-weight: 700;
    color: #64b5f6;
    margin-right: 6px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  /* 分隔符样式 */
  .separator {
    color: rgba(255, 255, 255, 0.6);
    margin: 0 2px;
  }

  /* 消息内容样式 */
  .message-content {
    color: rgba(255, 255, 255, 0.9);
    word-wrap: break-word;
  }

  /* 系统消息样式 */
  &.system-message {
    background: rgba(255, 193, 7, 0.15);
    border-color: rgba(255, 193, 7, 0.3);
    color: #ffc107;
    font-style: italic;
    text-align: left;

    .system-prefix {
      color: #ffc107;
      font-weight: 700;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }
  }
}

.input-area {
  position: relative;
  display: flex;
  align-items: center;
  padding: 15px 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  gap: 10px;
  z-index: 10;
}

#chat-input {
  flex: 1;
  height: 45px;
  border-radius: 25px;
  padding: 0 20px;
  font-size: 1rem;
  color: #333;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.9),
    rgba(255, 255, 255, 0.8)
  );
  border: 2px solid rgba(255, 255, 255, 0.3);
  outline: none;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);

  &:focus {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    border-color: rgba(255, 255, 255, 0.5);
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.95),
      rgba(255, 255, 255, 0.9)
    );
  }

  &::placeholder {
    color: rgba(0, 0, 0, 0.5);
    font-weight: 400;
  }
}

.send-button {
  height: 45px;
  width: 45px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 600;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.2),
    rgba(255, 255, 255, 0.1)
  );
  backdrop-filter: blur(10px);
  color: white;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);

  &:hover {
    transform: translateY(-2px) scale(1.05);
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.3),
      rgba(255, 255, 255, 0.2)
    );
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
  }

  &:active {
    transform: translateY(0) scale(0.95);
  }
}

.send-button:last-child {
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  color: white;
  border-color: rgba(255, 255, 255, 0.4);

  &:hover {
    background: linear-gradient(135deg, #ff5252, #d63031);
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 8px 25px rgba(238, 90, 36, 0.4);
  }
}

ul {
  list-style-type: none;
}
li {
  margin: 0.5rem 0;
}

.emoji-picker-container {
  position: fixed !important;
  bottom: 90px !important;
  right: 30px !important;
  z-index: 999999 !important;
  width: 350px !important;
  height: 400px !important;
  background: white !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
  border: 1px solid #e0e0e0 !important;
  overflow: hidden !important;
}

.custom-emoji-picker {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.emoji-header {
  padding: 15px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  font-weight: 600;
  color: #333;
  text-align: center;
  border-radius: 12px 12px 0 0;
}

.emoji-grid {
  flex: 1;
  padding: 15px;
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 8px;
  overflow-y: auto;
  max-height: calc(400px - 60px);
}

.emoji-item {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  user-select: none;
}

.emoji-item:hover {
  background: #f0f0f0;
  transform: scale(1.2);
}

.emoji-item:active {
  transform: scale(1.1);
  background: #e0e0e0;
}

/* 响应式设计 - 平板设备 */
@media (max-width: 1024px) {
  .container {
    padding: 0;
  }
  
  .middle {
    flex-direction: column;
    height: 75vh;
    padding: 0 10px;
    gap: 10px;
  }
  
  .users {
    width: 100%;
    height: 200px;
    margin-bottom: 10px;
  }
  
  .audiences {
    height: 150px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    padding: 10px;
  }
  
  .audience {
    padding: 5px;
  }
  
  .chats {
    margin-right: 0;
    height: calc(100% - 220px);
  }
  
  .emoji-picker-container {
    width: 300px !important;
    height: 350px !important;
    bottom: 80px !important;
    right: 20px !important;
  }
  
  .emoji-grid {
    grid-template-columns: repeat(8, 1fr);
    max-height: calc(350px - 60px);
  }
}

/* 响应式设计 - 移动设备 */
@media (max-width: 768px) {
  .container {
    height: 100vh;
    overflow: hidden;
  }
  
  .top {
    height: 60px;
    padding: 10px 15px;
    
    .left {
      .roomname {
        font-size: 1rem;
      }
      
      .roomnum {
        font-size: 0.8rem;
      }
    }
    
    .right {
      gap: 8px;
      
      .counts {
        padding: 6px 10px;
        font-size: 0.8rem;
      }
      
      .return {
        width: 35px;
        height: 35px;
        font-size: 1rem;
      }
    }
  }
  
  .middle {
    flex-direction: column;
    height: calc(100vh - 140px);
    padding: 0 10px;
    gap: 8px;
  }
  
  .users {
    width: 100%;
    height: 160px;
    margin-bottom: 8px;
  }
  
  .host {
    margin-bottom: 15px;
    padding: 10px 0;
    
    .avatar img {
      width: 50px;
      height: 50px;
    }
    
    .avatar-name {
      font-size: 0.8rem;
      padding: 4px 10px;
    }
  }
  
  .audiences {
    height: 120px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 5px;
    padding: 8px;
  }
  
  .audience {
    padding: 4px;
  }
  
  .seat-logo {
    width: 30px !important;
    height: 30px !important;
    font-size: 14px !important;
  }
  
  .seat-number {
    font-size: 0.75rem !important;
  }
  
  .chats {
    margin-right: 0;
    height: calc(100% - 170px);
  }
  
  .notice {
    padding: 6px 0;
    padding-left: 15px;
    
    .notice-content {
      font-size: 0.75rem;
      padding: 5px 10px;
      max-width: 85%;
    }
  }
  
  .board-content {
    padding: 10px;
    
    li {
      padding: 5px 8px;
      font-size: 12px;
      
      .username {
        margin-right: 4px;
      }
    }
  }
  
  .input-area {
    padding: 10px 15px;
    gap: 8px;
    height: 80px;
    
    #chat-input {
      height: 40px;
      font-size: 0.9rem;
      padding: 0 15px;
    }
    
    .send-button {
      height: 40px;
      width: 40px;
      font-size: 1rem;
    }
  }
  
  .emoji-picker-container {
    width: calc(100vw - 30px) !important;
    height: 300px !important;
    bottom: 90px !important;
    left: 15px !important;
    right: 15px !important;
  }
  
  .emoji-grid {
    grid-template-columns: repeat(8, 1fr);
    gap: 6px;
    padding: 10px;
    max-height: calc(300px - 50px);
  }
  
  .emoji-item {
    width: 24px;
    height: 24px;
    font-size: 18px;
  }
  
  .emoji-header {
    padding: 10px 15px;
    font-size: 0.9rem;
  }
}

/* 响应式设计 - 小屏幕移动设备 */
@media (max-width: 480px) {
  .top {
    .left {
      .roomname {
        font-size: 0.9rem;
      }
      
      .roomnum {
        font-size: 0.7rem;
      }
    }
    
    .right {
      .counts {
        padding: 5px 8px;
        font-size: 0.7rem;
      }
      
      .return {
        width: 30px;
        height: 30px;
        font-size: 0.9rem;
      }
    }
  }
  
  .audiences {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .emoji-grid {
    grid-template-columns: repeat(6, 1fr);
  }
  
  .input-area {
    padding: 8px 10px;
    
    #chat-input {
      font-size: 0.85rem;
      padding: 0 12px;
    }
    
    .send-button {
      height: 36px;
      width: 36px;
      font-size: 0.9rem;
    }
  }
}
</style>
