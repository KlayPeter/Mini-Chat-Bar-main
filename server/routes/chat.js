const express = require('express')
const router = express.Router()
const Msg = require("../models/Messages")
const auth = require('../middlewares/auth')

// 专门的用户搜索接口
router.get("/search/users", auth, async (req, res) => {
    const { keyword, page = 1, limit = 20 } = req.query
    
    try {
        if (!keyword || keyword.trim() === '') {
            return res.status(400).json({ 
                success: false,
                message: "搜索关键词不能为空" 
            })
        }

        const User = require('../models/Users')
        const skip = (page - 1) * limit
        
        const userQuery = {
            $or: [
                { name: { $regex: keyword, $options: 'i' } },
                { email: { $regex: keyword, $options: 'i' } }
            ]
        }
        
        const users = await User.find(userQuery)
            .select('name email avatar')
            .skip(skip)
            .limit(parseInt(limit))
            .lean()

        const total = await User.countDocuments(userQuery)

        const userResults = users.map(user => {
            // 为用户名添加高亮
            if (user.name && user.name.toLowerCase().includes(keyword.toLowerCase())) {
                const regex = new RegExp(`(${keyword})`, 'gi')
                user.highlightedName = user.name.replace(regex, '<mark>$1</mark>')
            }
            user.resultType = 'user'
            return user
        })

        res.json({
            success: true,
            data: {
                results: userResults,
                pagination: {
                    current: parseInt(page),
                    limit: parseInt(limit),
                    total: total,
                    pages: Math.ceil(total / limit)
                }
            }
        })
    } catch (error) {
        console.error("用户搜索失败:", error)
        res.status(500).json({ 
            success: false,
            message: "用户搜索失败" 
        })
    }
})

// 搜索聊天记录接口
router.get("/search", auth, async (req, res) => {
    const myId = req.user.uid
    const { keyword, page = 1, limit = 20, targetUser } = req.query
    
    try {
        if (!keyword || keyword.trim() === '') {
            return res.status(400).json({ message: "搜索关键词不能为空" })
        }

        const skip = (page - 1) * limit
        let searchQuery = {
            $or: [
                { from: myId },
                { to: myId }
            ]
        }

        // 如果指定了目标用户，则只搜索与该用户的聊天记录
        if (targetUser) {
            searchQuery = {
                $or: [
                    { from: myId, to: targetUser },
                    { from: targetUser, to: myId }
                ]
            }
        }

        // 添加关键词搜索条件
        const keywordQuery = {
            $and: [
                searchQuery,
                {
                    $or: [
                        { content: { $regex: keyword, $options: 'i' } }, // 模糊匹配消息内容
                        { from: { $regex: keyword, $options: 'i' } }, // 模糊匹配发送者
                        { to: { $regex: keyword, $options: 'i' } }, // 模糊匹配接收者
                        { 'fileInfo.fileName': { $regex: keyword, $options: 'i' } } // 模糊匹配文件名
                    ]
                }
            ]
        }

        // 执行消息搜索查询，并关联用户信息
        const messages = await Msg.find(keywordQuery)
            .sort({ time: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('from', 'uName uAvatar')
            .populate('to', 'uName uAvatar')
            .lean()

        // 获取消息总数用于分页
        const messageTotal = await Msg.countDocuments(keywordQuery)

        // 为消息搜索结果添加高亮标记和类型标识
        const highlightedMessages = messages.map(msg => {
            if (msg.content && msg.content.toLowerCase().includes(keyword.toLowerCase())) {
                const regex = new RegExp(`(${keyword})`, 'gi')
                msg.highlightedContent = msg.content.replace(regex, '<mark>$1</mark>')
            }
            msg.resultType = 'message' // 标识为消息结果
            return msg
        })

        // 只返回消息搜索结果，不搜索用户
        res.json({
            success: true,
            data: {
                results: highlightedMessages,
                pagination: {
                    current: parseInt(page),
                    total: Math.ceil(messageTotal / limit),
                    count: messageTotal,
                    limit: parseInt(limit)
                },
                keyword: keyword,
                userCount: 0,
                messageCount: highlightedMessages.length
            }
        })

    } catch (err) {
        console.error('搜索聊天记录失败:', err)
        res.status(500).json({ message: "搜索失败，请稍后重试" })
    }
})

router.get("/last_message/:id",auth,async(req,res)=>{
    const myId = req.user.uid
    const targetId = req.params.id
    try{
    const messages = await Msg.find({
    $or: [
        { from: myId, to: targetId },
        { from: targetId, to: myId }
    ]
    }).sort({ time: -1 })
    res.json(messages[0])
    }catch(err){
    res.status(401).json({messages:"最新消息获取失败"})
    }
})

router.get("/messages/:id",auth,async(req,res)=>{
    const myId = req.user.uid
    const targetId = req.params.id
    try{
    const messages = await Msg.find({
    $or: [
        { from: myId, to: targetId },
        { from: targetId, to: myId }
    ]
    }).sort({ time: 1 })
    res.json(messages)
    }catch(err){
    res.status(401).json({messages:"消息获取失败"})
    }
})

router.post("/messages/:id",auth,async (req, res) => {
    const myId = req.user.uid
    const targetId = req.params.id
    const { content, messageType = 'text', fileInfo, isForwarded = false, forwardedFrom } = req.body
    
    try {
        const messageData = {
            from: myId,
            to: targetId,
            time: Date.now(),
            messageType: messageType,
            isForwarded: isForwarded
        }
        
        // 如果是转发消息，添加转发来源
        if (isForwarded && forwardedFrom) {
            messageData.forwardedFrom = forwardedFrom
        }
        
        // 根据消息类型设置content
        if (messageType === 'text') {
            messageData.content = content || ''
        } else if (messageType === 'image' || messageType === 'file') {
            // 文件和图片消息，content设置为文件名或描述
            if (fileInfo && fileInfo.fileName) {
                messageData.content = fileInfo.fileName
                messageData.fileInfo = fileInfo
            } else {
                return res.status(400).json({ message: "文件消息缺少文件信息" })
            }
        } else {
            messageData.content = content || ''
        }
        
        const new_mes = new Msg(messageData)
        await new_mes.save()
        res.json({ 
            message: "信息发送成功!",
            data: new_mes
        })
    } catch (err) {
        res.status(500).json({ message: `信息发送失败：${err}` })
    }
})

// 删除单条消息
router.delete("/message/:messageId", auth, async (req, res) => {
    const myId = req.user.uid
    const messageId = req.params.messageId
    
    try {
        // 只能删除自己发送的消息
        const result = await Msg.deleteOne({
            _id: messageId,
            from: myId
        })
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "消息不存在或无权删除" })
        }
        
        res.json({ 
            message: "消息删除成功!",
            deletedCount: result.deletedCount
        })
    } catch (err) {
        res.status(500).json({ message: `删除消息失败：${err}` })
    }
})

// 删除与指定用户的所有聊天记录
router.delete("/messages/:id", auth, async (req, res) => {
    const myId = req.user.uid
    const targetId = req.params.id
    
    try {
        const result = await Msg.deleteMany({
            $or: [
                { from: myId, to: targetId },
                { from: targetId, to: myId }
            ]
        })
        
        res.json({ 
            message: "聊天记录删除成功!",
            deletedCount: result.deletedCount
        })
    } catch (err) {
        res.status(500).json({ message: `删除聊天记录失败：${err}` })
    }
})

// 清空所有聊天记录（一键清空功能）
router.delete("/messages", auth, async (req, res) => {
    const myId = req.user.uid
    
    try {
        const result = await Msg.deleteMany({
            $or: [
                { from: myId },
                { to: myId }
            ]
        })
        
        res.json({ 
            message: "所有聊天记录清空成功!",
            deletedCount: result.deletedCount
        })
    } catch (err) {
        res.status(500).json({ message: `清空聊天记录失败：${err}` })
    }
})


module.exports = router