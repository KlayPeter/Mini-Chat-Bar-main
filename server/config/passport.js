const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const GitHubStrategy = require('passport-github2').Strategy
const User = require('../models/Users')
const jwt = require('jsonwebtoken')
const https = require('https')
const http = require('http')

// 创建支持代理的 HTTPS Agent
// 如果你有代理，取消注释并配置代理地址
const httpsAgent = new https.Agent({
  keepAlive: false,
  timeout: 120000,
  // 如果需要使用代理，安装 https-proxy-agent 并配置：
  // const { HttpsProxyAgent } = require('https-proxy-agent')
  // 然后使用: new HttpsProxyAgent('http://127.0.0.1:7890')
})

// Google OAuth 策略
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
  scope: ['profile', 'email'],
  accessType: 'offline',
  // 添加自定义 OAuth2 客户端配置
  proxy: false,
  // 传递自定义的 https agent
  customHeaders: {
    'User-Agent': 'Mini-Chat-Bar OAuth Client'
  }
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google OAuth 回调数据:', {
      id: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      photo: profile.photos?.[0]?.value
    })

    // 检查用户是否已存在（通过Google ID或邮箱）
    let user = await User.findOne({
      $or: [
        { googleId: profile.id },
        { uEmail: profile.emails?.[0]?.value }
      ]
    })

    if (user) {
      // 如果用户存在但没有Google ID，更新Google ID
      if (!user.googleId) {
        user.googleId = profile.id
        await user.save()
      }
      console.log('找到已有用户:', user.uEmail)
      return done(null, user)
    }

    // 创建新用户
    const userData = {
      uID: `google_${profile.id}`,
      googleId: profile.id,
      uName: profile.displayName || `GoogleUser_${profile.id}`,
      uAvatar: profile.photos?.[0]?.value || '/images/avatar/default-avatar.webp',
      isEmailVerified: true, // Google账户默认已验证邮箱
      Password: '', // OAuth用户不需要密码
      provider: 'google'
    }

    // 只在有邮箱时才添加email字段
    if (profile.emails?.[0]?.value) {
      userData.uEmail = profile.emails[0].value
    }

    console.log('正在创建Google用户，数据:', userData)
    
    const newUser = new User(userData)
    await newUser.save()
    console.log('创建Google新用户成功:', newUser.uEmail || newUser.uName)
    return done(null, newUser)
  } catch (error) {
    console.error('Google OAuth 策略错误:', error)
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      data: error.data
    })
    return done(error, null)
  }
}))

// GitHub OAuth 策略
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('GitHub OAuth 回调数据:', {
      id: profile.id,
      username: profile.username,
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      photo: profile.photos?.[0]?.value
    })

    // 检查用户是否已存在（通过GitHub ID或邮箱）
    let user = await User.findOne({
      $or: [
        { githubId: profile.id },
        { uEmail: profile.emails?.[0]?.value }
      ]
    })

    if (user) {
      // 如果用户存在但没有GitHub ID，更新GitHub ID
      if (!user.githubId) {
        user.githubId = profile.id
        await user.save()
      }
      console.log('找到已有用户:', user.uEmail || user.uName)
      return done(null, user)
    }

    // 创建新用户
    const userData = {
      uID: `github_${profile.id}`,
      githubId: profile.id,
      uName: profile.username || profile.displayName || `GitHubUser_${profile.id}`,
      uAvatar: profile.photos?.[0]?.value || '/images/avatar/default-avatar.webp',
      isEmailVerified: !!profile.emails?.[0]?.value, // 如果有邮箱则认为已验证
      Password: '', // OAuth用户不需要密码
      provider: 'github'
    }

    // 只在有邮箱时才添加email字段
    if (profile.emails?.[0]?.value) {
      userData.uEmail = profile.emails[0].value
    }

    console.log('正在创建GitHub用户，数据:', userData)
    
    const newUser = new User(userData)
    await newUser.save()
    console.log('创建GitHub新用户成功:', newUser.uEmail || newUser.uName)
    return done(null, newUser)
  } catch (error) {
    console.error('GitHub OAuth 策略错误:', error)
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      data: error.data
    })
    return done(error, null)
  }
}))

// 序列化用户
passport.serializeUser((user, done) => {
  done(null, user._id)
})

// 反序列化用户
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id)
    done(null, user)
  } catch (error) {
    done(error, null)
  }
})

module.exports = passport
