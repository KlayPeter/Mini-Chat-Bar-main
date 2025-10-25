<template>
  <div class="contacts">
    <div class="set" v-if="issetting">
      <div class="set_" @click="toBeige">Beige</div>
      <div class="set_" @click="toMist">Mist</div>
      <div class="set_" @click="toApricot">Apricot</div>
    </div>
    <div class="top">
      <div class="top_child">
        <input type="button" value="◁" @click="back" id="button" />
        <span>Chat</span>
        <div class="chatroom">
          <button @click="$router.push('/chatbox/chathall')">+</button>
        </div>
      </div>
    </div>
    <div class="middle">
      <div class="setting" @click="setcolor">
        <font-awesome-icon :icon="['fas', 'gear']" title="更换背景色" />
      </div>
      <div class="avatar" @click="showAvatarSelector" title="点击更换头像">
        <div class="frame">
          <img :src="(userava || '/images/avatar/out.webp') + '?t=' + avatarKey" :key="avatarKey" alt="" />
          <div class="avatar-overlay">
            <img
              src="/images/icon/camera.png"
              alt="相机"
              style="width: 32px; height: 32px"
            />
          </div>
        </div>
      </div>

      <!-- 头像选择器 -->
      <div v-if="avatarSelector.show" class="avatar-selector">
        <div class="avatar-selector-content">
          <h3>选择头像</h3>

          <!-- 上传自定义头像 -->
          <div class="upload-section">
            <input
              type="file"
              ref="avatarFileInput"
              accept="image/*"
              @change="handleAvatarUpload"
              style="display: none"
            />
            <button @click="triggerAvatarUpload" class="upload-btn">
              <img src="/images/icon/upload.png" alt="上传" />
              上传自定义头像
            </button>
          </div>

          <div class="divider">或选择预设头像</div>

          <div class="avatar-grid">
            <div
              v-for="avatar in predefinedAvatars"
              :key="avatar.name"
              class="avatar-option"
              @click="selectAvatar(avatar.url)"
            >
              <img :src="avatar.url" :alt="avatar.name" />
              <span>{{ avatar.name }}</span>
            </div>
          </div>
          <div class="avatar-selector-actions">
            <button @click="hideAvatarSelector" class="cancel-btn">取消</button>
          </div>
        </div>
        <div v-if="avatarSelector.show" class="avatar-selector-overlay" @click="hideAvatarSelector"></div>
      </div>
      <div class="friendname">{{ username ? username : "游客" }}</div>
      <div class="status-display" @click="toggleStatus" :title="statu === 'available' ? '在线' : '忙碌'">
        <span class="status-dot" :class="statu === 'occupied' ? 'busy' : 'online'"></span>
        <span class="status-text">{{ statu === 'available' ? '在线' : '忙碌' }}</span>
      </div>
      <div class="search">
        <input 
          type="text" 
          v-model="searchKeyword"
          @input="handleSearch"
          placeholder="搜索用户..." 
        />
      </div>
    </div>
    <div class="bottom">
      <div class="head">{{ searchKeyword ? '用户搜索结果' : 'Last chats' }}</div>
      
      <!-- 搜索结果列表 -->
      <div v-if="searchKeyword && searchResults.length > 0" class="search-results-container">
        <!-- 用户搜索结果 -->
        <div v-if="userSearchResults.length > 0" class="search-section">
          <div class="search-section-header">
            <span class="section-title">联系人</span>
            <span class="section-count">{{ userSearchResults.length }}</span>
          </div>
          <ul class="search-results-list">
            <li
              v-for="user in userSearchResults"
              :key="'user-' + user._id"
              class="search-result-item user-result"
              @click="jumpToUserChat(user)"
            >
              <div class="avatar-box">
                <div class="avatar-small">
                  <img :src="user.avatar || '/images/avatar/default-avatar.webp'" alt="头像" />
                </div>
              </div>
              <div class="detail">
                <div class="name" v-html="user.highlightedName || user.name"></div>
                <div class="user-info">用户</div>
              </div>
            </li>
          </ul>
        </div>

        <!-- 消息搜索结果 -->
        <div v-if="messageSearchResults.length > 0" class="search-section">
          <div class="search-section-header">
            <span class="section-title">聊天记录</span>
            <span class="section-count">{{ messageSearchResults.length }}</span>
          </div>
          <ul class="search-results-list">
            <li
              v-for="result in messageSearchResults"
              :key="'msg-' + result._id"
              class="search-result-item message-result"
              @click="jumpToSearchResult(result)"
            >
              <div class="avatar-box">
                <div class="avatar-small">
                  <img :src="result.senderAvatar || '/images/avatar/default-avatar.webp'" alt="头像" />
                </div>
              </div>
              <div class="detail">
                <div class="name">{{ result.senderName || result.from }}</div>
                <div class="info" v-html="result.highlightedContent || result.content"></div>
                <div class="search-time">{{ formatDate(result.time) }}</div>
              </div>
            </li>
          </ul>
        </div>
      </div>
      
      <!-- 搜索状态提示 -->
      <div v-else-if="searchKeyword && isSearching" class="search-status">
        <div class="loading">搜索中...</div>
      </div>
      
      <!-- 无搜索结果提示 -->
      <div v-else-if="searchKeyword && !isSearching && searchResults.length === 0" class="search-status">
        <div class="no-results">未找到相关用户</div>
      </div>
      
      <!-- 正常聊天列表 -->
      <ul class="chat-list" v-else>
        <li
          class="chat-item"
          v-for="friend in friends"
          :key="friend.id"
          @click="switchChat(friend)"
          @contextmenu.prevent="showContextMenu($event, friend)"
        >
          <div class="avatar-box">
            <div v-if="friend.unreadCount > 0" class="unread-badge">{{ friend.unreadCount > 99 ? '99+' : friend.unreadCount }}</div>
            <div class="avatar-small">
              <img :src="friend.avatar" alt="图片" />
            </div>
          </div>
          <div class="detail">
            <div class="name">{{ friend.name }}</div>
            <div class="info" :class="{ 'unread-text': friend.unreadCount > 0 }">{{ friend.lastMessage }}</div>
          </div>
          <div class="time">{{ formatDate(friend.lastTime) }}</div>
        </li>
      </ul>

      <!-- 右键菜单 -->
      <div
        v-if="contextMenu.show"
        class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click.stop
      >
        <div class="context-menu-item" @click="clearAllChats">
          <img
            src="/images/icon/delete-2.png"
            alt="删除"
            style="width: 16px; height: 16px"
          />
          一键清空所有聊天记录
        </div>
        <div
          class="context-menu-item"
          @click="deleteChatWith(contextMenu.friend)"
        >
          ❌ 删除与{{ contextMenu.friend?.name }}的聊天记录
        </div>
      </div>

      <!-- 遮罩层，点击关闭菜单 -->
      <div
        v-if="contextMenu.show"
        class="context-menu-overlay"
        @click="hideContextMenu"
      ></div>
    </div>
    <!-- <div class="privacy"><div class="avatar"><img src="../images/avatar.jpg" alt=""></div></div> -->
  </div>
</template>

<script setup>
import axios from "axios";
import { onBeforeUnmount, ref, nextTick, computed } from "vue";
import { defineEmits } from "vue";
import { onMounted } from "vue";
import { useChatStore } from "../stores/useChatStore";
import { socket } from "../../utils/socket";
import { watch } from "vue";

const statu = ref("available");
const issetting = ref(false);

// 切换在线状态
function toggleStatus() {
  statu.value = statu.value === 'available' ? 'occupied' : 'available';
}
const friends = ref([]);
const From = ref("");

const userid = ref("");
const username = ref("");
const userava = ref("");
const avatarKey = ref(0); // 用于强制刷新头像的key

// 搜索相关状态
const searchKeyword = ref("");
const searchResults = ref([]);
const isSearching = ref(false);

// 计算属性：分离用户和消息搜索结果
const userSearchResults = computed(() => {
  return searchResults.value.filter(result => result.resultType === 'user');
});

const messageSearchResults = computed(() => {
  return searchResults.value.filter(result => result.resultType === 'message' || !result.resultType);
});

// 右键菜单状态
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  friend: null,
});

// 头像选择器状态
const avatarSelector = ref({
  show: false,
});

// 头像文件输入引用
const avatarFileInput = ref(null);

// 预定义头像列表
const predefinedAvatars = ref([
  { name: "忧郁女头", url: "/images/avatar/b-girl.webp" },
  { name: "氛围男头", url: "/images/avatar/g-boy.webp" },
  { name: "卡皮巴拉", url: "/images/avatar/kapibala.jpg" },
  { name: "蜡笔小新", url: "/images/avatar/labixiaoxin.png" },
  { name: "美少女战士", url: "/images/avatar/meishaonv.webp" },
  { name: "日落意境", url: "/images/avatar/sunset.webp" },
  { name: "默认头像", url: "/images/avatar/default-avatar.webp" },
]);

const chatStore = useChatStore();

const emit = defineEmits(["hidechat", "changecolor", "todetail"]);

function back() {
  emit("hidechat", "关掉聊天");
}

function setcolor() {
  issetting.value = true;
}

function toBeige() {
  emit("changecolor", { color: "beige" });
  issetting.value = false;
}
function toMist() {
  emit("changecolor", { color: "mist" });
  issetting.value = false;
}
function toApricot() {
  emit("changecolor", { color: "apricot" });
  issetting.value = false;
}

// UI切换聊天页
async function switchChat(friend) {
  chatStore.switchChatUser(friend.id);
  emit("todetail", { uname: friend.name, img: friend.avatar, userId: friend.id });
  
  // 标记消息为已读
  if (friend && friend.unreadCount > 0) {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${import.meta.env.VITE_BASE_URL}/api/chat/read/${friend.id}`,
        {},
        {
          headers: {
            authorization: `Bearer ${token}`,
          },
        }
      );
      
      // 清除未读标记
      friend.unreadCount = 0;
      
      console.log(`已标记与 ${friend.name} 的消息为已读`);
    } catch (err) {
      console.error("标记消息为已读失败:", err);
    }
  }
}

// 时间格式化
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const current_date = new Date();
  if (date.toLocaleDateString() === current_date.toLocaleDateString()) {
    return isNaN(date.getTime()) ? "" : date.toLocaleTimeString().slice(0, 5);
  } else {
    return isNaN(date.getTime()) ? "" : date.toLocaleDateString().slice(0, 10);
  }
}

// 获取用户信息
async function getinfo() {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/user/info`, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    userava.value = res.data.ava;
    avatarKey.value = Date.now(); // 使用时间戳强制刷新头像显示
    userid.value = res.data.id;
    username.value = res.data.name;

    // 发送登录事件
    socket.emit("login", res.data.id);
  } catch (err) {
    console.error("用户名获取失败：", err);
  }
}

// 获取好友列表
async function getfriends() {
  try {
    const token = localStorage.getItem("token");
    const res = await axios(`${import.meta.env.VITE_BASE_URL}/api/user/friends`, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const newFriends = Array.isArray(res.data) ? res.data : [];

    // 转换后端数据结构为前端期望的结构
    const transformedFriends = newFriends.map(friend => ({
      id: friend.uID,
      name: friend.uName,
      avatar: friend.uAvatar,
      uID: friend.uID,
      uName: friend.uName,
      uAvatar: friend.uAvatar
    }));

    const lastMsgPromises = transformedFriends.map((friend) =>
      axios
        .get(
          `${import.meta.env.VITE_BASE_URL}/api/chat/last_message/${friend.id}`,
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

    transformedFriends.forEach((friend) => {
      const msg = lastMessages.find((m) => m.id === friend.id);
      const existingFriend = friends.value.find(f => f.id === friend.id);
      Object.assign(friend, {
        lastMessage: msg?.lastMessage || "",
        lastTime: msg?.lastTime || "",
        unreadCount: existingFriend ? existingFriend.unreadCount : 0, // 保留未读数量
      });
    });

    // 获取所有好友的未读消息数量
    try {
      const token = localStorage.getItem("token");
      const unreadRes = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/api/chat/unread`,
        {
          headers: {
            authorization: `Bearer ${token}`,
          },
        }
      );
      
      // 更新每个好友的未读消息数量
      const unreadCounts = unreadRes.data;
      transformedFriends.forEach(friend => {
        friend.unreadCount = unreadCounts[friend.id] || 0;
      });
      
      console.log('未读消息数量:', unreadCounts);
    } catch (err) {
      console.error("获取未读消息数量失败:", err);
    }

    friends.value = [...transformedFriends]
      .sort((a, b) => new Date(b.lastTime || 0) - new Date(a.lastTime || 0)); // 按时间倒序排列，包含所有好友
  } catch (err) {
    console.error("初始化联系人或消息失败:", err);
  }
}

async function updateFriendMessage(fromUserId, showRedDot = true) {
  const senderIndex = friends.value.findIndex(
    (friend) => friend.id === fromUserId
  );
  if (senderIndex !== -1) {
    try {
      const token = localStorage.getItem("token");
      const msgRes = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/api/chat/last_message/${fromUserId}`,
        {
          headers: {
            authorization: `Bearer ${token}`,
          },
        }
      );

      friends.value[senderIndex].lastMessage = msgRes.data.content || "";
      friends.value[senderIndex].lastTime = msgRes.data.time || "";

      // 获取未读消息数量
      if (showRedDot && chatStore.currentChatUser?.toString() !== fromUserId?.toString()) {
        const unreadRes = await axios.get(
          `${import.meta.env.VITE_BASE_URL}/api/chat/unread/${fromUserId}`,
          {
            headers: {
              authorization: `Bearer ${token}`,
            },
          }
        );
        friends.value[senderIndex].unreadCount = unreadRes.data.count;
      }

      console.log(`更新 ${friends.value[senderIndex].name} 的最后消息`, {
        lastMessage: msgRes.data.content,
        unreadCount: friends.value[senderIndex].unreadCount
      });
      
      // 重新按时间排序
      friends.value.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));
    } catch (err) {
      console.error(
        `收到新消息通知后，获取用户 ${fromUserId} 最新消息失败:`,
        err
      );
    }
  } else {
    console.warn(`未找到 ID 为 ${fromUserId} 的朋友在 friends 列表中。可能需要刷新好友列表`);
    // 如果好友列表中没有这个人，刷新整个好友列表
    await getfriends();
  }
}

onMounted(async () => {
  await getinfo();
  await getfriends();

  socket.on("private-message", ({ from, to }) => {
    From.value = from;
    console.log('收到消息通知:', { from, to, currentUser: userid.value });
    
    // 确保消息是发给当前用户的，或者是当前用户发送的
    if (to.toString() === userid.value.toString()) {
      // 收到别人发来的消息，显示小红点
      updateFriendMessage(from);
    } else if (from.toString() === userid.value.toString()) {
      // 自己发送的消息，更新lastChat但不显示小红点
      updateFriendMessage(to, false);
    }
  });

  // 监听头像更新事件
  socket.on("avatar-updated", (data) => {
    // 更新好友列表中对应好友的头像
    const friendIndex = friends.value.findIndex(
      (friend) => friend.id.toString() === data.userId.toString()
    );
    if (friendIndex !== -1) {
      friends.value[friendIndex].avatar = data.newAvatarUrl;
    }
    
    // 如果是自己的头像更新，则更新左下角的头像显示
    if (data.userId.toString() === userid.value.toString()) {
      userava.value = data.newAvatarUrl;
      avatarKey.value = Date.now(); // 强制刷新头像显示
    }
  });

  // 监听刷新好友列表事件（转发消息后触发）
  socket.on("refresh-friend-list", () => {
    getfriends();
  });

  // 点击其他地方关闭右键菜单
  document.addEventListener("click", hideContextMenu);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", hideContextMenu);
});

// 显示右键菜单
function showContextMenu(event, friend) {
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    friend: friend,
  };
}

// 隐藏右键菜单
function hideContextMenu() {
  contextMenu.value.show = false;
}

// 一键清空所有聊天记录
async function clearAllChats() {
  if (confirm("确定要清空所有聊天记录吗？此操作不可恢复！")) {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${import.meta.env.VITE_BASE_URL}/api/chat/messages`, {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      // 清空本地聊天列表
      friends.value = [];
      alert("所有聊天记录已清空！");
    } catch (err) {
      console.error("清空聊天记录失败:", err);
      alert("清空聊天记录失败，请重试！");
    }
  }
  hideContextMenu();
}

// 删除与指定用户的聊天记录
async function deleteChatWith(friend) {
  if (confirm(`确定要删除与${friend.name}的所有聊天记录吗？此操作不可恢复！`)) {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${import.meta.env.VITE_BASE_URL}/api/chat/messages/${friend.id}`,
        {
          headers: {
            authorization: `Bearer ${token}`,
          },
        }
      );

      // 从本地聊天列表中移除该好友
      const index = friends.value.findIndex((f) => f.id === friend.id);
      if (index !== -1) {
        friends.value.splice(index, 1);
      }

      alert(`与${friend.name}的聊天记录已删除！`);
    } catch (err) {
      console.error("删除聊天记录失败:", err);
      alert("删除聊天记录失败，请重试！");
    }
  }
  hideContextMenu();
}

// 显示头像选择器
function showAvatarSelector() {
  avatarSelector.value.show = true;
}

// 隐藏头像选择器
function hideAvatarSelector() {
  avatarSelector.value.show = false;
}

// 触发头像文件选择
function triggerAvatarUpload() {
  avatarFileInput.value.click();
}

// 处理头像文件上传
async function handleAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // 验证文件类型
  if (!file.type.startsWith("image/")) {
    alert("请选择图片文件！");
    return;
  }

  // 验证文件大小（限制为5MB）
  if (file.size > 5 * 1024 * 1024) {
    alert("图片文件大小不能超过5MB！");
    return;
  }

  try {
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);

    // 上传文件到服务器
    const uploadRes = await axios.post(
      `${import.meta.env.VITE_BASE_URL}/api/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          authorization: `Bearer ${token}`,
        },
      }
    );

    const avatarUrl = uploadRes.data.fileUrl;

    // 更新用户头像
    const res = await axios.put(
      `${import.meta.env.VITE_BASE_URL}/api/user/avatar`,
      { avatarUrl },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    );

    // 保存新的token（如果服务器返回了新token）
    if (res.data.token) {
      localStorage.setItem("token", res.data.token);
    }

    // 更新本地头像
    userava.value = avatarUrl;
    avatarKey.value = Date.now(); // 使用时间戳强制刷新头像显示

    // 强制DOM更新
    await nextTick();

    // 刷新用户信息和好友列表
    await getinfo();
    await getfriends();

    // 通过Socket通知其他用户头像更新
    socket.emit("avatar-updated", {
      userId: userid.value,
      newAvatarUrl: avatarUrl,
    });

    alert("头像上传成功！");
    hideAvatarSelector();

    // 清空文件输入
    if (avatarFileInput.value) {
      avatarFileInput.value.value = "";
    }
  } catch (err) {
    console.error("头像上传失败:", err);
    alert("头像上传失败，请重试！");
  }
}

// 选择预设头像
async function selectAvatar(avatarUrl) {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.put(
      `${import.meta.env.VITE_BASE_URL}/api/user/avatar`,
      { avatarUrl },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    );

    // 保存新的token（如果服务器返回了新token）
    if (res.data.token) {
      localStorage.setItem("token", res.data.token);
    }

    // 更新本地头像
    userava.value = avatarUrl;
    avatarKey.value = Date.now(); // 使用时间戳强制刷新头像显示

    // 强制DOM更新
    await nextTick();

    // 刷新用户信息和好友列表
    await getinfo();
    await getfriends();

    // 通过Socket通知其他用户头像更新
    socket.emit("avatar-updated", {
      userId: userid.value,
      newAvatarUrl: avatarUrl,
    });

    alert("头像更换成功！");
    hideAvatarSelector();
  } catch (err) {
    console.error("头像更换失败:", err);
    alert("头像更换失败，请重试！");
  }
}

// 搜索处理方法
let searchTimeout = null;
async function handleSearch() {
  // 清除之前的搜索定时器
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  // 如果搜索关键词为空，清空搜索结果
  if (!searchKeyword.value.trim()) {
    searchResults.value = [];
    isSearching.value = false;
    return;
  }
  
  // 设置搜索状态
  isSearching.value = true;
  
  // 防抖处理，500ms后执行搜索
  searchTimeout = setTimeout(async () => {
    try {
      const token = localStorage.getItem("token");
      
      // 只调用用户搜索接口
      const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/chat/search/users`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          keyword: searchKeyword.value,
          page: 1,
          limit: 20
        }
      });
      
      console.log("用户搜索响应:", response.data);
      
      if (response.data && response.data.success) {
        const userResults = response.data.data.results || [];
        // 为用户结果添加类型标识
        searchResults.value = userResults.map(user => ({
          ...user,
          resultType: 'user'
        }));
      } else {
        console.error("搜索失败:", response.data?.message || "未知错误");
        searchResults.value = [];
      }
      
    } catch (error) {
      console.error("搜索请求失败:", error.response?.data || error.message);
      searchResults.value = [];
    } finally {
      isSearching.value = false;
    }
  }, 500);
}

// 跳转到搜索结果对应的聊天
function jumpToSearchResult(result) {
  // 找到对应的好友
  const friend = friends.value.find(f => 
    f.id.toString() === result.from.toString() || 
    f.id.toString() === result.to.toString()
  );
  
  if (friend) {
    // 切换到对应的聊天
    switchChat(friend);
    // 清空搜索
    searchKeyword.value = "";
    searchResults.value = [];
  }
}

// 跳转到用户聊天
function jumpToUserChat(user) {
  // 找到对应的好友
  const friend = friends.value.find(f => 
    f.id.toString() === user._id.toString() || 
    f.name === user.name
  );
  
  if (friend) {
    // 切换到对应的聊天
    switchChat(friend);
  } else {
    // 如果好友列表中没有，可能需要添加到好友列表或直接开始聊天
    console.log('用户不在好友列表中:', user);
  }
  
  // 清空搜索
  searchKeyword.value = "";
  searchResults.value = [];
}

onBeforeUnmount(() => {
  document.removeEventListener("click", hideContextMenu);
  socket.off("private-message");
  socket.off("avatar-updated");
  socket.off("refresh-friend-list");
});
</script>

<style scoped lang="scss">
:root {
  --primary-color: #4caf50;
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

.set {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  /* flex-direction: column; */
  height: 100%;
  width: 100%;
  z-index: 999;
  cursor: pointer;
}

.set_ {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.5rem;
  white-space: wrap;
  flex-wrap: wrap;
  transition: all 1.5s ease;
  -webkit-app-region: no-drag;
}

.set_:hover {
  font-size: 3rem;
}

.set_:first-child {
  color: #444444;
  background-color: #f9f9f9;
  border: none;
}
.set_:nth-child(2) {
  background-color: rgba(220, 225, 230, 1);
  color: #2c3e50;
  border: none;
}

.set_:last-child {
  color: #5c4033;
  background-color: rgba(255, 235, 215, 1);
  border: none;
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
.setting,
.avatar,
.chat-list,
.chatroom button {
  -webkit-app-region: no-drag;
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

.chatroom {
  position: absolute;
  right: 0;

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
      content: "加入聊天室";
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

/* 中间区域 */
.middle {
  height: 15rem;
  padding: 2rem 1rem;
  position: relative;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.setting {
  position: absolute;
  top: 1rem;
  right: 1rem;
  cursor: pointer;
}

.avatar {
  width: 100%;
  max-width: 120px;
  /* margin-bottom: 1rem; */
  display: flex;
  justify-content: center;
  cursor: pointer;
  position: relative;

  &:hover .avatar-overlay {
    opacity: 1;
  }
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 10%;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.3s ease;
  color: white;
  font-size: 1.5rem;
  width: 80%;
}

.frame {
  width: 80%;
  /* width: 100%; */
  border-radius: 50%;
  overflow: hidden;
  aspect-ratio: 1/1;
  box-shadow: var(--shadow);

  img {
    max-width: 100%;
    aspect-ratio: 1/1;
    object-fit: cover;
  }
}

.friendname {
  font-size: 1.2rem;
  font-weight: 600;
  /* margin-bottom: 0.5rem; */
}

/* 新的状态显示样式 */
.status-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-radius: 20px;
  background-color: rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.3s ease;
  width: fit-content;

  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
    transform: scale(1.05);
  }

  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    animation: pulse 2s infinite;

    &.online {
      background-color: #4caf50;
      box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
    }

    &.busy {
      background-color: #ff5252;
      box-shadow: 0 0 8px rgba(255, 82, 82, 0.6);
    }
  }

  .status-text {
    font-size: 0.9rem;
    font-weight: 500;
    color: #666;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(0.9);
  }
}

.search {
  width: 100%;
  max-width: 300px;
  margin-top: 1rem;

  input {
    width: 80%;
    padding: 0.75rem 2.5rem 0.75rem 1rem;
    border: none;
    border-radius: 20px;
    background-color: rgba(0, 0, 0, 0.05);
    font-size: 0.9rem;
    transition: all 0.3s ease;
  }
}

/* 底部聊天列表 */
.bottom {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.head {
  margin-top: 50px;
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
  /* flex: 0 0 25%; */

  &:hover {
    background-color: rgba(0, 0, 0, 0.02);
  }
}

/* 搜索结果样式 */
.search-results-container {
  padding: 0;
}

.search-section {
  margin-bottom: 1rem;
}

.search-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  font-size: 0.9rem;
  color: #666;
}

.section-title {
  font-weight: 500;
}

.section-count {
  background-color: #007aff;
  color: white;
  padding: 0.2rem 0.5rem;
  border-radius: 10px;
  font-size: 0.8rem;
  min-width: 20px;
  text-align: center;
}

.search-results-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.search-result-item {
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: background-color 0.3s ease;
  cursor: pointer;
  position: relative;
  border-left: 3px solid #4caf50;

  &:hover {
    background-color: rgba(76, 175, 80, 0.05);
  }

  .detail {
    flex: 1;
    min-width: 0;

    .search-time {
      color: #999;
      font-size: 0.75rem;
      margin-top: 0.25rem;
    }

    .info {
      /* 高亮样式 */
      :deep(mark) {
        background-color: #ffeb3b;
        color: #333;
        padding: 0 2px;
        border-radius: 2px;
        font-weight: bold;
      }
    }
  }
}

.user-result {
  .detail .user-info {
    color: #999;
    font-size: 0.8rem;
  }
}

.message-result {
  .search-time {
    font-size: 0.75rem;
    color: #999;
    margin-top: 0.2rem;
  }
}

/* 搜索状态样式 */
.search-status {
  padding: 2rem;
  text-align: center;
  color: #666;

  .loading {
    font-size: 0.9rem;
    color: #4caf50;
  }

  .no-results {
    font-size: 0.9rem;
    color: #999;
  }
}

.avatar-box {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  flex-shrink: 0;
  position: relative;
}
.avatar-small {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

/* 未读消息徽章 - 微信风格 */
.unread-badge {
  position: absolute;
  color: white;
  top: -4px;
  right: -4px;
  background-color: #ff4444;
  border-radius: 10px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 11px;
  font-weight: bold;
  z-index: 10;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.unread-text {
  font-weight: 600 !important;
  color: #333 !important;
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

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 200px;
  padding: 4px 0;
}

.context-menu-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background-color: #f5f5f5;
  }

  &:first-child:hover {
    background-color: #fff3cd;
  }

  &:last-child:hover {
    background-color: #f8d7da;
  }
}

.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 999;
}

/* 头像选择器样式 */
.avatar-selector {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-selector-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000; /* 确保覆盖层不会阻止其他元素的交互 */
}

.avatar-selector-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  z-index: 1002;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);

  h3 {
    margin: 0 0 20px 0;
    text-align: center;
    color: #333;
  }
}

.upload-section {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.upload-btn {
  display: flex;
  gap: 8px;
  padding: 0.8rem 1.5rem;
  // background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: rgb(179, 81, 81);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  img {
    width: 24px;
    height: 24px;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }
}

.divider {
  text-align: center;
  margin: 1.5rem 0;
  color: #666;
  font-size: 0.9rem;
  position: relative;

  &::before,
  &::after {
    content: "";
    position: absolute;
    top: 50%;
    width: 40%;
    height: 1px;
    background: #ddd;
  }

  &::before {
    left: 0;
  }

  &::after {
    right: 0;
  }
}

.avatar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.avatar-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: #4caf50;
    background-color: #f8f9fa;
  }

  img {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    object-fit: cover;
    margin-bottom: 8px;
  }

  span {
    font-size: 12px;
    color: #666;
    text-align: center;
  }
}

.avatar-selector-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.cancel-btn {
  padding: 8px 24px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background-color: #f5f5f5;
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
}
</style>
