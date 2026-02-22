const CodeSnippet = require('../models/CodeSnippet')

class CodeSnippetController {
  // 保存代码片段
  static async save(req, res) {
    try {
      console.log('保存代码片段请求:', req.body)
      console.log('用户信息:', req.user)

      const { title, code, language, description, tags, isPublic } = req.body
      const userId = req.user._id || req.user.userId || req.user.id

      const snippet = new CodeSnippet({
        title,
        code,
        language,
        description,
        tags,
        isPublic,
        author: userId
      })
      await snippet.save()
      res.json({ success: true, snippet })
    } catch (error) {
      console.error('保存代码片段失败:', error)
      res.status(500).json({ success: false, message: error.message })
    }
  }

  // 获取我的代码片段
  static async getMySnippets(req, res) {
    try {
      const snippets = await CodeSnippet.find({ author: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50)
      res.json({ success: true, snippets })
    } catch (error) {
      res.status(500).json({ success: false, message: error.message })
    }
  }

  // 获取单个代码片段
  static async getById(req, res) {
    try {
      const snippet = await CodeSnippet.findById(req.params.id).populate('author', 'username')
      if (!snippet) {
        return res.status(404).json({ success: false, message: '代码片段不存在' })
      }
      snippet.views += 1
      await snippet.save()
      res.json({ success: true, snippet })
    } catch (error) {
      res.status(500).json({ success: false, message: error.message })
    }
  }
}

module.exports = CodeSnippetController
