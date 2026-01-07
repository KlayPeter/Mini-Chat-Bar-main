require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const Users = require("./models/Users");
const Room = require("./models/Room");
const Msg = require("./models/Messages");
const Contacts = require("./models/Contacts");

const MONGO_URL =
  process.env.MONGO_URL || "mongodb://localhost:27017/mini_chat_bar";

// 使用你给的两张头像图片
const avatarAlice =
  "https://img0.baidu.com/it/u=507530458,3063309470&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500";
const avatarBob =
  "https://img2.baidu.com/it/u=1653822177,3684881580&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=500";

async function main() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("✅ MongoDB 已连接，开始插入测试数据...");

    // 清空原数据
    await Users.deleteMany({});
    await Room.deleteMany({});
    await Msg.deleteMany({});
    await Contacts.deleteMany({});
    console.log("🧹 数据已清空");

    // 加密密码 - 符合规范：8位+数字+英文+特殊符号
    const pwdAlice = await bcrypt.hash("Alice123!", 10);
    const pwdBob = await bcrypt.hash("Bob123!", 10);

    // 插入用户
    await Users.insertMany([
      {
        uID: "u1",
        uName: "Alice",
        uEmail: "alice@test.com",
        Password: pwdAlice,
        uAvatar: avatarAlice,
        Friends: [{ uID: "u2" }],
      },
      {
        uID: "u2",
        uName: "Bob",
        uEmail: "bob@test.com",
        Password: pwdBob,
        uAvatar: avatarBob,
        Friends: [{ uID: "u1" }],
      },
    ]);
    console.log("✅ 用户数据插入完成");

    // 插入房间（聊天群组）
    await Room.insertMany([
      {
        RoomID: "1",
        RoomName: "Coffee Lovers ☕",
        Creator: "u1",
        Admins: ["u1"],
        Members: [
          { Nickname: "Alice", Avatar: avatarAlice, userID: "u1" },
          { Nickname: "Bob", Avatar: avatarBob, userID: "u2" },
        ],
      },
    ]);
    console.log("✅ 房间数据插入完成");

    // 插入消息
    await Msg.insertMany([
      {
        from: "u1",
        to: "u2",
        time: new Date(Date.now() - 1000 * 60 * 10),
        content: "Hi Bob, have you tried the new coffee at Barista?",
      },
      {
        from: "u2",
        to: "u1",
        time: new Date(Date.now() - 1000 * 60 * 8),
        content: "Hey Alice! Yes, it's amazing ☕✨",
      },
      {
        from: "u1",
        to: "u2",
        time: new Date(),
        content: "Wanna grab one tomorrow?",
      },
    ]);
    console.log("✅ 消息数据插入完成");

    // 插入联系人
    await Contacts.insertMany([
      {
        friendAvatar: avatarBob,
        friendName: "Bob",
        friendNickname: "Bobby",
      },
      {
        friendAvatar: avatarAlice,
        friendName: "Alice",
        friendNickname: "Ally",
      },
    ]);
    console.log("✅ 联系人数据插入完成");

    console.log("🎉 所有测试数据插入完成！");
  } catch (err) {
    console.error("❌ 初始化数据出错:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB 已断开连接");
  }
}

main();
