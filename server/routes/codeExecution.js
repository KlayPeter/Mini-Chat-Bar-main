const express = require('express')
const router = express.Router()
const CodeExecutionController = require('../controllers/CodeExecutionController')
const auth = require('../middlewares/auth')

/**
 * @route   POST /api/code/execute
 * @desc    执行 JavaScript 代码
 * @access  Private
 */
router.post('/execute', auth, CodeExecutionController.executeJavaScript)

/**
 * @route   GET /api/code/languages
 * @desc    获取支持的编程语言列表
 * @access  Public
 */
router.get('/languages', CodeExecutionController.getSupportedLanguages)

module.exports = router
