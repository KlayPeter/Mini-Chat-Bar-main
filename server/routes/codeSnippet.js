const express = require('express')
const router = express.Router()
const CodeSnippetController = require('../controllers/CodeSnippetController')
const auth = require('../middlewares/auth')

router.post('/save', auth, CodeSnippetController.save)
router.get('/my', auth, CodeSnippetController.getMySnippets)
router.get('/room/:roomId', auth, CodeSnippetController.getRoomHistory)
router.get('/:id', auth, CodeSnippetController.getById)
router.put('/:id', auth, CodeSnippetController.update)
router.delete('/:id', auth, CodeSnippetController.delete)
router.post('/:id/fork', auth, CodeSnippetController.fork)

module.exports = router
