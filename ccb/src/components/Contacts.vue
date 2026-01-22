<template>
  <div class="contacts">
    <div class="top">
      <div class="top_child">
        <input type="button" value="◁" @click="back" id="button" />
        <span>通讯录</span>
        <!-- 添加按钮 -->
        <div class="add-menu-container">
          <button class="add-btn" @click="toggleAddMenu">+</button>
          <div v-if="showAddMenu" class="add-dropdown-menu">
            <div class="add-menu-item" @click="showAddFriendSearch">
              <font-awesome-icon icon="user-plus" />
              <span>加好友</span>
            </div>
            <div class="add-menu-item" @click="showCreateGroupDialog">
              <font-awesome-icon icon="users" />
              <span>新建群聊</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Tab 切换 -->
    <div class="tabs">
      <div 
        class="tab-item" 
        :class="{ active: activeTab === 'friends' }"
        @click="activeTab = 'friends'"
      >
        好友
      </div>
      <div 
        class="tab-item" 
        :class="{ active: activeTab === 'groups' }"
        @click="activeTab = 'groups'"
      >
        群聊
      </div>
    </div>
    
    <div class="bottom">
      <!-- 好友列表 Tab -->
      <div v-if="activeTab === 'friends'">
        <!-- 搜索联系人功能 -->
        <div class="contact-search" v-if="showSearchInput">
          <input
            type="text"
            placeholder="搜索联系人或添加新好友..."
            v-model="searchKeyword"
            @input="handleSearch"
            class="search-input"
          />
        </div>
        
        <!-- 显示搜索结果或好友列表 -->
        <div v-if="!searchKeyword || searchKeyword.trim() === ''">
          <!-- 好友列表 -->
          <ul class="chat-list" v-if="friends.length > 0">
            <li
              class="chat-item"
              v-for="friend in friends"
              :key="friend.id"
              @click="switchChat(friend)"
              @contextmenu.prevent="showContextMenu($event, friend)"
            >
              <div class="avatar-box">
                <div class="avatar-small">
                  <img :src="getAvatarUrl(friend.avatar)" alt="图片" @error="handleAvatarError" />
                  <!-- 在线状态指示器 -->
                  <span 
                    class="online-status-dot" 
                    :class="{ online: isUserOnline(friend.id) }"
                    :title="isUserOnline(friend.id) ? '在线' : '离线'"
                  ></span>
                </div>
              </div>
              <div class="detail">
                <div class="name">{{ friend.name }}</div>
              </div>
            </li>
          </ul>
          
          <!-- 空状态提示 -->
          <div v-else class="empty-state">
            <div class="empty-icon"><Group class="empty-community-icon" /></div>
            <p class="empty-text">暂无好友</p>
            <p class="empty-subtext">点击右上角"+"添加好友</p>
          </div>
        </div>
        
        <!-- 搜索中提示 -->
        <div v-else-if="isSearching" class="search-status">
          <div class="loading">搜索中...</div>
        </div>
        
        <!-- 用户搜索结果列表 -->
        <div v-else-if="searchResults.length > 0" class="search-results-container">
          <div class="search-section">
            <div class="search-section-header">
              <span class="section-title">搜索结果</span>
              <span class="section-count">{{ searchResults.length }}</span>
            </div>
            <ul class="search-results-list">
              <li
                v-for="user in searchResults"
                :key="'user-' + user._id"
                class="search-result-item user-result"
                :class="{ 'already-friend-item': user.isAlreadyFriend }"
                @click="user.isAlreadyFriend ? null : showAddFriendDialog(user)"
              >
                <div class="avatar-box">
                  <div class="avatar-small">
                    <img :src="getAvatarUrl(user.uAvatar)" alt="头像" @error="handleAvatarError" />
                  </div>
                </div>
                <div class="detail">
                  <div class="name" v-html="user.highlightedName || user.uName || user.name"></div>
                  <div class="info" :class="{ 'already-friend': user.isAlreadyFriend }">
                    {{ user.isAlreadyFriend ? '已经是好友' : '点击添加好友' }}
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
        
        <!-- 无搜索结果 -->
        <div v-else-if="searchKeyword.trim() !== ''" class="no-results">
          <p>未找到相关用户</p>
        </div>
      </div>
      
      <!-- 群聊列表 Tab -->
      <div v-if="activeTab === 'groups'">
        <ul class="chat-list" v-if="groups.length > 0">
          <li
            class="chat-item"
            v-for="group in groups"
            :key="group.RoomID"
            @click="switchToGroup(group)"
          >
            <div class="avatar-box">
              <div class="avatar-small group-avatar">
                <GroupAvatar :members="group.Members" :size="48" />
              </div>
            </div>
            <div class="detail">
              <div class="name">{{ group.RoomName }}</div>
              <div class="info">{{ group.Members.length }} 人</div>
            </div>
          </li>
        </ul>
        
        <!-- 空状态提示 -->
        <div v-else class="empty-state">
          <div class="empty-icon"><Group class="empty-community-icon" /></div>
          <p class="empty-text">暂无群聊</p>
          <p class="empty-subtext">点击右上角"+"创建群聊</p>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.show"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <div class="context-menu-item" @click="deleteFriend">
        <img
          src="/images/icon/delete-2.png"
          alt="删除"
          style="width: 16px; height: 16px"
        />
        删除好友
      </div>
    </div>

    <!-- 遮罩层，点击关闭菜单 -->
    <div
      v-if="contextMenu.show"
      class="context-menu-overlay"
      @click="hideContextMenu"
    ></div>
  </div>

  <!-- 添加好友弹窗 -->
  <div v-if="showAddFriendModal" class="modal-overlay" @click="closeAddFriendDialog">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>添加好友</h3>
        <button class="close-btn" @click="closeAddFriendDialog">&times;</button>
      </div>
      <div class="modal-body">
        <div class="user-info">
          <img 
            :src="getAvatarUrl(selectedUser.uAvatar)" 
            alt="用户头像" 
            class="user-avatar"
          />
          <div class="user-details">
            <h4>{{ selectedUser.uName || selectedUser.name }}</h4>
            <p class="user-id">ID: {{ selectedUser._id || selectedUser.id }}</p>
          </div>
        </div>
        <p class="confirm-text">确认要添加该用户为好友吗？</p>
      </div>
      <div class="modal-footer">
        <button 
          class="btn-cancel" 
          @click="closeAddFriendDialog"
          :disabled="isAddingFriend"
        >
          取消
        </button>
        <button 
          class="btn-confirm" 
          @click="confirmAddFriend"
          :disabled="isAddingFriend"
        >
          {{ isAddingFriend ? '添加中...' : '确认添加' }}
        </button>
      </div>
    </div>
  </div>
  
  <!-- 创建群聊弹窗 -->
  <div v-if="showCreateGroupModal" class="modal-overlay" @click="closeCreateGroupDialog">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>创建群聊</h3>
        <button class="close-btn" @click="closeCreateGroupDialog">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>群名称</label>
          <input
            v-model="newGroupName"
            type="text"
            placeholder="请输入群名称"
            maxlength="20"
            class="group-name-input"
          />
        </div>
        <div class="form-group">
          <label>选择成员 ({{ selectedFriends.length }})</label>
          <div class="friend-selection-list">
            <div
              v-for="friend in friends"
              :key="friend.id"
              class="friend-selection-item"
              @click="toggleFriendSelection(friend.id)"
            >
              <input 
                type="checkbox" 
                :checked="selectedFriends.includes(friend.id)"
                @click.stop
              />
              <img :src="getAvatarUrl(friend.avatar)" alt="头像" />
              <span>{{ friend.name }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button 
          class="btn-cancel" 
          @click="closeCreateGroupDialog"
        >
          取消
        </button>
        <button 
          class="btn-confirm" 
          @click="createGroupChat"
          :disabled="!newGroupName.trim() || selectedFriends.length === 0"
        >
          创建
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import axios from "axios";
import { ref, onMounted, onBeforeUnmount } from "vue";
import { defineEmits } from "vue";
import { useChatStore } from "../stores/useChatStore";
import { useOnlineStatus } from "../composables/useOnlineStatus";
import { useToast } from '../composables/useToast';
import { useConfirm } from '../composables/useConfirm';
import { useRouter } from 'vue-router';
import { Group } from '@iconoir/vue';
import { getAvatarUrl } from '../utils/avatarHelper';
import GroupAvatar from './GroupAvatar.vue';

const { isUserOnline } = useOnlineStatus()
const toast = useToast()
const { confirm } = useConfirm()
const router = useRouter()

const friends = ref([]);
const groups = ref([]); // 群聊列表
const activeTab = ref('friends'); // 当前激活的tab
const searchKeyword = ref("");
const filteredFriends = ref([]);
const searchResults = ref([]);
const isSearching = ref(false);
const showAddFriendModal = ref(false);
const selectedUser = ref(null);
const isAddingFriend = ref(false);
const showAddMenu = ref(false);
const showSearchInput = ref(false);

// 右键菜单状态
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  friend: null,
});

const chatStore = useChatStore();

const emit = defineEmits(["hidecontacts", "changecolor", "todetail"]);
function back() {
  emit("hidecontacts", "关掉聊天");
}

// 切换添加菜单
function toggleAddMenu() {
  showAddMenu.value = !showAddMenu.value
}

// 显示添加好友搜索
function showAddFriendSearch() {
  showAddMenu.value = false
  showSearchInput.value = true
  activeTab.value = 'friends'
}

// 显示创建群聊对话框
const showCreateGroupModal = ref(false)
const newGroupName = ref('')
const selectedFriends = ref([])

function showCreateGroupDialog() {
  showAddMenu.value = false
  showCreateGroupModal.value = true
  activeTab.value = 'groups'
}

// 切换好友选择
function toggleFriendSelection(friendId) {
  const index = selectedFriends.value.indexOf(friendId)
  if (index > -1) {
    selectedFriends.value.splice(index, 1)
  } else {
    selectedFriends.value.push(friendId)
  }
}

// 创建群聊
async function createGroupChat() {
  if (!newGroupName.value.trim()) {
    toast.warning('请输入群名称')
    return
  }
  
  if (selectedFriends.value.length === 0) {
    toast.warning('请至少选择一个好友')
    return
  }
  
  try {
    const token = localStorage.getItem("token")
    const res = await axios.post(
      `${import.meta.env.VITE_BASE_URL}/room/create`,
      {
        groupName: newGroupName.value,
        memberIds: selectedFriends.value
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )
    
    if (res.data.success) {
      toast.success('群聊创建成功！')
      showCreateGroupModal.value = false
      newGroupName.value = ''
      selectedFriends.value = []
      
      // 重新加载群聊列表
      await loadGroups()
      
      // 自动跳转到新创建的群聊
      if (res.data.room) {
        switchToGroup(res.data.room)
      }
    }
  } catch (err) {
    console.error('创建群聊失败:', err)
    toast.error(err.response?.data?.message || '创建群聊失败')
  }
}

// 关闭创建群聊对话框
function closeCreateGroupDialog() {
  showCreateGroupModal.value = false
  newGroupName.value = ''
  selectedFriends.value = []
}

// 切换到群聊 - 使用统一的聊天页面
function switchToGroup(group) {
  chatStore.switchChatUser(group.RoomID)
  emit('todetail', {
    uname: group.RoomName,
    img: '', // 群聊使用 GroupAvatar 组件
    userId: group.RoomID,
    chatType: 'group',
    groupMembers: group.Members
  })
}

// 获取群聊列表
async function loadGroups() {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(`${import.meta.env.VITE_BASE_URL}/room/list`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (res.data.success) {
      groups.value = res.data.groups || [];
    }
  } catch (err) {
    console.error('获取群聊列表失败:', err);
  }
}


// 搜索联系人功能
let searchTimeout = null;
async function handleSearch() {
  // 清除之前的搜索定时器
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  // 如果搜索关键词为空，清空搜索结果
  if (!searchKeyword.value.trim()) {
    filteredFriends.value = [];
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
      
      // 调用用户搜索接口
      const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/user/search`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          query: searchKeyword.value
        }
      });
      if (response.data && response.data.users) {
        const userResults = response.data.users || [];
        
        // 为用户结果添加类型标识和高亮名称
        searchResults.value = userResults.map(user => ({
          ...user,
          resultType: 'user',
          isAlreadyFriend: user.isFriend,
          highlightedName: highlightSearchTerm(user.uName, searchKeyword.value),
          name: user.uName // 保持兼容性
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

// 显示添加好友弹窗
function showAddFriendDialog(user) {
  selectedUser.value = user;
  showAddFriendModal.value = true;
}

// 关闭添加好友弹窗
function closeAddFriendDialog() {
  showAddFriendModal.value = false;
  selectedUser.value = null;
  isAddingFriend.value = false;
}

// 高亮搜索关键词
function highlightSearchTerm(text, term) {
  if (!text || !term) return text;
  
  const regex = new RegExp(`(${term})`, 'gi');
  return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}

// 确认添加好友
async function confirmAddFriend() {
  if (!selectedUser.value || isAddingFriend.value) return;
  
  isAddingFriend.value = true;
  
  try {
    const token = localStorage.getItem("token");
    
    // 调试：打印用户信息
    // 获取用户ID
    const friendId = selectedUser.value.uID || selectedUser.value.id;
    
    if (!friendId) {
      throw new Error("无法获取用户ID");
    }
    
    const res = await axios.post(
      `${import.meta.env.VITE_BASE_URL}/api/user/add`,
      {
        friendId: friendId // 保持字符串格式
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    );

    toast.success(res.data.message);
    closeAddFriendDialog();

    // 刷新好友列表
    await initFriends();

  } catch (error) {
    console.error("添加好友失败:", error);
    toast.error(error.response?.data?.message || "添加好友失败，请重试");
  } finally {
    isAddingFriend.value = false;
  }
}

// 初始化好友列表
async function initFriends() {
  try {
    const token = localStorage.getItem("token");
    const res = await axios(`${import.meta.env.VITE_BASE_URL}/api/user/friends`, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const newFriends = Array.isArray(res.data) ? res.data : [];

    if (newFriends.length === 0) {
      friends.value = [];
      return;
    }

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
          lastMessage: msgRes.data?.content || "",
          lastTime: msgRes.data?.time || "",
        }))
        .catch((err) => {
          console.error(`初始化时获取${friend.name}的消息失败`, err);
          return { id: friend.id, lastMessage: "", lastTime: "" };
        })
    );

    const lastMessages = await Promise.all(lastMsgPromises);

    transformedFriends.forEach((friend) => {
      const msg = lastMessages.find((m) => m.id === friend.id);
      Object.assign(friend, {
        lastMessage: msg?.lastMessage || "",
        lastTime: msg?.lastTime || "",
        isNewmsg: false,
      });
    });

    friends.value = [...transformedFriends]; // 确保这里是响应式更新
  } catch (err) {
    console.error("初始化联系人或消息失败:", err);
  }
}

// UI切换聊天页
function switchChat(friend) {
  chatStore.switchChatUser(friend.id);
  emit("todetail", { uname: friend.name, img: friend.img, userId: friend.id });
}

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

// 删除好友
async function deleteFriend() {
  if (!contextMenu.value.friend) return;
  
  const friendName = contextMenu.value.friend.name;
  const friendId = contextMenu.value.friend.id;
  
  const confirmed = await confirm({
    title: '删除好友',
    message: `确定要删除好友 ${friendName} 吗？`
  })
  
  if (confirmed) {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${import.meta.env.VITE_BASE_URL}/api/user/friend/${friendId}`,
        {
          headers: {
            authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("删除好友成功！");
      hideContextMenu();

      // 刷新好友列表
      await initFriends();
    } catch (error) {
      console.error("删除好友失败:", error);
      toast.error(error.response?.data?.message || "删除好友失败，请重试");
    }
  }
  hideContextMenu();
}

// 初始化 friends 数组（获取好友基本信息和最近聊天内容）
onMounted(async () => {
  await initFriends();
  await loadGroups(); // 加载群聊列表
  
  // 点击其他地方关闭右键菜单
  document.addEventListener("click", hideContextMenu);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", hideContextMenu);
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
  
  span {
    flex: 1;
  }
  
  .add-menu-container {
    position: relative;
    
    .add-btn {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 50%;
      background: var(--primary-gradient, linear-gradient(135deg, rgba(165, 42, 42, 0.9) 0%, rgba(140, 35, 35, 0.95) 100%));
      color: white;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      
      &:hover {
        transform: scale(1.1);
      }
    }
    
    .add-dropdown-menu {
      position: absolute;
      top: 40px;
      right: 0;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      min-width: 150px;
      z-index: 100;
      
      .add-menu-item {
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        transition: background 0.2s;
        
        &:hover {
          background: rgba(165, 42, 42, 0.05);
        }
        
        &:first-child {
          border-radius: 8px 8px 0 0;
        }
        
        &:last-child {
          border-radius: 0 0 8px 8px;
        }
      }
    }
  }
}

/* Tab 切换样式 */
.tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  background: var(--bg-tertiary, white);
  
  .tab-item {
    flex: 1;
    padding: 12px 0;
    text-align: center;
    cursor: pointer;
    position: relative;
    transition: all 0.3s ease;
    font-weight: 500;
    color: var(--text-secondary, #666);
    
    &.active {
      color: var(--primary-color, rgba(165, 42, 42, 1));
      
      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 40px;
        height: 3px;
        background: var(--primary-gradient, linear-gradient(135deg, rgba(165, 42, 42, 0.9) 0%, rgba(140, 35, 35, 0.95) 100%));
        border-radius: 3px 3px 0 0;
      }
    }
    
    &:hover:not(.active) {
      background: rgba(165, 42, 42, 0.02);
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
    border: 1px solid var(--border-color-light, #e0e0e0);
    border-radius: 20px;
    background-color: var(--bg-secondary, rgba(0, 0, 0, 0.05));
    font-size: 0.9rem;
    transition: all 0.3s ease;
    
    &:focus {
      outline: none;
      border-color: var(--primary-color, #007bff);
      background-color: var(--bg-tertiary, white);
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
    background-color: var(--hover-bg, rgba(165, 42, 42, 0.02));
  }
}

.avatar-small {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  flex-shrink: 0;
  position: relative;
  /* border: 1px solid black; */

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
  
  &.group-avatar {
    border-radius: 10px;
    overflow: hidden;
    
    img {
      border-radius: 0;
    }
  }
  
  /* 在线状态指示器 */
  .online-status-dot {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: var(--text-light, #d0d0d0); /* 离线：灰色 */
    border: 2px solid var(--bg-tertiary, white);
    box-shadow: 0 0 3px rgba(0, 0, 0, 0.2);
    transition: background-color 0.3s ease;
    z-index: 10;
    
    &.online {
      background-color: var(--success-color, #52c41a); /* 在线：绿色 */
      box-shadow: 0 0 6px var(--success-color, rgba(82, 196, 26, 0.5));
    }
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
}

/* 搜索结果样式 */
.search-status {
  padding: 2rem;
  text-align: center;
  color: #666;
  
  .loading {
    font-size: 0.9rem;
  }
}

.search-results-container {
  flex: 1;
  overflow-y: auto;
}

.search-section {
  margin-bottom: 1rem;
}

.search-section-header {
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.02);
  border-bottom: 1px solid #e0e0e0;
  
  .section-title {
    font-weight: 600;
    color: #333;
    font-size: 0.9rem;
  }
  
  .section-count {
    color: #666;
    font-size: 0.8rem;
    background-color: rgba(0, 0, 0, 0.1);
    padding: 0.25rem 0.5rem;
    border-radius: 10px;
  }
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
  border-bottom: 1px solid #f0f0f0;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.02);
  }
  
  &.user-result {
    .detail {
      .info {
        color: #007bff;
        font-size: 0.8rem;
        
        &.already-friend {
          color: #28a745;
        }
      }
    }
    
    &.already-friend-item {
      cursor: default;
      opacity: 0.7;
      
      &:hover {
        background-color: transparent;
      }
    }
  }
}

/* 添加好友弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background-color: var(--bg-tertiary, white);
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

.modal-header {
  padding: 1.5rem 1.5rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e0e0e0;
  
  h3 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 600;
    color: #333;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #999;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    
    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
      color: #333;
    }
  }
}

.modal-body {
  padding: 1.5rem;
  
  .user-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    
    .user-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .user-details {
      h4 {
        margin: 0 0 0.25rem;
        font-size: 1.1rem;
        color: #333;
      }
      
      .user-id {
        margin: 0;
        font-size: 0.8rem;
        color: #666;
      }
    }
  }
  
  .confirm-text {
    margin: 0;
    text-align: center;
    color: #666;
    font-size: 0.95rem;
  }
}

.modal-footer {
  padding: 1rem 1.5rem 1.5rem;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  
  button {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    &.btn-cancel {
      background-color: #f0f0f0;
      color: #666;
      
      &:hover:not(:disabled) {
        background-color: #e0e0e0;
      }
    }
    
    &.btn-confirm {
      background-color: #007bff;
      color: white;
      
      &:hover:not(:disabled) {
        background-color: #0056b3;
      }
    }
  }
}

/* 创建群聊弹窗特定样式 */
.form-group {
  margin-bottom: 1.5rem;
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #333;
  }
  
  .group-name-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 0.9rem;
    
    &:focus {
      outline: none;
      border-color: #007bff;
    }
  }
}

.friend-selection-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 6px;
  
  .friend-selection-item {
    padding: 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    transition: background 0.2s;
    
    &:hover {
      background: #f5f5f5;
    }
    
    input[type="checkbox"] {
      cursor: pointer;
    }
    
    img {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
    }
    
    span {
      font-size: 0.9rem;
    }
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
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

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  background: var(--bg-tertiary, white);
  border: 1px solid var(--border-color, #ddd);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 150px;
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
    background-color: #f8d7da;
    color: #dc3545;
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

/* 搜索高亮样式 */
.search-highlight {
  background-color: rgba(165, 42, 42, 0.2);
  color: rgba(165, 42, 42, 1);
  font-weight: 600;
  padding: 1px 2px;
  border-radius: 3px;
}

/* 搜索结果样式 */
.search-results-container {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.search-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(240, 240, 240, 0.8);
  border-bottom: 1px solid #e0e0e0;
  font-size: 14px;
  font-weight: 600;
  color: #666;
}

.search-results-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.search-result-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(.already-friend-item) {
    background-color: var(--hover-bg, rgba(165, 42, 42, 0.05));
  }

  &.already-friend-item {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: var(--bg-secondary, rgba(240, 240, 240, 0.3));
  }

  .detail {
    flex: 1;
    margin-left: 12px;

    .name {
      font-size: 15px;
      font-weight: 500;
      color: #333;
      margin-bottom: 2px;
    }

    .email {
      font-size: 12px;
      color: #888;
    }

    .friend-status {
      font-size: 11px;
      color: #999;
      font-style: italic;
    }
  }
}

.search-status {
  padding: 40px 16px;
  text-align: center;
  color: #666;
  font-size: 14px;
}

/* 空状态样式 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #999;

  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
    color: #ccc;
    display: flex;
    align-items: center;
    justify-content: center;

    .empty-community-icon {
      width: 48px;
      height: 48px;
      stroke-width: 1.5;
    }
  }
  
  .empty-text {
    font-size: 1.1rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: #666;
  }
  
  .empty-subtext {
    font-size: 0.9rem;
    line-height: 1.4;
    max-width: 300px;
  }
}

/* 响应式空状态 */
@media (max-width: 768px) {
  .empty-state {
    padding: 2rem 1rem;
    
    .empty-icon {
      font-size: 2.5rem;
    }
    
    .empty-text {
      font-size: 1rem;
    }
    
    .empty-subtext {
      font-size: 0.85rem;
    }
  }
}
</style>
