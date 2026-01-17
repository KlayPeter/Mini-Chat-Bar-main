/**
 * 快速测试 AI 问答功能
 * 
 * 使用方法：
 * node server/test-ai-quick.js
 */

const axios = require('axios')

const BASE_URL = 'http://localhost:3000'

// 测试配置（请根据实际情况修改）
const TEST_CONFIG = {
  email: 'bob@test.com',      // 测试账号邮箱
  password: 'Bob123!',        // 测试账号密码
  roomId: '',                 // 留空则自动使用第一个聊天室
  question: 'React Hooks 有哪些常见的使用陷阱？' // 测试问题
}

async function quickTest() {
  try {
    console.log('🚀 开始快速测试...\n')
    
    // 1. 登录
    console.log('1️⃣ 登录中...')
    const loginRes = await axios.post(`${BASE_URL}/api/user/login-email`, {
      email: TEST_CONFIG.email,
      password: TEST_CONFIG.password
    })
    
    if (!loginRes.data.token) {
      throw new Error('登录失败：未返回 token')
    }
    
    const token = loginRes.data.token
    console.log('✅ 登录成功\n')
    
    // 2. 获取聊天室
    console.log('2️⃣ 获取聊天室...')
    let roomId = TEST_CONFIG.roomId
    
    if (!roomId) {
      const roomsRes = await axios.get(`${BASE_URL}/room/chatrooms`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (!roomsRes.data.success || roomsRes.data.rooms.length === 0) {
        throw new Error('没有找到聊天室，请先创建一个聊天室')
      }
      
      roomId = roomsRes.data.rooms[0].RoomID
      console.log(`✅ 使用聊天室: ${roomsRes.data.rooms[0].RoomName} (${roomId})\n`)
    }
    
    // 3. 测试 AI 问答
    console.log('3️⃣ 测试 AI 问答...')
    console.log(`❓ 问题: ${TEST_CONFIG.question}`)
    console.log('⏳ AI 思考中...\n')
    
    const startTime = Date.now()
    
    const aiRes = await axios.post(
      `${BASE_URL}/api/chatroom-ai/ask`,
      {
        roomId: roomId,
        question: TEST_CONFIG.question,
        useRAG: true
      },
      { 
        headers: { Authorization: `Bearer ${token}` },
        timeout: 120000
      }
    )
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    
    if (aiRes.data.success) {
      console.log('✅ AI 回答成功！')
      console.log(`⏱️  耗时: ${duration} 秒\n`)
      console.log('━'.repeat(60))
      console.log('🤖 AI 回答:')
      console.log('━'.repeat(60))
      console.log(aiRes.data.answer)
      console.log('━'.repeat(60))
      
      if (aiRes.data.sources && aiRes.data.sources.length > 0) {
        console.log(`\n📚 参考了 ${aiRes.data.sources.length} 条历史讨论`)
      }
      
      console.log('\n✨ 测试成功！AI 功能运行正常！')
    } else {
      throw new Error('AI 回答失败')
    }
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 提示:')
      console.error('   1. 确保后端服务正在运行: npm run server')
      console.error('   2. 确保 AI 服务正在运行: ollama serve')
    } else if (error.response?.status === 401) {
      console.error('\n💡 提示: 请检查测试账号是否正确')
    } else if (error.response?.status === 404) {
      console.error('\n💡 提示: 请先创建一个聊天室')
    }
    
    console.error('\n详细错误:', error.response?.data || error.message)
  }
}

// 运行测试
console.log('╔═══════════════════════════════════════╗')
console.log('║   聊天室 AI 功能 - 快速测试          ║')
console.log('╚═══════════════════════════════════════╝\n')

quickTest()
