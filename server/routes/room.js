const express = require("express")
const router = express.Router()
const auth = require("../middlewares/auth")
const GroupController = require("../controllers/GroupController")

// 创建群聊
router.post("/create", auth, GroupController.createGroup)

// 获取用户的所有群聊
router.get("/list", auth, GroupController.getUserGroups)

// 获取用户的所有技术聊天室 - 必须在 /:roomId 之前
router.get("/chatrooms", auth, GroupController.getChatRooms)

// 通过邀请码加入聊天室 - 必须在 /:roomId 之前
router.post("/join", auth, GroupController.joinRoomByInviteCode)

// 通过密码加入聊天室 - 必须在 /:roomId 之前
router.post("/join-by-password", auth, GroupController.joinRoomByPassword)

// 搜索所有群的历史消息 - 必须在 /:roomId 之前
router.get("/search/messages", auth, (req, res, next) => {
  console.log('=== /room/search/messages 路由被访问 ===')
  next()
}, GroupController.searchAllMessages)

// 获取群聊详情 - 动态路由放在最后
router.get("/:roomId", auth, GroupController.getGroupDetail)

// 邀请成员
router.post("/:roomId/invite", auth, GroupController.inviteMembers)

// 退出群聊
router.post("/:roomId/leave", auth, GroupController.leaveGroup)

// 解散聊天室（仅创建者）
router.delete("/:roomId/dissolve", auth, GroupController.dissolveRoom)

// 发送群消息
router.post("/:roomId/messages", auth, GroupController.sendGroupMessage)

// 获取群消息列表
router.get("/:roomId/messages", auth, GroupController.getGroupMessages)

// 更新群信息
router.put("/:roomId", auth, GroupController.updateGroupInfo)

// 删除群消息
router.delete("/messages/:messageId", auth, GroupController.deleteGroupMessage)

module.exports = router