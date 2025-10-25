const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const AIController = require("../controllers/AIController");

// AI聊天（支持上下文和角色）
router.post("/deepseek-chat", auth, AIController.chat);

// 获取对话历史
router.get("/conversation/history", auth, AIController.getHistory);

// 清空对话历史
router.delete("/conversation/history", auth, AIController.clearHistory);

// 切换角色
router.post("/conversation/role", auth, AIController.switchRole);

// 获取可用角色列表
router.get("/conversation/roles", auth, AIController.getRoles);

module.exports = router;
