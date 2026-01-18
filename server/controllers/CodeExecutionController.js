const { VM } = require('vm2')

/**
 * 代码执行控制器 - 安全运行 JavaScript 代码
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
   * 获取支持的语言列表
   */
  static getSupportedLanguages(req, res) {
    res.json({
      success: true,
      languages: [
        {
          id: 'javascript',
          name: 'JavaScript',
          version: 'ES2020',
          supported: true,
          features: ['console.log', 'Math', 'Array', 'Object', 'String', 'Number']
        }
        // 未来可以扩展支持其他语言
      ]
    })
  }
}

module.exports = CodeExecutionController
