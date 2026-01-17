/**
 * 聊天室 AI 功能测试脚本
 * 
 * 使用方法：
 * node server/test-chatroom-ai.js
 */

const axios = require('axios')

// 配置
const BASE_URL = 'http://localhost:3000'
let authToken = ''
let testRoomId = ''

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan')
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow')
}

// 1. 登录获取 token
async function login() {
  try {
    logInfo('步骤 1: 登录获取 token...')
    
    const response = await axios.post(`${BASE_URL}/api/user/login-email`, {
      email: 'bob@test.com',
      password: 'Bob123!'
    })
    
    if (response.data.token) {
      authToken = response.data.token
      logSuccess(`登录成功！Token: ${authToken.substring(0, 20)}...`)
      return true
    } else {
      logError('登录失败：未返回 token')
      return false
    }
  } catch (error) {
    logError(`登录失败: ${error.response?.data?.message || error.message}`)
    logWarning('提示：请确保有测试账号 username: test, password: test123')
    return false
  }
}

// 2. 获取或创建测试聊天室
async function getOrCreateTestRoom() {
  try {
    logInfo('步骤 2: 获取测试聊天室...')
    
    // 先尝试获取现有聊天室
    const listResponse = await axios.get(`${BASE_URL}/room/chatrooms`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    
    if (listResponse.data.success && listResponse.data.rooms.length > 0) {
      testRoomId = listResponse.data.rooms[0].RoomID
      logSuccess(`使用现有聊天室: ${listResponse.data.rooms[0].RoomName} (${testRoomId})`)
      return true
    }
    
    // 如果没有，创建一个测试聊天室
    logInfo('没有找到聊天室，创建测试聊天室...')
    const createResponse = await axios.post(
      `${BASE_URL}/room/create`,
      {
        roomName: 'AI测试聊天室',
        techDirection: '前端开发',
        joinType: 'public',
        announcement: '这是一个用于测试AI功能的聊天室',
        duration: 24
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    )
    
    if (createResponse.data.success) {
      testRoomId = createResponse.data.room.RoomID
      logSuccess(`创建测试聊天室成功: ${testRoomId}`)
      return true
    }
    
    logError('获取/创建聊天室失败')
    return false
  } catch (error) {
    logError(`获取/创建聊天室失败: ${error.response?.data?.message || error.message}`)
    return false
  }
}

// 3. 发送一些测试消息（为 RAG 提供上下文）
async function sendTestMessages() {
  try {
    logInfo('步骤 3: 发送测试消息（为 AI 提供上下文）...')
    
    const testMessages = [
      'React 的 useEffect 有什么注意事项？',
      '我在使用 useState 时遇到了闭包问题',
      'Vue3 的 Composition API 比 Options API 好在哪里？',
      '如何优化 React 组件的渲染性能？'
    ]
    
    for (const content of testMessages) {
      await axios.post(
        `${BASE_URL}/room/${testRoomId}/messages`,
        {
          content: content,
          messageType: 'text'
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      )
      logSuccess(`发送消息: ${content}`)
      await sleep(500) // 避免请求过快
    }
    
    return true
  } catch (error) {
    logError(`发送测试消息失败: ${error.response?.data?.message || error.message}`)
    return false
  }
}

// 4. 测试 AI 问答功能
async function testAIAsk() {
  try {
    logInfo('步骤 4: 测试 AI 问答功能...')
    log('━'.repeat(60), 'blue')
    
    const question = 'React Hooks 的最佳实践是什么？'
    logInfo(`提问: ${question}`)
    
    const response = await axios.post(
      `${BASE_URL}/api/chatroom-ai/ask`,
      {
        roomId: testRoomId,
        question: question,
        useRAG: true
      },
      { 
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 120000 // 2分钟超时
      }
    )
    
    if (response.data.success) {
      logSuccess('AI 回答成功！')
      log('━'.repeat(60), 'blue')
      log('AI 回答:', 'cyan')
      log(response.data.answer, 'reset')
      log('━'.repeat(60), 'blue')
      
      if (response.data.sources && response.data.sources.length > 0) {
        logInfo(`参考了 ${response.data.sources.length} 条历史讨论`)
        response.data.sources.forEach((source, index) => {
          log(`  [${index + 1}] ${source.sender}: ${source.content.substring(0, 50)}...`, 'yellow')
        })
      }
      
      return true
    } else {
      logError('AI 回答失败')
      return false
    }
  } catch (error) {
    logError(`AI 问答测试失败: ${error.response?.data?.message || error.message}`)
    if (error.code === 'ECONNREFUSED') {
      logWarning('提示：请确保 AI 服务（Ollama）正在运行')
      logWarning('启动命令: ollama serve')
    }
    return false
  }
}

// 5. 测试代码分析功能
async function testCodeAnalysis() {
  try {
    logInfo('步骤 5: 测试代码分析功能...')
    log('━'.repeat(60), 'blue')
    
    const testCode = `
function Counter() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    console.log(count);
  });
  
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
`
    
    logInfo('分析代码:')
    log(testCode, 'yellow')
    
    const response = await axios.post(
      `${BASE_URL}/api/chatroom-ai/analyze-code`,
      {
        roomId: testRoomId,
        code: testCode,
        language: 'javascript'
      },
      { 
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 120000
      }
    )
    
    if (response.data.success) {
      logSuccess('代码分析成功！')
      log('━'.repeat(60), 'blue')
      log('分析结果:', 'cyan')
      log(response.data.analysis, 'reset')
      log('━'.repeat(60), 'blue')
      return true
    } else {
      logError('代码分析失败')
      return false
    }
  } catch (error) {
    logError(`代码分析测试失败: ${error.response?.data?.message || error.message}`)
    return false
  }
}

// 6. 测试相似问题查找
async function testSimilarQuestions() {
  try {
    logInfo('步骤 6: 测试相似问题查找...')
    log('━'.repeat(60), 'blue')
    
    const question = 'React 性能优化'
    logInfo(`查找与 "${question}" 相似的问题...`)
    
    const response = await axios.get(
      `${BASE_URL}/api/chatroom-ai/similar`,
      {
        params: {
          roomId: testRoomId,
          question: question
        },
        headers: { Authorization: `Bearer ${authToken}` }
      }
    )
    
    if (response.data.success) {
      logSuccess(`找到 ${response.data.questions.length} 个相似问题`)
      log('━'.repeat(60), 'blue')
      
      if (response.data.questions.length > 0) {
        response.data.questions.forEach((q, index) => {
          log(`[${index + 1}] ${q.sender}: ${q.content}`, 'yellow')
          log(`    相关度: ${Math.round(q.relevance * 100)}%`, 'cyan')
        })
      } else {
        logWarning('没有找到相似问题（可能是向量库未初始化）')
      }
      
      log('━'.repeat(60), 'blue')
      return true
    } else {
      logError('查找相似问题失败')
      return false
    }
  } catch (error) {
    logError(`相似问题查找测试失败: ${error.response?.data?.message || error.message}`)
    return false
  }
}

// 7. 测试讨论总结生成
async function testSummary() {
  try {
    logInfo('步骤 7: 测试讨论总结生成...')
    log('━'.repeat(60), 'blue')
    
    const response = await axios.post(
      `${BASE_URL}/api/chatroom-ai/summary`,
      {
        roomId: testRoomId,
        messageCount: 20
      },
      { 
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 120000
      }
    )
    
    if (response.data.success) {
      logSuccess('讨论总结生成成功！')
      log('━'.repeat(60), 'blue')
      log('总结内容:', 'cyan')
      log(response.data.summary, 'reset')
      log('━'.repeat(60), 'blue')
      logInfo(`总结了 ${response.data.messageCount} 条消息`)
      return true
    } else {
      logError('讨论总结生成失败')
      return false
    }
  } catch (error) {
    logError(`讨论总结测试失败: ${error.response?.data?.message || error.message}`)
    return false
  }
}

// 辅助函数：延迟
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 主测试流程
async function runTests() {
  log('\n' + '='.repeat(60), 'blue')
  log('聊天室 AI 功能测试', 'blue')
  log('='.repeat(60) + '\n', 'blue')
  
  const results = {
    login: false,
    getRoom: false,
    sendMessages: false,
    aiAsk: false,
    codeAnalysis: false,
    similarQuestions: false,
    summary: false
  }
  
  // 执行测试
  results.login = await login()
  if (!results.login) {
    logError('登录失败，终止测试')
    return
  }
  
  await sleep(1000)
  
  results.getRoom = await getOrCreateTestRoom()
  if (!results.getRoom) {
    logError('获取聊天室失败，终止测试')
    return
  }
  
  await sleep(1000)
  
  results.sendMessages = await sendTestMessages()
  
  await sleep(2000)
  
  // AI 功能测试
  results.aiAsk = await testAIAsk()
  
  await sleep(2000)
  
  results.codeAnalysis = await testCodeAnalysis()
  
  await sleep(2000)
  
  results.similarQuestions = await testSimilarQuestions()
  
  await sleep(2000)
  
  results.summary = await testSummary()
  
  // 输出测试结果
  log('\n' + '='.repeat(60), 'blue')
  log('测试结果汇总', 'blue')
  log('='.repeat(60), 'blue')
  
  const tests = [
    { name: '登录认证', key: 'login' },
    { name: '获取聊天室', key: 'getRoom' },
    { name: '发送测试消息', key: 'sendMessages' },
    { name: 'AI 问答', key: 'aiAsk' },
    { name: '代码分析', key: 'codeAnalysis' },
    { name: '相似问题查找', key: 'similarQuestions' },
    { name: '讨论总结', key: 'summary' }
  ]
  
  let passCount = 0
  tests.forEach(test => {
    const status = results[test.key] ? '✅ 通过' : '❌ 失败'
    const color = results[test.key] ? 'green' : 'red'
    log(`${test.name.padEnd(20)} ${status}`, color)
    if (results[test.key]) passCount++
  })
  
  log('='.repeat(60), 'blue')
  log(`总计: ${passCount}/${tests.length} 通过`, passCount === tests.length ? 'green' : 'yellow')
  log('='.repeat(60) + '\n', 'blue')
  
  if (passCount < tests.length) {
    logWarning('部分测试失败，请检查：')
    logWarning('1. 服务器是否正常运行 (npm run server)')
    logWarning('2. AI 服务是否启动 (ollama serve)')
    logWarning('3. 数据库连接是否正常')
    logWarning('4. 测试账号是否存在')
  } else {
    logSuccess('🎉 所有测试通过！聊天室 AI 功能运行正常！')
  }
}

// 运行测试
runTests().catch(error => {
  logError(`测试执行出错: ${error.message}`)
  console.error(error)
})
