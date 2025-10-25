require("dotenv").config();
const mongoose = require("mongoose");
const AIConversation = require("./models/AIConversation");

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/mini_chat_bar";

async function initAIConversation() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("✅ MongoDB 已连接");

    // 检查集合是否存在
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    if (collectionNames.includes('aiconversations')) {
      console.log("✅ AIConversation集合已存在");
      
      // 统计数据
      const count = await AIConversation.countDocuments();
      console.log(`📊 当前有 ${count} 个AI对话记录`);
    } else {
      console.log("📝 AIConversation集合不存在，将在第一次使用时自动创建");
    }

    // 创建索引
    await AIConversation.createIndexes();
    console.log("✅ 索引已创建/更新");

    console.log("\n🎉 AI对话功能数据库初始化完成！");
    console.log("\n📋 数据库信息:");
    console.log(`   数据库: mini_chat_bar`);
    console.log(`   集合: aiconversations`);
    console.log(`   索引: userId (用于快速查询用户对话)`);

  } catch (err) {
    console.error("❌ 初始化失败:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB 已断开连接");
  }
}

initAIConversation();

