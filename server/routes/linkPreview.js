const express = require('express')
const router = express.Router()
const LinkPreviewController = require('../controllers/LinkPreviewController')
const auth = require('../middlewares/auth')

router.post('/fetch', auth, LinkPreviewController.fetchPreview)

module.exports = router
