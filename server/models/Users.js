const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    uID:String,
    uAvatar: {type:String,default:"/images/avatar/default-avatar.webp"},
    uName: String,
    uEmail: {type: String, unique: true, required: true}, // 邮箱字段
    Password: String,
    Friends: [{
      uID: String
    }]
}, {
    timestamps: true // 自动添加创建时间和更新时间
})

module.exports = mongoose.model("Users",userSchema)