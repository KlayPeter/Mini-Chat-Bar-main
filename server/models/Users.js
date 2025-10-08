const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    uID:String,
    uAvatar: {type:String,default:"/images/avatar/default-avatar.webp"},
    uName: String,
    Password: String,
    Friends: [{
      uID: String
    }]
})

module.exports = mongoose.model("Users",userSchema)