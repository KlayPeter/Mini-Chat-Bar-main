const mongoose = require("mongoose")

const msgSchema = new mongoose.Schema({
    from: String,
    to: String,
    time: Date,
    messageType: {
        type: String,
        enum: ['text', 'image', 'file', 'video', 'audio', 'chatroom_invite'],
        default: 'text'
    },
    content: String, // 文本消息内容或文件名
    fileInfo: {
        fileName: String,
        fileUrl: String,
        fileSize: Number,
        fileType: String, // MIME类型
        thumbnailUrl: String, // 图片缩略图URL（可选）
        duration: Number // 语音/视频时长（秒）
    },
    isForwarded: {
        type: Boolean,
        default: false
    },
    forwardedFrom: String, // 转发来源用户名
    isRead: {
        type: Boolean,
        default: false
    },
    readTime: Date // 已读时间
})

// 为content字段创建文本索引，支持全文搜索
msgSchema.index({ content: 'text' })
// 为from和to字段创建复合索引，优化用户相关搜索
msgSchema.index({ from: 1, to: 1 })
// 为时间字段创建索引，支持按时间排序
msgSchema.index({ time: -1 })

module.exports = mongoose.model('Msg',msgSchema)