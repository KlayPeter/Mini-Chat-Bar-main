/*
 * @Author: KlayPeter kt_mmxyy2377@qq.com
 * @Date: 2025-08-20 20:21:24
 * @LastEditors: KlayPeter kt_mmxyy2377@qq.com
 * @LastEditTime: 2025-10-11 11:05:52
 * @FilePath: \Mini-Chat-Bar-main\server\routes\user.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const UserController = require("../controllers/UserController");

// 注册
router.post("/register", UserController.register);

// 登录
router.post("/login", UserController.login);

//获取当前用户基本信息
router.get("/info", auth, UserController.getUserInfo);

//获取好友头像
router.get("/friend_avatar/:id", UserController.getFriendAvatar);

//获取好友列表
router.get("/friends", auth, UserController.getFriends);

//添加好友
router.post("/add", auth, UserController.addFriend);

//更新用户头像
router.put("/avatar", auth, UserController.updateAvatar);

//删除好友
router.delete("/friend/:friendId", auth, UserController.deleteFriend);

module.exports = router;
