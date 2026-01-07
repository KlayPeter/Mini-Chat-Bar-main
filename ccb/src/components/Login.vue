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
        
        <!-- 登录方式切换 -->
        <div class="login-tabs">
          <button 
            :class="{ active: loginMode === 'password' }" 
            @click="loginMode = 'password'"
            class="tab-btn"
          >
            密码登录
          </button>
          <button 
            :class="{ active: loginMode === 'code' }" 
            @click="loginMode = 'code'"
            class="tab-btn"
          >
            验证码登录
          </button>
        </div>

        <!-- 密码登录 -->
        <div v-if="loginMode === 'password'">
          <label for="login-email">邮箱</label>
          <input id="login-email" v-model="loginEmail" type="email" placeholder="请输入邮箱" autocomplete="off"/>
          <label for="login-password">密码</label>
          <div class="password-input-wrapper">
            <input 
              id="login-password" 
              v-model="loginPassword" 
              :type="showLoginPassword ? 'text' : 'password'" 
              placeholder="请输入密码" 
              autocomplete="off"
            />
            <button 
              type="button"
              class="password-toggle"
              @click="showLoginPassword = !showLoginPassword"
            >
              <font-awesome-icon 
                v-if="showLoginPassword" 
                :icon="['fas', 'eye-slash']" 
              />
              <font-awesome-icon 
                v-else 
                :icon="['fas', 'eye']" 
              />
            </button>
          </div>
          <button @click="loginWithPassword">登录</button>
        </div>

        <!-- 验证码登录 -->
        <div v-if="loginMode === 'code'">
          <label for="login-email-code">邮箱</label>
          <input id="login-email-code" v-model="loginEmailCode" type="email" placeholder="请输入邮箱" autocomplete="off"/>
          <label for="verification-code">验证码</label>
          <div class="verification-input">
            <input id="verification-code" v-model="verificationCode" type="text" placeholder="请输入验证码" autocomplete="off"/>
            <button 
              @click="sendLoginCode" 
              :disabled="codeCooldown > 0" 
              class="code-btn"
            >
              {{ codeCooldown > 0 ? `${codeCooldown}s` : '获取验证码' }}
            </button>
          </div>
          <button @click="loginWithCode">登录</button>
        </div>

        <div class="flip-link" @click="toggleFlip">还没有账号？点击注册</div>
      </div>
      <div
      class="login-box back"
      @mouseenter="onLoginBoxEnter"
      @mouseleave="onLoginBoxLeave">
      <h1 style="text-align: center;">MINI CHAT BAR</h1>
        <h2>注册</h2>
        <label for="register-email">邮箱</label>
        <input id="register-email" v-model="regEmail" type="email" placeholder="请输入邮箱" autocomplete="off"/>
        
        <label for="register-code">验证码</label>
        <div class="verification-input">
          <input id="register-code" v-model="regVerificationCode" type="text" placeholder="请输入验证码" autocomplete="off"/>
          <button 
            @click="sendRegisterCode" 
            :disabled="regCodeCooldown > 0" 
            class="code-btn"
          >
            {{ regCodeCooldown > 0 ? `${regCodeCooldown}s` : '获取验证码' }}
          </button>
        </div>
        
        <label for="register-username">用户名</label>
        <input id="register-username" v-model="regUsername" type="text" placeholder="请输入用户名" autocomplete="off"/>
        
        <label for="register-password">密码</label>
        <div class="password-input-wrapper">
          <input 
            id="register-password" 
            v-model="regPassword" 
            :type="showRegPassword ? 'text' : 'password'" 
            placeholder="请输入密码" 
            autocomplete="off" 
            @input="checkPasswordStrength"
          />
          <button 
            type="button"
            class="password-toggle"
            @click="showRegPassword = !showRegPassword"
          >
            <font-awesome-icon 
              v-if="showRegPassword" 
              :icon="['fas', 'eye-slash']" 
            />
            <font-awesome-icon 
              v-else 
              :icon="['fas', 'eye']" 
            />
          </button>
        </div>
        
        <!-- 密码强度指示器 -->
        <div v-if="regPassword" class="password-strength">
          <div class="strength-bar">
            <div 
              class="strength-fill" 
              :style="{ width: passwordStrength.percentage + '%', backgroundColor: passwordStrength.color }"
            ></div>
          </div>
          <span class="strength-text" :style="{ color: passwordStrength.color }">
            密码强度: {{ passwordStrength.level }}
          </span>
          <div v-if="passwordErrors.length > 0" class="password-errors">
            <div v-for="error in passwordErrors" :key="error" class="error-text">
              • {{ error }}
            </div>
          </div>
        </div>
        
        <label for="register-confirm">确认密码</label>
        <div class="password-input-wrapper">
          <input 
            id="register-confirm" 
            v-model="regConfirm" 
            :type="showRegConfirmPassword ? 'text' : 'password'" 
            placeholder="请再次输入密码" 
            autocomplete="off"
          />
          <button 
            type="button"
            class="password-toggle"
            @click="showRegConfirmPassword = !showRegConfirmPassword"
          >
            <font-awesome-icon 
              v-if="showRegConfirmPassword" 
              :icon="['fas', 'eye-slash']" 
            />
            <font-awesome-icon 
              v-else 
              :icon="['fas', 'eye']" 
            />
          </button>
        </div>
        
        <button @click="registerWithEmail">注册</button>
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
import { PasswordValidator } from '../utils/passwordValidator'
import CryptoJS from 'crypto-js'

const toast = useToast()
const router = useRouter()

// 视频相关
const video = ref(null)
const canvas = ref(null)
let ctx = null
let animationFrameId = null

const isInContainer = ref(false)
const isInLoginBox = ref(false)

// 登录相关
const loginMode = ref('password') // 'password' 或 'code'
const loginEmail = ref('')
const loginPassword = ref('')
const loginEmailCode = ref('')
const verificationCode = ref('')
const codeCooldown = ref(0)
const showLoginPassword = ref(false)

// 注册相关
const regEmail = ref('')
const regVerificationCode = ref('')
const regUsername = ref('')
const regPassword = ref('')
const regConfirm = ref('')
const regCodeCooldown = ref(0)
const passwordStrength = ref({ level: '', color: '', percentage: 0 })
const passwordErrors = ref([])
const showRegPassword = ref(false)
const showRegConfirmPassword = ref(false)

// 其他
const isFlipped = ref(false)

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

const toggleFlip = () => {
  isFlipped.value = !isFlipped.value
}

// 密码强度检查
const checkPasswordStrength = () => {
  const validation = PasswordValidator.validate(regPassword.value)
  passwordErrors.value = validation.errors
  passwordStrength.value = validation.strength
}

// 发送登录验证码
const sendLoginCode = async () => {
  if (!loginEmailCode.value) {
    toast.warning('请输入邮箱地址')
    return
  }

  if (!PasswordValidator.validateEmail(loginEmailCode.value)) {
    toast.error('请输入有效的邮箱地址')
    return
  }

  try {
    await axios.post(`${import.meta.env.VITE_BASE_URL}/api/user/send-verification`, {
      email: loginEmailCode.value,
      type: 'login'
    })
    
    toast.success('验证码已发送到您的邮箱')
    
    // 开始倒计时
    codeCooldown.value = 60
    const timer = setInterval(() => {
      codeCooldown.value--
      if (codeCooldown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  } catch (err) {
    console.error('发送验证码失败', err)
    if (err.response?.data?.message) {
      toast.error(err.response.data.message)
    } else {
      toast.error('发送验证码失败，请重试')
    }
  }
}

// 发送注册验证码
const sendRegisterCode = async () => {
  if (!regEmail.value) {
    toast.warning('请输入邮箱地址')
    return
  }

  if (!PasswordValidator.validateEmail(regEmail.value)) {
    toast.error('请输入有效的邮箱地址')
    return
  }

  try {
    await axios.post(`${import.meta.env.VITE_BASE_URL}/api/user/send-verification`, {
      email: regEmail.value,
      type: 'register'
    })
    
    toast.success('验证码已发送到您的邮箱')
    
    // 开始倒计时
    regCodeCooldown.value = 60
    const timer = setInterval(() => {
      regCodeCooldown.value--
      if (regCodeCooldown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  } catch (err) {
    console.error('发送验证码失败', err)
    if (err.response?.data?.message) {
      toast.error(err.response.data.message)
    } else {
      toast.error('发送验证码失败，请重试')
    }
  }
}

// 邮箱密码登录
const loginWithPassword = async () => {
  if (!loginEmail.value || !loginPassword.value) {
    toast.warning('请输入邮箱和密码')
    return
  }

  if (!PasswordValidator.validateEmail(loginEmail.value)) {
    toast.error('请输入有效的邮箱地址')
    return
  }

  try {
    const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/api/user/login-email`, {
      email: loginEmail.value,
      password: loginPassword.value
    })

    // 保存登录信息到localStorage
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('userId', res.data.user.id)
    localStorage.setItem('username', res.data.user.name)
    localStorage.setItem('userEmail', res.data.user.email)
    localStorage.setItem('avatar', res.data.user.ava)

    toast.success('登录成功')
    router.push('/')
  } catch (err) {
    console.error('登录失败', err)
    if (err.response?.data?.message) {
      toast.error(err.response.data.message)
    } else {
      toast.error('登录失败，请重试')
    }
  }
}

// 验证码登录
const loginWithCode = async () => {
  if (!loginEmailCode.value || !verificationCode.value) {
    toast.warning('请输入邮箱和验证码')
    return
  }

  if (!PasswordValidator.validateEmail(loginEmailCode.value)) {
    toast.error('请输入有效的邮箱地址')
    return
  }

  try {
    const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/api/user/login-code`, {
      email: loginEmailCode.value,
      verificationCode: verificationCode.value
    })

    // 保存登录信息到localStorage
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('userId', res.data.user.id)
    localStorage.setItem('username', res.data.user.name)
    localStorage.setItem('userEmail', res.data.user.email)
    localStorage.setItem('avatar', res.data.user.ava)

    toast.success('登录成功')
    router.push('/')
  } catch (err) {
    console.error('验证码登录失败', err)
    if (err.response?.data?.message) {
      toast.error(err.response.data.message)
    } else {
      toast.error('登录失败，请重试')
    }
  }
}

// 邮箱验证码注册
const registerWithEmail = async () => {
  // 验证必填字段
  if (!regEmail.value || !regVerificationCode.value || !regUsername.value || !regPassword.value || !regConfirm.value) {
    toast.warning('请填写完整信息')
    return
  }

  // 验证邮箱格式
  if (!PasswordValidator.validateEmail(regEmail.value)) {
    toast.error('请输入有效的邮箱地址')
    return
  }

  // 验证密码强度
  const passwordValidation = PasswordValidator.validate(regPassword.value)
  if (!passwordValidation.isValid) {
    toast.error('密码不符合要求：' + passwordValidation.errors.join('；'))
    return
  }

  // 验证密码确认
  if (regPassword.value !== regConfirm.value) {
    toast.error('两次密码不一致')
    return
  }

  try {
    const res = await axios.post(`${import.meta.env.VITE_BASE_URL}/api/user/register-email`, {
      uName: regUsername.value,
      uEmail: regEmail.value,
      uPassword: regPassword.value,
      verificationCode: regVerificationCode.value
    })
    
    toast.success('注册成功！请登录')
    // 切换到登录页面
    toggleFlip()
    
    // 清空注册表单
    regEmail.value = ''
    regVerificationCode.value = ''
    regUsername.value = ''
    regPassword.value = ''
    regConfirm.value = ''
    passwordStrength.value = { level: '', color: '', percentage: 0 }
    passwordErrors.value = []
  } catch (err) {
    console.error('注册失败', err)
    if (err.response?.data?.message) {
      toast.error(err.response.data.message)
    } else if (err.response?.data?.errors) {
      toast.error('注册失败：' + err.response.data.errors.join('；'))
    } else {
      toast.error('注册失败，请重试')
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
  width: 460px;
  height: auto;
  min-height: 580px;
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
  height: auto;
  min-height: 100%;
  padding: 35px 40px 40px;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.94);
  border-radius: 20px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  backface-visibility: hidden;
  backdrop-filter: blur(8px);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  overflow-y: auto;

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
    margin: 15px 0 20px 0;
    padding: 0;
    font-size: 24px;
    font-weight: bold;
    color: #333;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  label {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 5px;
    color: #555;
    display: block;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  input {
    padding: 12px 16px;
    margin-bottom: 14px;
    border: 2px solid rgba(200, 200, 200, 0.6);
    border-radius: 10px;
    font-size: 14px;
    outline: none;
    width: 100%;
    background: rgba(255, 255, 255, 0.9);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    
    &:focus {
      border-color: rgba(165, 42, 42, 0.6);
      box-shadow: 0 0 0 3px rgba(165, 42, 42, 0.1), 0 4px 12px rgba(0, 0, 0, 0.1);
      background: rgba(255, 255, 255, 1);
      transform: translateY(-1px);
    }
    
    &:hover:not(:focus) {
      border-color: rgba(165, 42, 42, 0.3);
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
    }
    
    &::placeholder {
      color: rgba(0, 0, 0, 0.4);
      font-weight: 400;
    }
  }

  button {
    padding: 12px 20px;
    background: linear-gradient(135deg, rgba(165, 42, 42, 0.9) 0%, rgba(140, 35, 35, 0.95) 100%);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 15px rgba(165, 42, 42, 0.3);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    margin: 5px auto 0;
    display: block;
    width: 100%;
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, 
        transparent 0%, 
        rgba(255, 255, 255, 0.2) 50%, 
        transparent 100%);
      transition: left 0.5s ease;
    }

    &:hover {
      background: linear-gradient(135deg, rgba(165, 42, 42, 1) 0%, rgba(140, 35, 35, 1) 100%);
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 8px 25px rgba(165, 42, 42, 0.4);

      &::before {
        left: 100%;
      }
    }

    &:active {
      transform: translateY(-1px) scale(1.01);
      box-shadow: 0 4px 15px rgba(165, 42, 42, 0.3);
    }
  }
}

/* 密码输入框包装器 */
.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 14px;

  input {
    margin-bottom: 0 !important;
    padding-right: 45px;
  }

  .password-toggle {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none !important;
    border: none !important;
    cursor: pointer;
    padding: 8px !important;
    margin: 0 !important;
    width: 32px !important;
    height: 32px !important;
    color: rgba(0, 0, 0, 0.6);
    border-radius: 6px !important;
    transition: all 0.2s ease !important;
    box-shadow: none !important;
    z-index: 10;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;

    svg {
      font-size: 14px;
      width: 14px;
      height: 14px;
      pointer-events: none;
    }

    &:hover {
      background: rgba(165, 42, 42, 0.1) !important;
      color: rgba(165, 42, 42, 0.8) !important;
      transform: translateY(-50%) scale(1.05) !important;
      box-shadow: none !important;
    }

    &:active {
      transform: translateY(-50%) scale(0.95) !important;
    }

    &:focus {
      outline: none !important;
    }
  }
}

.flip-link {
  margin-top: 10px;
  text-align: center;
  color: #0066cc;
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
  user-select: none;
  transition: all 0.2s ease;
  
  &:hover {
    color: rgba(165, 42, 42, 0.8);
    transform: scale(1.02);
  }
}

/* 登录方式切换标签 */
.login-tabs {
  display: flex;
  margin-bottom: 18px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);

  .tab-btn {
    flex: 1;
    padding: 8px 16px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.7);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;

    &.active {
      background: rgba(165, 42, 42, 0.9);
      color: white;
      box-shadow: 0 3px 8px rgba(165, 42, 42, 0.4);
      transform: translateY(-0.5px);
    }

    &:not(.active):hover {
      background: rgba(165, 42, 42, 0.1);
      color: rgba(165, 42, 42, 0.8);
      transform: translateY(-0.3px);
    }

    &:active {
      transform: translateY(0);
    }
  }
}

/* 验证码输入框容器 */
.verification-input {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
  align-items: stretch;

  input {
    flex: 2;
    margin-bottom: 0 !important;
    border-radius: 10px;
    min-width: 0;
  }

  .code-btn {
    padding: 10px 16px !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    white-space: nowrap;
    flex: 0 0 auto;
    width: 100px;
    border-radius: 10px !important;
    background-color: rgba(165, 42, 42, 0.85) !important;
    color: #fff !important;
    border: none !important;
    transition: all 0.3s ease !important;
    
    &:hover:not(:disabled) {
      background-color: rgba(165, 42, 42, 1) !important;
      transform: scale(1.02) !important;
      box-shadow: 0 4px 12px rgba(165, 42, 42, 0.3) !important;
    }
    
    &:active:not(:disabled) {
      transform: scale(0.98) !important;
    }
    
    &:disabled {
      background-color: rgba(165, 42, 42, 0.4) !important;
      cursor: not-allowed !important;
      transform: none !important;
      box-shadow: none !important;
      
      &:hover {
        background-color: rgba(165, 42, 42, 0.4) !important;
        transform: none !important;
      }
    }
  }
}

/* 密码强度指示器 */
.password-strength {
  margin-bottom: 12px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);

  .strength-bar {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    margin-bottom: 6px;
    overflow: hidden;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);

    .strength-fill {
      height: 100%;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 4px;
      position: relative;
      
      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, 
          rgba(255,255,255,0.3) 0%, 
          rgba(255,255,255,0.1) 50%, 
          rgba(255,255,255,0.3) 100%);
        border-radius: 4px;
      }
    }
  }

  .strength-text {
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 4px;
    display: block;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .password-errors {
    background: rgba(255, 71, 87, 0.1);
    border-radius: 6px;
    padding: 6px 8px;
    border-left: 2px solid #ff4757;

    .error-text {
      font-size: 10px;
      color: #ff4757;
      margin-bottom: 2px;
      line-height: 1.2;
      font-weight: 500;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}
</style>
