const Room = require("../models/Room")

// 全局房间座位管理
const roomSeats = new Map();

module.exports = function(socket, io) {
  const avatars = ["🐔", "🐱", "🐮", "🐶", "🐹", "🐵", "🦊", "🐸"];
  
  // 获取或创建房间座位
  function getRoomSeats(roomId) {
    if (!roomSeats.has(roomId)) {
      roomSeats.set(roomId, Array.from({ length: 8 }, () => ({
        username: null,
        useravatar: "🪑",
        userID: null,
      })));
    }
    return roomSeats.get(roomId);
  }

  // 用户加入逻辑
  function userEnter(username, roomId) {
    const seats = getRoomSeats(roomId);
    
    // 检查用户是否已经在房间中
    const existingIndex = seats.findIndex(seat => seat.username === username);
    if (existingIndex !== -1) {
      // 用户已在房间中，更新socket ID
      seats[existingIndex].userID = socket.id;
      console.log(`用户 [${username}] 重新连接房间 [${roomId}]，座位 [${existingIndex}]`);
      io.to(roomId).emit("update", seats);
      return;
    }
    
    // 查找空座位
    const index = seats.findIndex(seat => seat.username === null);
    if (index !== -1) {
      seats[index].username = username;
      seats[index].useravatar = avatars[index];
      seats[index].userID = socket.id;

      console.log(`用户 [${username}] 加入房间 [${roomId}]，占用座位 [${index}]`);

      io.to(roomId).emit("update", seats);
    } else {
      console.log("房间已满");
      socket.emit("Full");
    }
  }

  // 用户退出逻辑
  function userExit(roomId) {
    const seats = getRoomSeats(roomId);
    const index = seats.findIndex(seat => seat.userID === socket.id);
    if (index !== -1) {
      const username = seats[index].username;
      seats[index] = { username: null, useravatar: "🪑", userID: null };
      console.log(`🚪 用户 [${username}] 离开房间 [${roomId}]，释放座位 [${index}]`);

      io.to(roomId).emit("update", seats);
    }
  }

  // 监听加入房间
  socket.on("joinroom", ({ room, username }) => {
    socket.data.room = room;
    socket.data.username = username;

    console.log(`用户 [${username}] 请求加入房间 [${room}]`);

    // 先加入Socket.IO房间
    socket.join(room);
    
    // 然后处理座位分配和广播
    userEnter(username, room);

    io.to(room).emit("notice", `用户 ${username} 进入房间`);
  });

  // 监听群聊消息
  socket.on("group-message", (msg, uname) => {
    console.log(`${uname}发来：${msg}`)
    io.to(socket.data.room).emit("group-message", { msg, uname });
  });

  // 监听断开连接
  socket.on("disconnect",async() => {
    console.log("用户断开 ->", socket.id);
    const roomID = socket.data.room;
    if (roomID) {
      userExit(roomID);
      io.to(roomID).emit("notice", `用户 ${socket.data.username} 离开房间`);
      
      const room = io.sockets.adapter.rooms.get(roomID);
      const roomSize = room ? room.size : 0;

      console.log(`房间 [${roomID}] 当前人数: ${roomSize}`);

      if (roomSize === 0) {
          console.log(`房间 [${roomID}] 无人在线，准备删除数据库房间数据`);
          // 清理房间座位数据
          roomSeats.delete(roomID);
          
          try {
              await Room.deleteOne({ roomID: roomID });  
              console.log(`房间 [${roomID}] 已成功从数据库删除`);
          } catch (err) {
              console.error("删除房间失败：", err);
          }
      }
    }
  });
};