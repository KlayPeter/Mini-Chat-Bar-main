const express = require('express')
const router = express.Router()
const passport = require('../config/passport')
const jwt = require('jsonwebtoken')

console.log('=== Auth路由模块已加载 ===')

// 测试路由 - 验证auth路由是否工作
router.get('/test', (req, res) => {
  console.log('Auth测试路由被访问')
  res.json({ message: 'Auth路由正常工作', timestamp: new Date().toISOString() })
})

// Google OAuth 登录路由
router.get('/google', (req, res, next) => {
  console.log('=== Google OAuth 登录请求开始 ===')
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next)
})

// Google OAuth 回调路由
router.get('/google/callback', (req, res, next) => {
  console.log('=== Google OAuth 回调路由被访问 ===')
  console.log('回调URL参数:', req.query)
  console.log('回调请求头:', req.headers)
  
  passport.authenticate('google', (err, user, info) => {
    console.log('=== Passport认证回调执行 ===')
    console.log('Google OAuth 回调结果:', { err, user: !!user, info })
      
      if (err) {
        console.error('Google OAuth 认证错误:', err)
        return res.redirect('http://localhost:5173/login?error=google_auth_failed&details=' + encodeURIComponent(err.message))
      }
      
      if (!user) {
        console.error('Google OAuth 未返回用户信息:', info)
        return res.redirect('http://localhost:5173/login?error=google_auth_failed&details=no_user_info')
      }
      
      req.logIn(user, (err) => {
        if (err) {
          console.error('登录用户时出错:', err)
          return res.redirect('http://localhost:5173/login?error=login_failed')
        }
        next()
      })
    })(req, res, next)
  },
  async (req, res) => {
    try {
      // 生成JWT token
      const token = jwt.sign(
        { 
          userId: req.user.uID,  // 使用uID字段而不是MongoDB _id
          email: req.user.uEmail,
          username: req.user.uName
        },
        'MORTALKOMBAT',
        { expiresIn: '7d' }
      )

      console.log('Google登录成功，用户:', req.user.uEmail || req.user.uName)
      
      // 重定向到前端并携带token
      res.redirect(`http://localhost:5173/login?token=${token}&provider=google&success=true`)
    } catch (error) {
      console.error('Google OAuth回调处理错误:', error)
      res.redirect('http://localhost:5173/login?error=callback_processing_failed')
    }
  }
)

// GitHub OAuth 登录路由  
router.get('/github',
  passport.authenticate('github', { scope: ['user:email'] })
)

// GitHub OAuth 回调路由
router.get('/github/callback',
  (req, res, next) => {
    passport.authenticate('github', (err, user, info) => {
      console.log('GitHub OAuth 回调结果:', { err, user: !!user, info })
      
      if (err) {
        console.error('GitHub OAuth 认证错误:', err)
        return res.redirect('http://localhost:5173/login?error=github_auth_failed&details=' + encodeURIComponent(err.message))
      }
      
      if (!user) {
        console.error('GitHub OAuth 未返回用户信息:', info)
        return res.redirect('http://localhost:5173/login?error=github_auth_failed&details=no_user_info')
      }
      
      req.logIn(user, (err) => {
        if (err) {
          console.error('登录用户时出错:', err)
          return res.redirect('http://localhost:5173/login?error=login_failed')
        }
        next()
      })
    })(req, res, next)
  },
  async (req, res) => {
    try {
      // 生成JWT token
      const token = jwt.sign(
        {
          userId: req.user.uID,  // 使用uID字段而不是MongoDB _id
          email: req.user.uEmail,
          username: req.user.uName
        },
        'MORTALKOMBAT',
        { expiresIn: '7d' }
      )

      console.log('GitHub登录成功，用户:', req.user.uEmail || req.user.uName)
      
      // 重定向到前端并携带token
      res.redirect(`http://localhost:5173/login?token=${token}&provider=github&success=true`)
    } catch (error) {
      console.error('GitHub OAuth回调处理错误:', error)
      res.redirect('http://localhost:5173/login?error=callback_processing_failed')
    }
  }
)

// OAuth 登录状态检查
router.get('/status', (req, res) => {
  res.json({
    isAuthenticated: req.isAuthenticated(),
    user: req.user ? {
      id: req.user._id,
      email: req.user.uEmail,
      username: req.user.uName,
      provider: req.user.provider
    } : null
  })
})

// 退出登录
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: '退出登录失败' })
    }
    res.json({ message: '退出登录成功' })
  })
})

module.exports = router
