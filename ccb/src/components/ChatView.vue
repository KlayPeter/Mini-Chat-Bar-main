<template>
  <div class="container mobile" ref="container" v-if="isMobile">
    <div class="main-content">
      <div class="section2 mobile" v-if="showlastchats && !showcontent">
        <LastChats
          @hidechat="handlehidechat"
          @changecolor="setcolor"
          @todetail="showdetail"
        />
      </div>
      <div class="section2 mobile" v-if="showcontacts && !showcontent">
        <Contacts @hidecontacts="handlehidecontacts" @todetail="showdetail" />
      </div>
      <router-view
        class="section3"
        v-if="showcontent"
        @closemessage="hidecontent"
      />
    </div>
    <!-- 移动端底部导航栏 -->
    <BottomNavbar
      @showchat="handleshowchat"
      @showcontacts="handleshowcontacts"
      @todetail="showAI"
    />
  </div>
  <div class="container" ref="container" v-else>
    <div class="section1">
      <Sidebar
        @showchat="handleshowchat"
        @showcontacts="handleshowcontacts"
        @todetail="showAI"
      />
    </div>
    <div class="section2" v-if="showlastchats">
      <LastChats
        @hidechat="handlehidechat"
        @changecolor="setcolor"
        @todetail="showdetail"
      />
    </div>
    <div class="section2" v-if="showcontacts">
      <Contacts @hidecontacts="handlehidecontacts" @todetail="showdetail" />
    </div>
    <!-- <div class="section3" v-if="show3"><Content @closemessage="handleclosemessage"/></div> -->
    <!-- 隐藏聊天内容的叉叉要到其它地方不上 -->
    <router-view
      class="section3"
      v-if="showcontent"
      @closemessage="hidecontent"
    />
  </div>
</template>

<script setup>
import Sidebar from "./Sidebar.vue";
import LastChats from "./LastChats.vue";
import Contacts from "./Contacts.vue";
import BottomNavbar from "./BottomNavbar.vue";
import { onMounted, ref, watch } from "vue";
import { nextTick } from "vue";
import { useRouter } from "vue-router";
import { useChatStore } from "../stores/useChatStore";

const theme = ref("beige");
const container = ref(null);
const router = useRouter();
const chatStore = useChatStore();

const showlastchats = ref(true);
const showcontacts = ref(false);
const showcontent = ref(false);

const isMobile = ref(false);

//这里处理contacts板块的显示和隐藏
function handlehidechat(message) {
  showlastchats.value = false;
}
function handleshowchat(message) {
  
  showlastchats.value = true;
  showcontacts.value = false;
}

//这里处理contacts板块的显示和隐藏
function handleshowcontacts(message) {
  
  showlastchats.value = false;
  showcontacts.value = true;
}

function handlehidecontacts(message) {
  
  showcontacts.value = false;
}

function setcolor(data) {
  theme.value = data.color;
  container.value.setAttribute("data-theme", theme.value);
}

//显示聊天内容
function showdetail(data) {
  showcontent.value = true;
  const uname = data.uname;
  const img = data.img;
  const userId = data.userId;
  
  // 设置当前聊天用户
  if (userId) {
    chatStore.switchChatUser(userId);
  }
  
  router.push({
    path: "/chatdetail",
    query: { uname, img },
  });
}

function showAI() {
  showcontent.value = true;
  router.push({
    path: "/chat-ai",
  });
}

function hidecontent() {
  if (showcontent.value) {
    showcontent.value = false;
  }
}

function checkScreen() {
  isMobile.value = window.innerWidth <= 768;
}

onMounted(() => {
  checkScreen();
  window.addEventListener("resize", checkScreen);
  nextTick(() => {
    container.value.setAttribute("data-theme", theme.value);
  });
});
</script>

<style scoped lang="scss">
/* 换肤的颜色库 */
[data-theme="beige"] {
  --bg-color: #f9f9f9;
  --text-color: #444444;
}

/* 晴空蓝白 */
[data-theme="mist"] {
  --bg-color: rgba(220, 225, 230, 1);
  --text-color: #2c3e50;
}

/* 杏仁橙色，或者说是杏黄色 */
[data-theme="apricot"] {
  --bg-color: rgba(255, 235, 215, 1);
  --text-color: #5c4033;
}

.container {
  /* margin: 5vh 10vw; */
  border-radius: 1rem;
  flex: 1;
  display: flex;
  box-shadow: 0 0 5px 1px rgba(0, 0, 0, 0.5);
  -webkit-app-region: drag;
  max-height: 100vh;
  background: var(--bg-color);
  color: var(--text-color);
  transition: all 1.5s ease-in;
}

.section1,
.section2,
.section3 {
  max-height: 100%;
  border-radius: 1rem;
  background-color: transparent;
}
.section1 {
  flex: 0 0 8%;
}
.section2 {
  flex: 0 0 30%;
  border: 1px solid gray;
  border-top: none;
  border-bottom: none;
  overflow: hidden;
  box-sizing: border-box;
  /* display: flex; */
}
.section3 {
  flex: 1 1 62%;
}

.mobile {
  flex: 1;
  transition: all 0s;
  border: none;
  border-radius: 0;
}

/* 响应式布局 - 大屏幕 */
@media (min-width: 1300px) {
  .container {
    margin: 5vh 10vw;
    border-radius: 1rem;
  }
}

/* 响应式布局 - 中等屏幕 */
@media (max-width: 1299px) and (min-width: 1025px) {
  .container {
    margin: 2vh 5vw;
    border-radius: 0.8rem;
  }
}

/* 响应式布局 - 平板设备 */
@media (max-width: 1024px) and (min-width: 769px) {
  .container {
    border-radius: 0.5rem;
    margin: 1vh 2vw;
  }
  
  .section1 {
    flex: 0 0 10%;
  }
  
  .section2 {
    flex: 0 0 35%;
  }
  
  .section3 {
    flex: 1 1 55%;
  }
}

/* 响应式布局 - 移动设备 */
@media (max-width: 768px) {
  .container:not(.mobile) {
    border-radius: 0;
    margin: 0;
    height: 100vh;
  }
  
  .container:not(.mobile) .section1 {
    display: none;
  }
  
  .container:not(.mobile) .section2 {
    flex: 1;
    border: none;
    border-radius: 0;
  }
  
  .container:not(.mobile) .section3 {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    z-index: 1000;
    background: white;
    border-radius: 0;
  }
}

/* 移动端专用样式 */
.mobile {
  flex: 1;
  transition: all 0s;
  border: none;
  border-radius: 0;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.mobile .main-content {
  flex: 1;
  overflow: hidden;
  padding-bottom: 75px; /* 为底部导航栏留出空间 */
}

.mobile .section2 {
  height: calc(100vh - 75px); /* 减去底部导航栏高度 */
  border: none;
  overflow-y: auto;
}

.mobile .section3 {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  z-index: 1000;
  background: white;
}

/* 小屏移动设备 */
@media (max-width: 480px) {
  .container {
    font-size: 14px;
  }
  
  .section2,
  .section3 {
    padding: 0;
  }
}

/* 横屏适配 */
@media (orientation: landscape) and (max-height: 500px) {
  .container {
    height: 100vh;
  }
  
  .mobile .section2,
  .mobile .section3 {
    height: 100vh;
  }
}
</style>
