<template>
  <div class="sidebar">
    <div class="logo">
      <img
        src="/images/ai-logo.png"
        alt="LOGO"
        title="AI智能小助手"
        @click="toAI"
      />
    </div>
    <div class="toolbar">
      <ul>
        <li><font-awesome-icon icon="comment" title="聊天" @click="chat" /></li>
        <li>
          <font-awesome-icon icon="users" title="通讯录" @click="contacts" />
        </li>
        <li>
          <font-awesome-icon
            :icon="['fas', 'eye']"
            title="朋友圈"
            @click="tocsdn"
          />
        </li>
        <li>
          <font-awesome-icon icon="star" title="收藏夹" @click="togithub" />
        </li>
      </ul>
    </div>
    <div class="privacy">
      <div class="avatar" @click="logout"><img :src="avatar || '/images/avatar/out.webp'" alt="" /></div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { onMounted, onBeforeUnmount } from "vue";
import axios from "axios";
import { socket } from "../../utils/socket";
import { useRouter } from "vue-router";
const emit = defineEmits(["showchat", "showcontacts", "todetail"]);
const router = useRouter();

const avatar = ref("");

function toAI() {
  emit("todetail", "打开AI小助手");
}

function chat() {
  emit("showchat", "打开聊天");
}
function contacts() {
  emit("showcontacts", "打开联系人");
}

function tocsdn() {
  router.push("/moments");
}

function togithub() {
  router.push("/favorites");
}

function logout() {
  localStorage.clear();
  location.reload();
}
onMounted(async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(`${import.meta.env.VITE_BASE_URL}/user/info`, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    avatar.value = res.data.ava;

    // 监听头像更新事件
    socket.on("avatar-updated", (data) => {
      // 如果是当前用户的头像更新，则更新本地头像
      const currentUserId = JSON.parse(atob(token.split(".")[1])).uid;
      if (data.userId.toString() === currentUserId.toString()) {
        avatar.value = data.newAvatarUrl;
      }
    });
  } catch (err) {
    console.error("用户头像获取失败：", err);
  }
});

onBeforeUnmount(() => {
  socket.off("avatar-updated");
});
</script>

<style scoped lang="scss">
* {
  padding: 0;
  margin: 0;
}
.sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.logo {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  /* border-bottom: 1px solid red; */
  -webkit-app-region: no-drag;
  border-radius: 50%;
  margin-top: 10%;

  img {
    width: 70%;
    border-radius: 50%;
  }

  img:hover {
    border-radius: 50%;
    box-shadow: 0 0 5px 1px rgba(0, 0, 0, 0.5);
    cursor: pointer;
  }
}

.toolbar {
  flex: 1 1 40%;
  -webkit-app-region: no-drag;
  /* border: 1px solid blue; */
}
.privacy {
  flex: 1;
  /* border: 1px solid green; */
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  /* border-bottom: 1px solid red; */
}
img {
  width: 100%;
  aspect-ratio: 1/1;
  object-fit: cover;
}
ul {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

  li {
    width: 100%;
    list-style-type: none;
    /* border: 1px solid brown; */
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
}

svg {
  /* color: rgba(165, 42, 42, 0.485);
         */
  color: rgba(120, 25, 25, 0.6);
  font-size: 25px;

  &:hover {
    filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.5));
    cursor: pointer;
  }
}

.avatar {
  width: 60%;
  border: 1px solid rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 10%;
  aspect-ratio: 1/1;
  position: relative;
  -webkit-app-region: no-drag;

  &:hover {
    box-shadow: 0 0 5px 2px rgba(0, 0, 0, 0.5);
    cursor: pointer;

    &::after {
      opacity: 1;
    }
  }

  &::after {
    content: "退出登录";
    width: 100%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    background-color: gray;
    display: flex;
    justify-content: center;
    align-items: center;
    white-space: nowrap;
    font-size: small;
    opacity: 0;
    transition: opacity 0.5s ease;
    pointer-events: none;
  }
}

/* 响应式设计 */

/* 大屏幕设备 */
@media (min-width: 1300px) {
  .sidebar {
    border-radius: 0;
    padding: 1rem 0.5rem;
  }

  .logo {
    img {
      border-radius: 0;
      width: 80%;
    }
  }
  
  svg {
    font-size: 28px;
  }
}

/* 平板设备 */
@media (max-width: 1024px) and (min-width: 769px) {
  .sidebar {
    padding: 0.8rem 0.3rem;
  }
  
  .logo {
    margin-top: 8%;
    
    img {
      width: 65%;
    }
  }
  
  svg {
    font-size: 22px;
  }
  
  .avatar {
    width: 55%;
    margin-bottom: 8%;
  }
}

/* 移动设备 - 隐藏侧边栏 */
@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
}

/* 小屏移动设备 */
@media (max-width: 480px) {
  .sidebar {
    display: none;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .logo img:hover,
  svg:hover,
  .avatar:hover {
    transform: scale(1.05);
    transition: transform 0.2s ease;
  }
  
  .avatar::after {
    font-size: 0.8rem;
  }
}

/* 高分辨率屏幕优化 */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .logo img,
  .avatar img {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
  }
}
</style>
