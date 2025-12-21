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
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
})

// 只添加额外需要的索引（RoomID 已经通过 unique 创建了索引）
roomSchema.index({ Creator: 1 })
roomSchema.index({ 'Members.userID': 1 })

module.exports = mongoose.model("Room", roomSchema)