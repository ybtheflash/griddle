import { Server } from "socket.io";

const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    console.log("*First use, starting socket.io");

    const io = new Server(res.socket.server);

    io.on("connection", (socket) => {
      socket.on("createRoom", ({ playerName }) => {
        const roomKey = `${playerName}-${Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase()}`;
        socket.join(roomKey);
        socket.emit("roomCreated", { roomKey });
      });

      socket.on("joinRoom", ({ roomKey, playerName }) => {
        const room = io.sockets.adapter.rooms.get(roomKey);
        if (room && room.size === 1) {
          socket.join(roomKey);
          socket.to(roomKey).emit("playerJoined", { playerName });
          socket.emit("roomJoined", {
            creatorName: Array.from(room)[0],
            word: "", // This should be set by the room creator
            timer: 0, // This should be set by the room creator
          });
        } else {
          socket.emit("error", { message: "Room not found or full" });
        }
      });

      socket.on("startGame", ({ roomKey, word, timer }) => {
        io.to(roomKey).emit("gameStarted", { word, timer });
      });

      socket.on("updateProgress", ({ roomKey, progress }) => {
        socket.to(roomKey).emit("opponentProgress", progress);
      });

      socket.on("gameOver", ({ roomKey, message }) => {
        io.to(roomKey).emit("gameOver", { message });
      });
    });

    res.socket.server.io = io;
  } else {
    console.log("socket.io already running");
  }
  res.end();
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default ioHandler;
