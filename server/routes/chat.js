const express = require('express')
const router = express.Router()
const Msg = require("../models/Messages")
const auth = require('../middlewares/auth')


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