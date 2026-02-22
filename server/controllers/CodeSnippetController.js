const CodeSnippet = require('../models/CodeSnippet')

class CodeSnippetController {
  // 保存代码片段
  static async save(req, res) {
    try {
      const { title, code, language, description, tags, isPublic, roomId } = req.body
      const userId = req.user._id || req.user.userId || req.user.id

      const snippet = new CodeSnippet({
        title,
        code,
        language,
        description,
        tags,
        isPublic,
        roomId,
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

  // 获取房间的代码历史
  static async getRoomHistory(req, res) {
    try {
      const snippets = await CodeSnippet.find({ roomId: req.params.roomId })
        .sort({ createdAt: -1 })
        .limit(20)
      res.json({ success: true, snippets })
    } catch (error) {
      res.status(500).json({ success: false, message: error.message })
    }
  }

  // 更新代码片段
  static async update(req, res) {
    try {
      const { title, code, language, description, tags, isPublic } = req.body
      const snippet = await CodeSnippet.findById(req.params.id)

      if (!snippet) {
        return res.status(404).json({ success: false, message: '代码片段不存在' })
      }

      if (snippet.author.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: '无权限修改' })
      }

      Object.assign(snippet, { title, code, language, description, tags, isPublic })
      await snippet.save()
      res.json({ success: true, snippet })
    } catch (error) {
      res.status(500).json({ success: false, message: error.message })
    }
  }

  // 删除代码片段
  static async delete(req, res) {
    try {
      const snippet = await CodeSnippet.findById(req.params.id)

      if (!snippet) {
        return res.status(404).json({ success: false, message: '代码片段不存在' })
      }

      if (snippet.author.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: '无权限删除' })
      }

      await snippet.deleteOne()
      res.json({ success: true, message: '删除成功' })
    } catch (error) {
      res.status(500).json({ success: false, message: error.message })
    }
  }

  // 复制代码片段
  static async fork(req, res) {
    try {
      const original = await CodeSnippet.findById(req.params.id)

      if (!original) {
        return res.status(404).json({ success: false, message: '代码片段不存在' })
      }

      const snippet = new CodeSnippet({
        title: `${original.title} (副本)`,
        code: original.code,
        language: original.language,
        description: original.description,
        tags: original.tags,
        isPublic: false,
        author: req.user._id
      })

      await snippet.save()
      res.json({ success: true, snippet })
    } catch (error) {
      res.status(500).json({ success: false, message: error.message })
    }
  }
}

module.exports = CodeSnippetController
