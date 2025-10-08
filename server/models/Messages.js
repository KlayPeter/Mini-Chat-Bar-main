const mongoose = require("mongoose")

const msgSchema = new mongoose.Schema({
    from: String,
    to: String,
    time: Date,
    messageType: {
        type: String,
        enum: ['text', 'image', 'file'],
        default: 'text'
    },
    content: String, // 文本消息内容或文件名
    fileInfo: {
        fileName: String,
        fileUrl: String,
        fileSize: Number,
        fileType: String, // MIME类型
        thumbnailUrl: String // 图片缩略图URL（可选）
    },
    isForwarded: {
        type: Boolean,
        default: false
    },
    forwardedFrom: String // 转发来源用户名
})

module.exports = mongoose.model('Msg',msgSchema)