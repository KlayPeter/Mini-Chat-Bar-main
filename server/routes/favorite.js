const express = require('express')
const router = express.Router()
const auth = require('../middlewares/auth')
const FavoriteController = require('../controllers/FavoriteController')

// 添加收藏
router.post('/', auth, FavoriteController.addFavorite)

// 取消收藏
router.delete('/:messageId', auth, FavoriteController.removeFavorite)

// 获取收藏列表
router.get('/', auth, FavoriteController.getFavorites)

// 检查收藏状态
router.get('/check/:messageId', auth, FavoriteController.checkFavorite)

// 更新收藏
router.put('/:messageId', auth, FavoriteController.updateFavorite)

// 获取收藏统计
router.get('/stats', auth, FavoriteController.getStats)

module.exports = router
