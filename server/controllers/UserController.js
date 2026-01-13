const Users = require("../models/Users");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const EmailService = require("../services/emailService");
const PasswordValidator = require("../utils/passwordValidator");

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
        uEmail: uEmail || `user${uid}@temp.com`, // 临时邮箱
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

  // 发送验证码邮件
  static async sendVerificationCode(req, res) {
    const { email, type = 'register' } = req.body;
    
    try {
      // 验证邮箱格式
      if (!email || !PasswordValidator.validateEmail(email)) {
        return res.status(400).json({ message: "请输入有效的邮箱地址" });
      }

      // 如果是注册，检查邮箱是否已存在
      if (type === 'register') {
        const existingUser = await Users.findOne({ uEmail: email });
        if (existingUser) {
          return res.status(409).json({ message: "邮箱已被注册" });
        }
      } else if (type === 'login') {
        // 如果是登录，检查邮箱是否存在
        const existingUser = await Users.findOne({ uEmail: email });
        if (!existingUser) {
          return res.status(404).json({ message: "邮箱未注册" });
        }
      }

      const result = await EmailService.sendVerificationCode(email, type);
      if (result.success) {
        res.status(200).json({ message: result.message });
      } else {
        res.status(500).json({ message: result.message });
      }
    } catch (err) {
      console.error("发送验证码失败", err);
      res.status(500).json({ message: "服务器内部错误" });
    }
  }

  // 邮箱验证码注册
  static async registerWithEmail(req, res) {
    const { uName, uEmail, uPassword, verificationCode } = req.body;
    
    try {
      // 验证必填字段
      if (!uName || !uEmail || !uPassword || !verificationCode) {
        return res.status(400).json({ message: "所有字段都不能为空" });
      }

      // 验证邮箱格式
      if (!PasswordValidator.validateEmail(uEmail)) {
        return res.status(400).json({ message: "请输入有效的邮箱地址" });
      }

      // 验证密码强度
      const passwordValidation = PasswordValidator.validate(uPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ 
          message: "密码不符合要求", 
          errors: passwordValidation.errors 
        });
      }

      // 验证验证码
      const codeVerification = EmailService.verifyCode(uEmail, verificationCode, 'register');
      if (!codeVerification.success) {
        return res.status(400).json({ message: codeVerification.message });
      }

      // 检查用户名是否已存在
      const existingUserByName = await Users.findOne({ uName: uName });
      if (existingUserByName) {
        return res.status(409).json({ message: "用户名已存在" });
      }

      // 检查邮箱是否已存在
      const existingUserByEmail = await Users.findOne({ uEmail: uEmail });
      if (existingUserByEmail) {
        return res.status(409).json({ message: "邮箱已被注册" });
      }

      const uid = Date.now().toString();
      const hashedPassword = await bcrypt.hash(uPassword, saltRounds);
      
      const newUser = new Users({
        uID: uid,
        uAvatar: "/images/avatar/default-avatar.webp",
        uName: uName,
        uEmail: uEmail,
        Password: hashedPassword,
        Friends: [],
      });

      await newUser.save();
      res.status(200).json({ message: `用户 ${uName} 注册成功！` });
    } catch (err) {
      console.error("注册失败", err);
      res.status(500).json({ message: "服务器内部错误" });
    }
  }

  // 邮箱密码登录
  static async loginWithEmail(req, res) {
    const { email, password } = req.body;
    
    try {
      // 验证邮箱格式
      if (!PasswordValidator.validateEmail(email)) {
        return res.status(400).json({ message: "请输入有效的邮箱地址" });
      }

      const user = await Users.findOne({ uEmail: email });

      if (user) {
        const isMatch = await bcrypt.compare(password, user.Password);
        if (isMatch) {
          const token = jwt.sign(
            { userId: user.uID, username: user.uName, email: user.uEmail },
            SECRET_KEY,
            { expiresIn: "24h" }
          );
          res.status(200).json({
            message: "登录成功",
            token: token,
            user: {
              id: user.uID,
              name: user.uName,
              email: user.uEmail,
              ava: user.uAvatar,
            },
          });
        } else {
          res.status(401).json({ message: "密码错误" });
        }
      } else {
        res.status(404).json({ message: "邮箱未注册" });
      }
    } catch (err) {
      console.error("登录失败", err);
      res.status(500).json({ message: "服务器内部错误" });
    }
  }

  // 邮箱验证码登录
  static async loginWithVerificationCode(req, res) {
    const { email, verificationCode } = req.body;
    
    try {
      // 验证必填字段
      if (!email || !verificationCode) {
        return res.status(400).json({ message: "邮箱和验证码不能为空" });
      }

      // 验证邮箱格式
      if (!PasswordValidator.validateEmail(email)) {
        return res.status(400).json({ message: "请输入有效的邮箱地址" });
      }

      // 验证验证码
      const codeVerification = EmailService.verifyCode(email, verificationCode, 'login');
      if (!codeVerification.success) {
        return res.status(400).json({ message: codeVerification.message });
      }

      // 查找用户
      const user = await Users.findOne({ uEmail: email });
      if (!user) {
        return res.status(404).json({ message: "邮箱未注册" });
      }

      const token = jwt.sign(
        { userId: user.uID, username: user.uName, email: user.uEmail },
        SECRET_KEY,
        { expiresIn: "24h" }
      );

      res.status(200).json({
        message: "登录成功",
        token: token,
        user: {
          id: user.uID,
          name: user.uName,
          email: user.uEmail,
          ava: user.uAvatar,
        },
      });
    } catch (err) {
      console.error("验证码登录失败", err);
      res.status(500).json({ message: "服务器内部错误" });
    }
  }

  // 保留原有登录方法（向后兼容）
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
      console.log('=== getUserInfo被调用 ===');
      console.log('用户ID:', req.user.userId);
      
      const user = await Users.findOne({ uID: req.user.userId });
      console.log('查找到的用户:', user ? user.uName : '未找到');
      
      if (user) {
        const userInfo = {
          user: {
            uID: user.uID,
            uName: user.uName,
            uAvatar: user.uAvatar,
            uEmail: user.uEmail,
            provider: user.provider || 'local',
            isEmailVerified: user.isEmailVerified || false
          }
        };
        console.log('返回用户信息:', userInfo);
        res.status(200).json(userInfo);
      } else {
        console.log('用户不存在, userId:', req.user.userId);
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

  // 搜索用户（按用户名或邮箱模糊搜索）
  static async searchUsers(req, res) {
    try {
      const { query } = req.query;
      const currentUserId = req.user.userId;

      if (!query || query.trim().length < 1) {
        return res.status(400).json({ message: "搜索关键词至少需要1个字符" });
      }

      // 构建搜索条件：用户名或邮箱包含关键词（不区分大小写）
      const searchCondition = {
        $and: [
          { uID: { $ne: currentUserId } }, // 排除自己
          {
            $or: [
              { uName: { $regex: query, $options: 'i' } }, // 用户名模糊搜索
              { uEmail: { $regex: query, $options: 'i' } } // 邮箱模糊搜索
            ]
          }
        ]
      };

      // 搜索用户，只返回必要字段
      const users = await Users.find(
        searchCondition,
        { uID: 1, uName: 1, uEmail: 1, uAvatar: 1, _id: 0 }
      ).limit(10); // 限制返回10个结果

      // 获取当前用户的好友列表，标记已是好友的用户
      const currentUser = await Users.findOne({ uID: currentUserId });
      const friendIds = currentUser ? currentUser.Friends.map(friend => friend.uID) : [];

      const usersWithFriendStatus = users.map(user => ({
        ...user.toObject(),
        isFriend: friendIds.includes(user.uID)
      }));

      res.status(200).json({
        users: usersWithFriendStatus,
        total: users.length
      });
    } catch (err) {
      console.error("搜索用户失败", err);
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

  // 更新用户名
  static async updateUsername(req, res) {
    try {
      const { username } = req.body;
      const userId = req.user.userId;

      // 验证用户名
      if (!username || username.trim().length < 2) {
        return res.status(400).json({ message: "用户名至少需要2个字符" });
      }

      if (username.trim().length > 20) {
        return res.status(400).json({ message: "用户名不能超过20个字符" });
      }

      // 检查用户名是否已被占用
      const existingUser = await Users.findOne({ 
        uName: username.trim(),
        uID: { $ne: userId } // 排除自己
      });

      if (existingUser) {
        return res.status(409).json({ message: "用户名已被占用" });
      }

      await Users.updateOne(
        { uID: userId },
        { $set: { uName: username.trim() } }
      );

      res.status(200).json({
        message: "用户名更新成功",
        username: username.trim(),
      });
    } catch (err) {
      console.error("更新用户名失败", err);
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