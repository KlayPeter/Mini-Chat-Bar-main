const express = require('express')
const router = express.Router()
const CodeSnippetController = require('../controllers/CodeSnippetController')
const auth = require('../middlewares/auth')

router.post('/save', auth, CodeSnippetController.save)
router.get('/my', auth, CodeSnippetController.getMySnippets)
router.get('/:id', auth, CodeSnippetController.getById)

module.exports = router
