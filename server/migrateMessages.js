require("dotenv").config();
const mongoose = require("mongoose");
const Msg = require("./models/Messages");

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/mini_chat_bar";

async function migrateMessages() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("✅ MongoDB 已连接");

    // 更新所有没有 isRead 字段的消息
    const result = await Msg.updateMany(
      { isRead: { $exists: false } },
      { $set: { isRead: false } }
    );

    console.log(`✅ 已更新 ${result.modifiedCount} 条消息，添加 isRead 字段`);

    // 统计信息
    const totalMessages = await Msg.countDocuments();
    const unreadMessages = await Msg.countDocuments({ isRead: false });
    
    console.log(`📊 数据库统计:`);
    console.log(`   - 总消息数: ${totalMessages}`);
    console.log(`   - 未读消息: ${unreadMessages}`);
    console.log(`   - 已读消息: ${totalMessages - unreadMessages}`);

  } catch (err) {
    console.error("❌ 迁移失败:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB 已断开连接");
  }
}

migrateMessages();

