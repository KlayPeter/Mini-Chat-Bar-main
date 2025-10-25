const Users = require("../models/Users");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const SECRET_KEY = "MORTALKOMBAT";
const saltRounds = 10;

class UserController {
  // 用户注册
  static async register(req, res) {
    const { uName, uEmail, uPassword } = req.body;
    
    try {
      // 验证必填字段
      if (!uName || !uPassword) {
        return res.status(400).json({ message: "用户名和密码不能为空" });
      }

      const oldUser = await Users.findOne({ uName: uName });
      if (oldUser) {
        return res.status(409).json({ message: "用户名已存在,注册失败" });
      }

      const uid = Date.now();
      const hashedPassword = await bcrypt.hash(uPassword, saltRounds);
      
      const newUser = new Users({
        uID: uid,
        uAvatar: "/images/avatar/default-avatar.webp",
        uName: uName,
        Password: hashedPassword,
        Friends: [],
      });

      await newUser.save();
      res.status(200).json({ message: `新用户 ${uName} 注册成功!` });
    } catch (err) {
      console.error("注册失败", err);
      res.status(500).json({ message: "服务器内部错误" });
    }
  }

  // 用户登录
  static async login(req, res) {
    const { username, password } = req.body;
    
    try {
      const user = await Users.findOne({ uName: username });

      if (user) {
        const isMatch = await bcrypt.compare(password, user.Password);
        if (isMatch) {
          const token = jwt.sign(
            { userId: user.uID, username: user.uName },
            SECRET_KEY,
            { expiresIn: "24h" }
          );
          res.status(200).json({
            message: "登录成功",
            token: token,
            user: {
              id: user.uID,
              name: user.uName,
              ava: user.uAvatar,
            },
          });
        } else {
          res.status(401).json({ message: "密码错误" });
        }
      } else {
        res.status(404).json({ message: "用户不存在" });
      }
    } catch (err) {
      console.error("登录失败", err);
      res.status(500).json({ message: "服务器内部错误" });
    }
  }

  // 获取用户信息
  static async getUserInfo(req, res) {
    try {
      const user = await Users.findOne({ uID: req.user.userId });
      if (user) {
        res.status(200).json({
          id: user.uID,
          name: user.uName,
          ava: user.uAvatar,
        });
      } else {
        res.status(404).json({ message: "用户不存在" });
      }
    } catch (err) {
      console.error("获取用户信息失败", err);
      res.status(500).json({ message: "服务器内部错误" });
    }
  }

  // 获取好友头像
  static async getFriendAvatar(req, res) {
    try {
      const { id } = req.params;
      const user = await Users.findOne({ uID: id });
      if (user) {
        res.status(200).json({ avatar: user.uAvatar });
      } else {
        res.status(404).json({ message: "用户不存在" });
      }
    } catch (err) {
      console.error("获取好友头像失败", err);
      res.status(500).json({ message: "服务器内部错误" });
    }
  }

  // 获取好友列表
  static async getFriends(req, res) {
    try {
      const user = await Users.findOne({ uID: req.user.userId });
      if (!user) {
        return res.status(404).json({ message: "用户不存在" });
      }

      const friendIds = user.Friends.map(friend => friend.uID);
      const friends = await Users.find(
        { uID: { $in: friendIds } },
        { uID: 1, uName: 1, uAvatar: 1, _id: 0 }
      );

      res.status(200).json(friends);
    } catch (err) {
      console.error("获取好友列表失败", err);
      res.status(500).json({ message: "服务器内部错误" });
    }
  }

  // 添加好友
  static async addFriend(req, res) {
    try {
      const { friendId } = req.body;
      const userId = req.user.userId;

      if (userId === friendId) {
        return res.status(400).json({ message: "不能添加自己为好友" });
      }

      const user = await Users.findOne({ uID: userId });
      const friend = await Users.findOne({ uID: friendId });

      if (!user || !friend) {
        return res.status(404).json({ message: "用户不存在" });
      }

      if (user.Friends.some(friend => friend.uID === friendId)) {
        return res.status(400).json({ message: "已经是好友关系" });
      }

      await Users.updateOne(
        { uID: userId },
        { $push: { Friends: { uID: friendId } } }
      );

      await Users.updateOne(
        { uID: friendId },
        { $push: { Friends: { uID: userId } } }
      );

      res.status(200).json({ message: "添加好友成功" });
    } catch (err) {
      console.error("添加好友失败", err);
      res.status(500).json({ message: "服务器内部错误" });
    }
  }

  // 更新用户头像
  static async updateAvatar(req, res) {
    try {
      const { avatar } = req.body;
      const userId = req.user.userId;

      await Users.updateOne(
        { uID: userId },
        { $set: { uAvatar: avatar } }
      );

      res.status(200).json({
        message: "头像更新成功",
        avatar: avatar,
      });
    } catch (err) {
      console.error("更新头像失败", err);
      res.status(500).json({ message: "服务器内部错误" });
    }
  }

  // 删除好友
  static async deleteFriend(req, res) {
    try {
      const { friendId } = req.params;
      const userId = req.user.userId;

      if (userId === friendId) {
        return res.status(400).json({ message: "不能删除自己" });
      }

      const user = await Users.findOne({ uID: userId });
      const friend = await Users.findOne({ uID: friendId });

      if (!user || !friend) {
        return res.status(404).json({ message: "用户不存在" });
      }

      // 双向删除好友关系
      await Users.updateOne(
        { uID: userId },
        { $pull: { Friends: { uID: friendId } } }
      );

      await Users.updateOne(
        { uID: friendId },
        { $pull: { Friends: { uID: userId } } }
      );

      res.status(200).json({ message: "删除好友成功" });
    } catch (err) {
      console.error("删除好友失败", err);
      res.status(500).json({ message: "服务器内部错误" });
    }
  }
}

module.exports = UserController;