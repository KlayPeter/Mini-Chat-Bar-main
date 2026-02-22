const { VM } = require('vm2')
const axios = require('axios')

/**
 * 代码执行控制器 - 支持多语言代码执行
 */
class CodeExecutionController {
  
  /**
   * 执行 JavaScript 代码
   */
  static async executeJavaScript(req, res) {
    try {
      const { code, timeout = 5000 } = req.body
      
      if (!code) {
        return res.status(400).json({ 
          success: false,
          message: '代码不能为空' 
        })
      }
      
      // 代码长度限制
      if (code.length > 10000) {
        return res.status(400).json({ 
          success: false,
          message: '代码长度不能超过 10000 字符' 
        })
      }
      
      console.log(`🚀 执行 JavaScript 代码，长度: ${code.length}`)
      console.log(`代码内容:`, JSON.stringify(code))

      // 创建安全的 VM 沙箱
      const vm = new VM({
        timeout: Math.min(timeout, 10000), // 最多 10 秒
        sandbox: {
          console: {
            log: (...args) => {
              output.logs.push(args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
              ).join(' '))
            },
            error: (...args) => {
              output.errors.push(args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
              ).join(' '))
            },
            warn: (...args) => {
              output.warnings.push(args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
              ).join(' '))
            }
          }
        }
      })
      
      // 收集输出
      const output = {
        logs: [],
        errors: [],
        warnings: [],
        result: null,
        error: null
      }
      
      const startTime = Date.now()
      
      try {
        // 执行代码
        const result = vm.run(code)
        output.result = result
        
        const executionTime = Date.now() - startTime
        
        console.log(`✅ 代码执行成功，耗时: ${executionTime}ms`)
        
        res.json({
          success: true,
          output: {
            ...output,
            executionTime
          }
        })
        
      } catch (execError) {
        const executionTime = Date.now() - startTime
        
        console.log(`❌ 代码执行失败: ${execError.message}`)
        
        // 捕获运行时错误
        output.error = {
          message: execError.message,
          name: execError.name,
          stack: execError.stack
        }
        
        res.json({
          success: false,
          output: {
            ...output,
            executionTime
          },
          message: '代码执行出错'
        })
      }
      
    } catch (err) {
      console.error('❌ 代码执行控制器错误:', err)
      res.status(500).json({ 
        success: false,
        message: '代码执行失败',
        error: err.message 
      })
    }
  }
  
  /**
   * 执行多语言代码（通用接口）
   */
  static async execute(req, res) {
    const { code, language = 'javascript', stdin = '' } = req.body

    if (!code) {
      return res.status(400).json({ success: false, message: '代码不能为空' })
    }

    if (language === 'javascript') {
      return CodeExecutionController.executeJavaScript(req, res)
    }

    // 其他语言使用Judge0（需要配置API Key）
    try {
      const result = await CodeExecutionController.executeWithJudge0(code, language, stdin)
      res.json({ success: true, output: result })
    } catch (error) {
      res.status(500).json({ success: false, message: error.message })
    }
  }

  /**
   * 使用Judge0执行代码
   */
  static async executeWithJudge0(code, language, stdin) {
    const languageIds = { python: 71, java: 62, cpp: 54, go: 60, c: 50 }
    const languageId = languageIds[language]

    if (!languageId) {
      throw new Error(`暂不支持 ${language}，请使用Judge0 API`)
    }

    // 简化版：直接返回提示信息
    return {
      logs: [`${language} 代码执行需要配置Judge0 API`],
      result: '请在.env中配置JUDGE0_API_KEY',
      executionTime: 0
    }
  }

  /**
   * 获取支持的语言列表
   */
  static getSupportedLanguages(req, res) {
    res.json({
      success: true,
      languages: [
        { id: 'javascript', name: 'JavaScript', supported: true },
        { id: 'python', name: 'Python', supported: false },
        { id: 'java', name: 'Java', supported: false },
        { id: 'cpp', name: 'C++', supported: false },
        { id: 'go', name: 'Go', supported: false }
      ]
    })
  }
}

module.exports = CodeExecutionController
