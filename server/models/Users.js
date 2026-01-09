const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    uID:String,
    uAvatar: {type:String,default:"/images/avatar/default-avatar.webp"},
    uName: String,
    uEmail: {type: String, unique: true, sparse: true}, // 邮箱字段，sparse允许多个null值
    Password: String,
    Friends: [{
      uID: String
    }],
    // OAuth 相关字段
    googleId: String,
    githubId: String,
    provider: {
        type: String,
        enum: ['local', 'google', 'github'],
        default: 'local'
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true // 自动添加创建时间和更新时间
})

module.exports = mongoose.model("Users",userSchema)