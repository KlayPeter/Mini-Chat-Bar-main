const express = require("express")
const router = express.Router()
const auth = require("../middlewares/auth")
const GroupController = require("../controllers/GroupController")

// 创建群聊
router.post("/create", auth, GroupController.createGroup)

// 获取用户的所有群聊
router.get("/list", auth, GroupController.getUserGroups)

// 获取群聊详情
router.get("/:roomId", auth, GroupController.getGroupDetail)

// 邀请成员
router.post("/:roomId/invite", auth, GroupController.inviteMembers)

// 退出群聊
router.post("/:roomId/leave", auth, GroupController.leaveGroup)

// 发送群消息
router.post("/:roomId/messages", auth, GroupController.sendGroupMessage)

// 获取群消息列表
router.get("/:roomId/messages", auth, GroupController.getGroupMessages)

// 更新群信息
router.put("/:roomId", auth, GroupController.updateGroupInfo)

// 删除群消息
router.delete("/messages/:messageId", auth, GroupController.deleteGroupMessage)

module.exports = router