const mongoose = require("mongoose")

const roomSchema = new mongoose.Schema({
    RoomID: { type: String, required: true, unique: true }, // unique 会自动创建索引
    RoomName: { type: String, required: true },
    RoomAvatar: { type: String, default: '/images/group-default.png' },
    Creator: { type: String, required: true },
    Admins: [{ type: String }],
    Members: [{
        userID: { type: String, required: true },
        Nickname: String,
        Avatar: String,
        joinedAt: { type: Date, default: Date.now }
    }],
    Announcement: { type: String, default: '' },
    MaxMembers: { type: Number, default: 500 },
    // 新增：聊天室类型
    type: { 
        type: String, 
        enum: ['normal', 'chatroom'], 
        default: 'normal' 
    },
    // 新增：技术方向（仅聊天室使用）
    techDirection: { 
        type: String,
        default: ''
    },
    // 新增：加入方式
    joinType: {
        type: String,
        enum: ['public', 'invite', 'password'],
        default: 'public'
    },
    // 新增：邀请码
    inviteCode: {
        type: String,
        default: ''
    },
    // 新增：密码
    password: {
        type: String,
        default: ''
    },
    // 新增：聊天室持续时间（小时）
    duration: {
        type: Number,
        default: 24 // 默认24小时
    },
    // 新增：过期时间
    expiresAt: {
        type: Date,
        required: false
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
})

// 只添加额外需要的索引（RoomID 已经通过 unique 创建了索引）
roomSchema.index({ Creator: 1 })
roomSchema.index({ 'Members.userID': 1 })

module.exports = mongoose.model("Room", roomSchema)