<template>
  <div class="contacts">
    <div class="top">
      <div class="top_child">
        <input type="button" value="◁" @click="back" id="button" />
        <span>Contacts</span>
        <div class="friend_request">
          <button @click="show_request">+</button>
        </div>
      </div>
    </div>
    <div class="bottom">
      <!-- 搜索联系人功能 -->
      <div class="contact-search">
        <input
          type="text"
          placeholder="搜索联系人..."
          v-model="searchKeyword"
          @input="handleSearch"
          class="search-input"
        />
      </div>
      
      <div class="search" v-if="newfriend">
        <input
          type="text"
          name=""
          id=""
          placeholder="Search"
          v-model="friend_name"
          autocomplete="off"
        />
        <input type="button" value="添加♂好友" @click="friend_request" />
      </div>
      
      <!-- 显示搜索结果或好友列表 -->
      <ul class="chat-list" v-if="!searchKeyword || searchKeyword.trim() === ''">
        <li
          class="chat-item"
          v-for="friend in friends"
          @click="switchChat(friend)"
        >
          <div class="avatar-box">
            <div class="avatar-small">
              <div :class="{ tips: friend.isNewmsg }"></div>
              <img :src="friend.avatar || '/images/avatar/out.webp'" alt="图片" />
            </div>
          </div>
          <div class="detail">
            <div class="name">{{ friend.name }}</div>
          </div>
        </li>
      </ul>
      
      <!-- 搜索结果列表 -->
      <ul class="chat-list" v-else-if="filteredFriends.length > 0">
        <li
          class="chat-item"
          v-for="friend in filteredFriends"
          @click="switchChat(friend)"
        >
          <div class="avatar-box">
            <div class="avatar-small">
              <div :class="{ tips: friend.isNewmsg }"></div>
              <img :src="friend.avatar || '/images/avatar/out.webp'" alt="图片" />
            </div>
          </div>
          <div class="detail">
            <div class="name" v-html="friend.highlightedName || friend.name"></div>
          </div>
        </li>
      </ul>
      
      <!-- 无搜索结果 -->
      <div v-else-if="searchKeyword.trim() !== ''" class="no-results">
        <p>未找到匹配的联系人</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import axios from "axios";
import { ref } from "vue";
import { defineEmits } from "vue";
import { onMounted } from "vue";
import { useChatStore } from "../stores/useChatStore";

const friends = ref([]);
const friend_name = ref("");
const searchKeyword = ref("");
const filteredFriends = ref([]);

const newfriend = ref(false);

const chatStore = useChatStore();

const emit = defineEmits(["hidecontacts", "changecolor", "todetail"]);
function back() {
  emit("hidecontacts", "关掉聊天");
}

function show_request() {
  newfriend.value = true;
}

//添加好友
async function friend_request() {
  const token = localStorage.getItem("token");
  if (!friend_name.value) {
    friend_name.value = "";
    return alert("请输入合法的用户名");
  } else {
    const name = friend_name.value;
    friend_name.value = "";
    const res = await axios.post(
      `${import.meta.env.VITE_BASE_URL}/user/add`,
      {
        content: name,
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    );

    alert(res.data.message);
    location.reload();
  }
}

// 搜索联系人功能
function handleSearch() {
  if (!searchKeyword.value || searchKeyword.value.trim() === '') {
    filteredFriends.value = [];
    return;
  }
  
  const keyword = searchKeyword.value.toLowerCase();
  filteredFriends.value = friends.value.filter(friend => 
    friend.name.toLowerCase().includes(keyword)
  ).map(friend => {
    // 高亮匹配的文本
    const name = friend.name;
    const index = name.toLowerCase().indexOf(keyword);
    if (index !== -1) {
      const highlightedName = name.substring(0, index) + 
        '<span style="background-color: yellow;">' + 
        name.substring(index, index + keyword.length) + 
        '</span>' + 
        name.substring(index + keyword.length);
      return { ...friend, highlightedName };
    }
    return friend;
  });
}

// UI切换聊天页
function switchChat(friend) {
  chatStore.switchChatUser(friend.id);
  emit("todetail", { uname: friend.name, img: friend.img });
}

// 初始化 friends 数组（获取好友基本信息和最近聊天内容）
onMounted(async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios(`${import.meta.env.VITE_BASE_URL}/user/friends`, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const newFriends = Array.isArray(res.data) ? res.data : [];

    if (newFriends.length === 0) {
      friends.value = [];
      return;
    }

    const lastMsgPromises = newFriends.map((friend) =>
      axios
        .get(
          `${import.meta.env.VITE_BASE_URL}/chat/last_message/${friend.id}`,
          {
            headers: {
              authorization: `Bearer ${token}`,
            },
          }
        )
        .then((msgRes) => ({
          id: friend.id,
          lastMessage: msgRes.data.content,
          lastTime: msgRes.data.time,
        }))
        .catch((err) => {
          console.error(`初始化时获取${friend.name}的消息失败`, err);
          return { id: friend.id, lastMessage: "", lastTime: "" };
        })
    );

    const lastMessages = await Promise.all(lastMsgPromises);

    newFriends.forEach((friend) => {
      const msg = lastMessages.find((m) => m.id === friend.id);
      Object.assign(friend, {
        lastMessage: msg?.lastMessage || "",
        lastTime: msg?.lastTime || "",
        isNewmsg: false,
      });
    });

    friends.value = [...newFriends]; // 确保这里是响应式更新
  } catch (err) {
    console.error("初始化联系人或消息失败:", err);
  }
});
</script>

<style scoped lang="scss">
:root {
  --border-color: rgba(0, 0, 0, 0.1);
  --shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.contacts {
  height: 100%;
  /* min-width: 100%; */
  max-width: 100vw;
  display: flex;
  flex-direction: column;
  background-color: transparent;
  overflow: hidden;
}

/* 顶部区域 */
.top {
  height: 60px;
  padding: 0 1rem;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  box-shadow: 0 1px 1px 0px rgba(0, 0, 0, 0.1);
}

#button,
.status,
.search,
.contact-search,
.setting,
.avatar,
.chat-list,
.friend_request button {
  -webkit-app-region: no-drag;
}

.friend_request {
  position: absolute;
  right: 0;
  transition: all 0.5s ease-in;

  button {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: larger;

    &:hover {
      transform: scale(1.05);

      &::after {
        opacity: 1;
      }
    }

    &::after {
      content: "添加新好友";
      position: absolute;
      top: 50%;
      left: -200%;
      transform: translateY(-50%);
      white-space: nowrap;
      background: rgba(0, 0, 0, 0.75);
      color: white;
      padding: 4px 8px;
      border-radius: 6px;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }
  }
}

/* 联系人搜索样式 */
.contact-search {
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
  
  .search-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 20px;
    background-color: rgba(0, 0, 0, 0.05);
    font-size: 0.9rem;
    transition: all 0.3s ease;
    
    &:focus {
      outline: none;
      border-color: #007bff;
      background-color: white;
    }
  }
}

/* 无搜索结果样式 */
.no-results {
  padding: 2rem;
  text-align: center;
  color: #666;
  
  p {
    margin: 0;
    font-size: 0.9rem;
  }
}

.search {
  position: absolute;
  left: 5px;
  bottom: 15px;
  width: 100%;
  margin-top: 1rem;
  animation: appear 1.5s ease-out;
  display: flex;
  flex-direction: row;

  input {
    width: 50%;
    padding: 0.75rem 2.5rem 0.75rem 1rem;
    border: none;
    border-radius: 20px;
    background-color: rgba(0, 0, 0, 0.05);
    font-size: 0.9rem;
    transition: all 0.3s ease;

    &[type="button"] {
      padding: 0 10px;
      width: fit-content;
      margin-left: 5%;
      margin-right: 5%;
      display: flex;
      justify-content: center;
      align-items: center;
      /* background-color:rgba(165, 42, 42, 0.485);
         */
      background-color: rgba(120, 25, 25, 0.6);
      color: white;
      cursor: pointer;
      transition: all 0.7s ease;

      &:hover {
        transform: translateX(5px);
        background-color: rgba(165, 42, 42, 0.85);
      }
    }
  }
}

.top_child {
  height: 100%;
  display: flex;
  align-items: center;
  gap: 1rem;
  position: relative;

  input {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      transform: scale(1.05);
    }
  }
}

/* 底部联系人列表 */
.bottom {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: 75px;
  position: relative;
}

.head {
  margin-top: 20px;
  /*max-height: 10px; */
  padding: 0.5rem 1rem;
  font-weight: 600;
  color: #666;
  flex-shrink: 0;
  box-shadow: 0 0 2px 1px rgba(0, 0, 0, 0.1);
}

.chat-list {
  flex: 1;
  overflow-y: auto;
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  /* background-color: #4CAF50; */
}

.chat-item {
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: background-color 0.3s ease;
  cursor: pointer;
  position: relative;

  /* delete */
  /* flex: 1;
    border: 1px solid black; */
  /* flex: 0 0 25%; */

  &:hover {
    background-color: rgba(0, 0, 0, 0.02);
  }
}

.avatar-small {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  /* border: 1px solid black; */

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.detail {
  flex: 1;
  min-width: 0;
}

.name {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.info {
  color: #666;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.time {
  color: #999;
  font-size: 0.8rem;
  white-space: nowrap;
}

@keyframes appear {
  0% {
    transform: translateX(-450px);
  }
  100% {
    transform: translateX(0);
  }
}

/* 响应式设计 */

/* 大屏幕设备 */
@media (min-width: 1200px) {
  .contacts {
    padding: 1rem;
  }

  .top {
    padding: 1.2rem 1rem;
  }

  .middle {
    padding: 1rem;
  }

  .search {
    padding: 0 1rem;
  }
}

/* 平板设备 */
@media (max-width: 1199px) and (min-width: 769px) {
  .contacts {
    border-right: 1px solid var(--border-color, #e0e0e0);
    padding: 0.8rem;
  }

  .top {
    padding: 1rem 0.8rem;
  }

  .middle {
    padding: 0 0.8rem;
  }

  .search {
    padding: 0 0.8rem;

    input {
      width: 60%;
    }
  }

  .friend_request {
    button {
      width: 28px;
      height: 28px;
      font-size: 14px;
    }
  }
}

/* 移动设备 */
@media (max-width: 768px) {
  .contacts {
    width: 100%;
    height: 100vh;
    border-radius: 0;
    padding: 0;
  }

  .top {
    padding: 1rem;
    border-bottom: 1px solid #f0f0f0;
  }

  .top_child {
    span {
      font-weight: bolder;
      font-size: 1.1rem;
    }
  }

  .middle {
    padding: 0;
    flex: 1;

    ul {
      padding: 0.5rem;

      li {
        padding: 1rem;
        border-bottom: 1px solid #f5f5f5;

        &:last-child {
          border-bottom: none;
        }

        .avatar {
          width: 50px;
          height: 50px;
        }

        .text {
          .name {
            font-size: 1rem;
            font-weight: 500;
          }

          .lastmsg {
            font-size: 0.9rem;
            color: #666;
          }
        }
      }
    }
  }

  .search {
    padding: 1rem;
    background: #fafafa;
    border-top: 1px solid #e0e0e0;

    input {
      width: 70%;
      padding: 0.8rem 1rem;
      font-size: 1rem;
    }

    input[type="button"] {
      padding: 0.8rem 1.2rem;
      font-size: 0.9rem;
    }
  }

  .set {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  #button {
    display: none;
  }

  .friend_request {
    position: static;
    margin-top: 0.5rem;

    button {
      width: 36px;
      height: 36px;
      font-size: 16px;
    }
  }
}

/* 小屏移动设备 */
@media (max-width: 480px) {
  .contacts {
    font-size: 14px;
  }

  .top {
    padding: 0.8rem;
  }

  .top_child {
    span {
      font-size: 1rem;
    }
  }

  .middle {
    ul {
      li {
        padding: 0.8rem;

        .avatar {
          width: 45px;
          height: 45px;
        }

        .text {
          .name {
            font-size: 0.9rem;
          }

          .lastmsg {
            font-size: 0.8rem;
          }
        }
      }
    }
  }

  .search {
    padding: 0.8rem;

    input {
      width: 65%;
      padding: 0.7rem 0.8rem;
      font-size: 0.9rem;
    }

    input[type="button"] {
      padding: 0.7rem 1rem;
      font-size: 0.8rem;
    }
  }
}

/* 横屏适配 */
@media (orientation: landscape) and (max-height: 500px) {
  .contacts {
    height: 100vh;
  }

  .middle {
    ul {
      li {
        padding: 0.6rem 1rem;
      }
    }
  }

  .search {
    padding: 0.6rem 1rem;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .middle ul li {
    padding: 1.2rem 1rem;

    &:active {
      background-color: #f0f0f0;
      transform: scale(0.98);
    }
  }

  .search input[type="button"] {
    padding: 1rem 1.2rem;

    &:active {
      transform: scale(0.95);
    }
  }

  .friend_request button {
    &:active {
      transform: scale(0.9);
    }
  }
}
</style>
