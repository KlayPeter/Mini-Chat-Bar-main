<template>
  <div
    ref="container"
    class="video-container"
    @mouseenter="onContainerEnter"
    @mouseleave="onContainerLeave"
  >
    <canvas ref="canvas" width="1280" height="720"></canvas>
    <video
      ref="video"
      src="/videos/Walking_girl.mp4"
      muted
      loop
      playsinline
      style="display: none"
    ></video>


    <div class="flip-wrapper" :class="{ flipped: isFlipped }">
      <div class="login-box front"
      @mouseenter="onLoginBoxEnter"
      @mouseleave="onLoginBoxLeave">
        <h1 style="text-align: center;">MINI CHAT BAR</h1>
        <h2>登录</h2>
        <label for="login-username">用户名</label>
        <input id="login-username" v-model="username" type="text" placeholder="请输入用户名" autocomplete="off"/>
        <label for="login-password">密码</label>
        <input id="login-password" v-model="password" type="password" placeholder="请输入密码" autocomplete="off"/>
        <button @click="login">登录</button>
        <div class="flip-link" @click="toggleFlip">还没有账号？点击注册</div>
      </div>
      <div
      class="login-box back"
      @mouseenter="onLoginBoxEnter"
      @mouseleave="onLoginBoxLeave">
      <h1 style="text-align: center;">MINI CHAT BAR</h1>
        <h2>注册</h2>
        <label for="register-username">用户名</label>
        <input id="register-username" v-model="regUsername" type="text" placeholder="请输入用户名" autocomplete="off"/>
        <label for="register-password">密码</label>
        <input id="register-password" v-model="regPassword" type="password" placeholder="请输入密码" autocomplete="off"/>
        <label for="register-confirm">确认密码</label>
        <input id="register-confirm" v-model="regConfirm" type="password" placeholder="请再次输入密码" autocomplete="off"/>
        <button @click="register">注册</button>
        <div class="flip-link" @click="toggleFlip">已有账号？返回登录</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { useToast } from '../composables/useToast'
import CryptoJS from 'crypto-js'

const toast = useToast()
const video = ref(null)
const canvas = ref(null)
let ctx = null
let animationFrameId = null

const isInContainer = ref(false)
const isInLoginBox = ref(false)

const drawFrame = () => {
  if (video.value && ctx) {
    ctx.drawImage(video.value, 0, 0, canvas.value.width, canvas.value.height)
    animationFrameId = requestAnimationFrame(drawFrame)
  }
}

const playVideo = () => {
  if (video.value.paused) {
    video.value.play()
    drawFrame()
  }
}

const pauseVideo = () => {
  video.value.pause()
  cancelAnimationFrame(animationFrameId)
}

const onContainerEnter = () => {
  isInContainer.value = true
  if (!isInLoginBox.value) playVideo()
}

const onContainerLeave = () => {
  isInContainer.value = false
  pauseVideo()
}

const onLoginBoxEnter = () => {
  isInLoginBox.value = true
  pauseVideo()
}

const onLoginBoxLeave = () => {
  isInLoginBox.value = false
  if (isInContainer.value) playVideo()
}

onMounted(() => {
  ctx = canvas.value.getContext('2d')
})

const router = useRouter()
const username = ref('')
const password = ref('')
const AES_SECRET_KEY = '20051111and20031230'

//加密
function encryptPassword(text){
  return CryptoJS.AES.encrypt(text,AES_SECRET_KEY).toString()
}

//登录逻辑
const login = async () => {
  if (!username.value || !password.value) {
    toast.warning('请输入用户名和密码')
    return
  }

  try {
    const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/api/user/login`, {
      username: username.value,
      password: password.value
    })
    console.log('登录响应:', res.data)

    // 保存登录信息到localStorage
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('userId', res.data.user.id)
    localStorage.setItem('username', res.data.user.name)
    localStorage.setItem('avatar', res.data.user.ava)

    console.log('已保存userId到localStorage:', res.data.user.id)

    router.push('/')
  } catch (err) {
    console.error('登录失败', err)
    toast.error('登录失败，请稍后再试')
  }
}



const regUsername = ref('')
const regPassword = ref('')
const regConfirm = ref('')
const isFlipped = ref(false)

const toggleFlip = () => {
  isFlipped.value = !isFlipped.value
}

// 注册逻辑（数据库出错了明天记得改）
const register = async () => {
  if (!regUsername.value || !regPassword.value || !regConfirm.value) {
    toast.warning('请填写完整信息')
    return
  }
  if (regPassword.value !== regConfirm.value) {
    toast.error('两次密码不一致')
    return
  }

  try {
    const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/api/user/register`, {
      uName: regUsername.value,
      uPassword: regPassword.value
    })
    const message = res.data.message
    toast.success(message)
    toggleFlip()
  } catch (err) {
  if (err.response && err.response.status === 409) {
    toast.error(err.response.data.message)
  } else {
    console.error('注册失败', err)
    toast.error("注册失败，请稍后再试")
  }
}
}
</script>

<style scoped lang="scss">
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: "Microsoft Yahei", sans-serif;
}

.video-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: rgb(252, 255, 252);
}

canvas {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 0;
}

/* 外层包裹容器 */
.flip-wrapper {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 440px;
  height: 520px;
  transform-style: preserve-3d;
  transition: transform 0.4s ease;
  transform: translate(-50%, -50%);
  perspective: 1600px;
  z-index: 2;
  -webkit-app-region: no-drag
}

.flipped {
  transform: translate(-50%, -50%) rotateY(180deg);
}

/* 登录和注册卡片的公用样式 */
.login-box {
  position: absolute;
  width: 100%;
  height: 100%;
  padding: 40px;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.94);
  border-radius: 20px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  justify-content: center;
  backface-visibility: hidden;
  backdrop-filter: blur(8px);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;

  h1{
    position: absolute;
    top: 0;
    width: 100%;
    left: 0;
  }

  &:hover {
    box-shadow: 0 16px 50px rgba(0, 0, 0, 0.4);
    transform: scale(1.02);
  }

  &.front {
    transform: rotateY(0deg);
    z-index: 2;
  }

  &.back {
    transform: rotateY(180deg);
    position: absolute;
    top: 0;
    left: 0;
  }

  h2 {
    text-align: center;
    margin: 0;
    padding: 0;
    font-size: 28px;
    font-weight: bold;
  }

  label {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 6px;
  }

  input {
    padding: 12px;
    margin-bottom: 20px;
    border: 1px solid #ccc;
    border-radius: 10px;
    font-size: 15px;
    outline: none;
    width: 100%;
  }

  button {
    padding: 14px;
    background-color: rgba(165, 42, 42, 0.85);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 17px;
    cursor: pointer;
    transition: background-color 0.3s ease, transform 0.2s;

    &:hover {
      background-color: rgba(165, 42, 42, 1);
      transform: scale(1.03);
    }

    &:active {
      transform: scale(0.98);
    }
  }
}

.flip-link {
  margin-top: 16px;
  text-align: center;
  color: #0066cc;
  font-size: 14px;
  cursor: pointer;
  text-decoration: underline;
  user-select: none;
}
</style>
