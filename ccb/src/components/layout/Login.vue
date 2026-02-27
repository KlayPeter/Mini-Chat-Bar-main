<template>
  <div
    ref="container"
    class="video-container"
  >
    <!-- 背景动画 Canvas -->
    <canvas ref="bgCanvas" class="bg-canvas"></canvas>
    
    <!-- 装饰符号 - 更多 -->
    <div class="deco-symbols">
      <span class="symbol symbol-1">{}</span>
      <span class="symbol symbol-2">{}</span>
      <span class="symbol symbol-3">//</span>
      <span class="symbol symbol-4">01</span>
      <span class="symbol symbol-5">&lt;/&gt;</span>
      <span class="symbol symbol-6">[ ]</span>
      <span class="symbol symbol-7">( )</span>
      <span class="symbol symbol-8">=&gt;</span>
      <span class="symbol symbol-9">**</span>
      <span class="symbol symbol-10">;</span>
    </div>

    <div class="flip-wrapper" :class="{ flipped: isFlipped }">
      <div class="login-box front">
        <h1>MINI CHAT BAR</h1>
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
          <input id="login-email" v-model="loginEmail" type="email" placeholder="请输入邮箱" autocomplete="off" @keyup.enter="loginWithPassword"/>
          <label for="login-password">密码</label>
          <div class="password-input-wrapper">
            <input 
              id="login-password" 
              v-model="loginPassword" 
              :type="showLoginPassword ? 'text' : 'password'" 
              placeholder="请输入密码" 
              autocomplete="off"
              @keyup.enter="loginWithPassword"
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
          <input id="login-email-code" v-model="loginEmailCode" type="email" placeholder="请输入邮箱" autocomplete="off" @keyup.enter="loginWithCode"/>
          <label for="verification-code">验证码</label>
          <div class="verification-input">
            <input id="verification-code" v-model="verificationCode" type="text" placeholder="请输入验证码" autocomplete="off" @keyup.enter="loginWithCode"/>
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

        <!-- OAuth 登录分割线 -->
        <div class="oauth-divider">
          <span>或者使用以下方式登录</span>
        </div>

        <!-- OAuth 登录按钮 -->
        <div class="oauth-buttons">
          <button @click="loginWithGoogle" class="oauth-btn google-btn">
            <svg class="oauth-icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google 登录
          </button>
          <button @click="loginWithGitHub" class="oauth-btn github-btn">
            <svg class="oauth-icon" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub 登录
          </button>
        </div>

        <div class="flip-link" @click="toggleFlip">还没有账号？点击注册</div>
      </div>
      <div class="login-box back">
        <h1>MINI CHAT BAR</h1>
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
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { useToast } from '../../composables/useToast'
import { useOnlineStatus } from '../../composables/useOnlineStatus'
import { socket, waitForSocketConnection } from '../../utils/socket'
import { PasswordValidator } from '../../utils/passwordValidator'

const toast = useToast()
const router = useRouter()
const { initOnlineStatus } = useOnlineStatus()

// 背景动画相关
const bgCanvas = ref(null)
let bgCtx = null
let bgAnimationId = null
let codeDrops = []
let nodeLines = []

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

// 初始化背景动画
const initBgAnimation = () => {
  if (!bgCanvas.value) return
  
  const canvas = bgCanvas.value
  const dpr = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  canvas.style.width = window.innerWidth + 'px'
  canvas.style.height = window.innerHeight + 'px'
  
  bgCtx = canvas.getContext('2d')
  bgCtx.scale(dpr, dpr)
  
  // 初始化代码雨 - 更密集更多
  const chars = '01{}[]<>//;:=+-*&|()=>function const let var'
  const columns = Math.floor(window.innerWidth / 14) // 更密集的列
  codeDrops = []
  for (let i = 0; i < columns; i++) {
    codeDrops.push({
      x: i * 14 + Math.random() * 6,
      y: Math.random() * -1000,
      speed: 0.15 + Math.random() * 0.35,
      chars: [],
      length: 12 + Math.floor(Math.random() * 25)
    })
    // 为每列生成字符
    for (let j = 0; j < codeDrops[i].length; j++) {
      codeDrops[i].chars.push(chars[Math.floor(Math.random() * chars.length)])
    }
  }
  
  // 初始化右下角连接线 - 更多线条
  nodeLines = []
  for (let i = 0; i < 35; i++) {
    const angle = (Math.PI / 2) + (Math.random() - 0.5) * Math.PI * 0.95
    const length = 60 + Math.random() * 320
    nodeLines.push({
      angle,
      length,
      opacity: 0.25 + Math.random() * 0.45 // 更深的颜色
    })
  }
  
  drawBgFrame()
}

const drawBgFrame = () => {
  if (!bgCtx) return
  
  const width = window.innerWidth
  const height = window.innerHeight
  
  // 白色/浅灰渐变背景
  const gradient = bgCtx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#f9fafb')
  gradient.addColorStop(0.5, '#f3f4f6')
  gradient.addColorStop(1, '#e8eaed')
  bgCtx.fillStyle = gradient
  bgCtx.fillRect(0, 0, width, height)
  
  // 绘制代码雨 - 覆盖整个屏幕高度
  bgCtx.font = '12px Courier New'
  codeDrops.forEach(drop => {
    drop.chars.forEach((char, idx) => {
      const y = drop.y + idx * 16
      if (y > 0 && y < height) {
        const alpha = Math.max(0, 0.25 - (idx / drop.length) * 0.12)
        bgCtx.fillStyle = `rgba(120, 30, 30, ${alpha})`
        bgCtx.fillText(char, drop.x, y)
      }
    })
    
    drop.y += drop.speed
    if (drop.y > height + 100) {
      drop.y = Math.random() * -600
    }
  })
  
  // 绘制一些柔和的圆形装饰
  const circles = [
    { x: width * 0.85, y: height * 0.75, r: 80, alpha: 0.03 },
    { x: width * 0.9, y: height * 0.85, r: 50, alpha: 0.04 },
    { x: width * 0.1, y: height * 0.8, r: 60, alpha: 0.03 },
    { x: width * 0.15, y: height * 0.65, r: 40, alpha: 0.025 },
    { x: width * 0.08, y: height * 0.3, r: 70, alpha: 0.02 },
    { x: width * 0.92, y: height * 0.2, r: 55, alpha: 0.025 },
  ]
  
  circles.forEach(c => {
    bgCtx.beginPath()
    bgCtx.arc(c.x, c.y, c.r, 0, Math.PI * 2)
    bgCtx.fillStyle = `rgba(165, 42, 42, ${c.alpha})`
    bgCtx.fill()
  })
  
  // 绘制一些细线条装饰
  bgCtx.strokeStyle = 'rgba(165, 42, 42, 0.04)'
  bgCtx.lineWidth = 1
  
  // 右下角斜线
  for (let i = 0; i < 5; i++) {
    bgCtx.beginPath()
    bgCtx.moveTo(width - 50 - i * 30, height)
    bgCtx.lineTo(width, height - 50 - i * 30)
    bgCtx.stroke()
  }
  
  // 左下角斜线
  for (let i = 0; i < 4; i++) {
    bgCtx.beginPath()
    bgCtx.moveTo(0, height - 80 - i * 25)
    bgCtx.lineTo(80 + i * 25, height)
    bgCtx.stroke()
  }
  
  bgAnimationId = requestAnimationFrame(drawBgFrame)
}

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

    // 确保socket连接后发送登录事件和在线状态事件
    waitForSocketConnection(() => {
      socket.emit('login', res.data.user.id)
      socket.emit('user-online', res.data.user.id)
      // 重新初始化在线状态管理系统
      setTimeout(() => {
        initOnlineStatus()
        // 额外延迟确保UI更新
        setTimeout(() => {
          // 强制触发响应式更新
          const currentUserId = localStorage.getItem('userId')
          // 发送自定义事件通知UI组件更新
          window.dispatchEvent(new CustomEvent('user-login-success', {
            detail: { userId: currentUserId }
          }))
        }, 200)
      }, 500)
    })

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

    // 确保socket连接后发送登录事件和在线状态事件
    waitForSocketConnection(() => {
      socket.emit('login', res.data.user.id)
      socket.emit('user-online', res.data.user.id)
      // 重新初始化在线状态管理系统
      setTimeout(() => {
        initOnlineStatus()
        // 额外延迟确保UI更新
        setTimeout(() => {
          // 强制触发响应式更新
          const currentUserId = localStorage.getItem('userId')
          // 发送自定义事件通知UI组件更新
          window.dispatchEvent(new CustomEvent('user-login-success', {
            detail: { userId: currentUserId }
          }))
        }, 200)
      }, 500)
    })

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

// Google OAuth 登录
const loginWithGoogle = () => {
  window.location.href = `${import.meta.env.VITE_BASE_URL}/auth/google`
}

// GitHub OAuth 登录
const loginWithGitHub = () => {
  window.location.href = `${import.meta.env.VITE_BASE_URL}/auth/github`
}

// 检查URL参数中的OAuth回调结果
const checkOAuthCallback = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const token = urlParams.get('token')
  const provider = urlParams.get('provider')
  const success = urlParams.get('success')
  const error = urlParams.get('error')

  if (success && token) {
    // OAuth登录成功
    localStorage.setItem('token', token)
    
    // 立即获取用户信息并初始化在线状态
    setTimeout(async () => {
      try {
        const userRes = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/user/info`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        const currentUserId = userRes.data.user.uID
        localStorage.setItem('userId', currentUserId)
        localStorage.setItem('userEmail', userRes.data.user.uEmail || '')
        localStorage.setItem('userName', userRes.data.user.uName || '')

        // 初始化在线状态和Socket连接
        await waitForSocketConnection()
        initOnlineStatus()
        
        // 发送自定义事件通知UI组件更新
        window.dispatchEvent(new CustomEvent('user-login-success', {
          detail: { userId: currentUserId }
        }))

        // OAuth登录完成后跳转到首页
        router.push('/')
      } catch (error) {
        console.error('获取用户信息失败:', error)
        // 如果获取用户信息失败，清除token并保持在登录页
        localStorage.removeItem('token')
        toast.error(`${provider} 登录失败：无法获取用户信息`)
      }
    }, 500)

    toast.success(`${provider === 'google' ? 'Google' : 'GitHub'} 登录成功`)
    
    // 清理URL参数
    window.history.replaceState({}, document.title, window.location.pathname)
  } else if (error) {
    // OAuth登录失败
    const errorMessages = {
      google_auth_failed: 'Google登录失败，请重试',
      github_auth_failed: 'GitHub登录失败，请重试',
      callback_processing_failed: '登录回调处理失败，请重试'
    }
    
    toast.error(errorMessages[error] || 'OAuth登录失败')
    
    // 清理URL参数
    window.history.replaceState({}, document.title, window.location.pathname)
  }
}

// 在组件挂载时检查OAuth回调
onMounted(() => {
  initBgAnimation()
  window.addEventListener('resize', initBgAnimation)
  checkOAuthCallback()
})

onUnmounted(() => {
  if (bgAnimationId) {
    cancelAnimationFrame(bgAnimationId)
  }
  window.removeEventListener('resize', initBgAnimation)
})

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
  overflow: hidden;
}

.bg-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

/* 装饰符号 */
.deco-symbols {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1;
  
  .symbol {
    position: absolute;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    color: rgba(120, 30, 30, 0.22);
  }
  
  .symbol-1 {
    top: 12%;
    right: 8%;
    font-size: 80px;
  }
  
  .symbol-2 {
    top: 50%;
    right: 5%;
    font-size: 60px;
  }
  
  .symbol-3 {
    top: 5%;
    left: 3%;
    font-size: 50px;
  }
  
  .symbol-4 {
    top: 8%;
    left: 15%;
    font-size: 45px;
  }
  
  .symbol-5 {
    top: 30%;
    left: 5%;
    font-size: 40px;
  }
  
  .symbol-6 {
    bottom: 25%;
    right: 12%;
    font-size: 55px;
  }
  
  .symbol-7 {
    bottom: 15%;
    left: 8%;
    font-size: 45px;
  }
  
  .symbol-8 {
    top: 25%;
    right: 15%;
    font-size: 35px;
  }
  
  .symbol-9 {
    bottom: 35%;
    left: 2%;
    font-size: 50px;
  }
  
  .symbol-10 {
    top: 40%;
    left: 12%;
    font-size: 60px;
  }
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
  z-index: 10;
  -webkit-app-region: no-drag;
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
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 
    0 20px 60px rgba(165, 42, 42, 0.1),
    0 8px 25px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(165, 42, 42, 0.03);
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  backface-visibility: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  overflow-y: auto;

  h1 {
    margin: 0 0 5px 0;
    padding: 0;
    font-size: 22px;
    font-weight: bold;
    color: #333;
    text-align: center;
  }

  &:hover {
    box-shadow: 
      0 25px 70px rgba(165, 42, 42, 0.12),
      0 10px 30px rgba(0, 0, 0, 0.1);
    transform: scale(1.01);
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
      border-color: var(--primary-color, rgba(165, 42, 42, 0.6));
      box-shadow: 0 0 0 3px var(--hover-bg, rgba(165, 42, 42, 0.1)), 0 4px 12px rgba(0, 0, 0, 0.1);
      background: rgba(255, 255, 255, 1);
      transform: translateY(-1px);
    }
    
    &:hover:not(:focus) {
      border-color: var(--primary-color, rgba(165, 42, 42, 0.3));
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
    }
    
    &::placeholder {
      color: rgba(0, 0, 0, 0.4);
      font-weight: 400;
    }
  }

  button {
    padding: 12px 20px;
    background: var(--primary-gradient, linear-gradient(135deg, rgba(165, 42, 42, 0.9) 0%, rgba(140, 35, 35, 0.95) 100%));
    color: var(--text-inverse, #fff);
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: var(--shadow-primary, 0 4px 15px rgba(165, 42, 42, 0.3));
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    margin: 5px auto 0;
    display: flex;
    justify-content: center;
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
      background: var(--primary-gradient, linear-gradient(135deg, rgba(165, 42, 42, 1) 0%, rgba(140, 35, 35, 1) 100%));
      transform: translateY(-2px) scale(1.02);
      box-shadow: var(--shadow-primary, 0 8px 25px rgba(165, 42, 42, 0.4));

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
      background: var(--hover-bg, rgba(165, 42, 42, 0.1)) !important;
      color: var(--primary-color, rgba(165, 42, 42, 0.8)) !important;
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
    color: var(--primary-color, rgba(165, 42, 42, 0.8));
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
      background: var(--primary-color, rgba(165, 42, 42, 0.9));
      color: var(--text-inverse, white);
      box-shadow: var(--shadow-primary, 0 3px 8px rgba(165, 42, 42, 0.4));
      transform: translateY(-0.5px);
    }

    &:not(.active):hover {
      background: var(--hover-bg, rgba(165, 42, 42, 0.1));
      color: var(--primary-color, rgba(165, 42, 42, 0.8));
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
    background-color: var(--primary-color, rgba(165, 42, 42, 0.85)) !important;
    color: var(--text-inverse, #fff) !important;
    border: none !important;
    transition: all 0.3s ease !important;
    
    &:hover:not(:disabled) {
      background-color: var(--primary-dark, rgba(145, 32, 32, 1)) !important;
      transform: scale(1.02) !important;
      box-shadow: var(--shadow-primary, 0 4px 12px rgba(165, 42, 42, 0.3)) !important;
    }
    
    &:active:not(:disabled) {
      transform: scale(0.98) !important;
    }
    
    &:disabled {
      background-color: var(--text-tertiary, rgba(165, 42, 42, 0.4)) !important;
      cursor: not-allowed !important;
      transform: none !important;
      box-shadow: none !important;
      
      &:hover {
        background-color: var(--text-tertiary, rgba(165, 42, 42, 0.4)) !important;
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

/* OAuth 登录分割线 */
.oauth-divider {
  margin: 20px 0 16px;
  text-align: center;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(165, 42, 42, 0.3), transparent);
  }
  
  span {
    background: rgba(255, 255, 255, 0.94);
    padding: 0 16px;
    font-size: 12px;
    color: rgba(165, 42, 42, 0.7);
    font-weight: 500;
  }
}

/* OAuth 登录按钮容器 */
.oauth-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

/* OAuth 登录按钮样式 */
.oauth-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 20px;
  border: 1px solid rgba(165, 42, 42, 0.2);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  color: #333;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(165, 42, 42, 0.4);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }

  .oauth-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
}

/* Google 按钮特殊样式 */
.google-btn {
  &:hover {
    background: rgba(66, 133, 244, 0.05);
    border-color: rgba(66, 133, 244, 0.3);
    color: #4285f4;
  }
}

/* GitHub 按钮特殊样式 */
.github-btn {
  &:hover {
    background: rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 0, 0, 0.3);
    color: #333;
  }
}
</style>
