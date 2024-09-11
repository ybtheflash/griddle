import { Server } from "socket.io";

const SocketHandler = (req, res) => {
  if (res.socket.server.io) {
    console.log("Socket is already running");
    res.end();
    return;
  }

  console.log("Socket is initializing");
  const io = new Server(res.socket.server);
  res.socket.server.io = io;

  const rooms = new Map();

  io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);

    socket.on("createRoom", ({ playerName }) => {
      const roomKey = Math.random().toString(36).substring(2, 8).toUpperCase();
      rooms.set(roomKey, {
        host: socket.id,
        players: [{ id: socket.id, name: playerName }],
        word: null,
      });
      socket.join(roomKey);
      socket.emit("roomCreated", { roomKey });
    });

    socket.on("joinRoom", ({ roomKey, playerName }) => {
      const room = rooms.get(roomKey);
      if (room && room.players.length < 2) {
        room.players.push({ id: socket.id, name: playerName });
        socket.join(roomKey);
        socket.to(roomKey).emit("playerJoined", { playerName });
        socket.emit("roomJoined", { creatorName: room.players[0].name });
      } else {
        socket.emit("roomFull");
      }
    });

    socket.on("startGame", ({ roomKey, word }) => {
      const room = rooms.get(roomKey);
      if (room) {
        room.word = word;
        io.to(roomKey).emit("gameStarted", { word });
      }
    });

    socket.on("updateProgress", ({ roomKey, guesses, correctChars }) => {
      socket.to(roomKey).emit("opponentProgress", { guesses, correctChars });
    });

    socket.on("hintTaken", ({ roomKey }) => {
      socket.to(roomKey).emit("opponentHintTaken");
    });

    socket.on("gameOver", ({ roomKey, winner }) => {
      io.to(roomKey).emit("gameOver", { winner });
    });

    socket.on("rematch", ({ roomKey }) => {
      io.to(roomKey).emit("rematch");
    });

    socket.on("leaveRoom", ({ roomKey }) => {
      const room = rooms.get(roomKey);
      if (room) {
        room.players = room.players.filter((player) => player.id !== socket.id);
        if (room.players.length === 0) {
          rooms.delete(roomKey);
        } else {
          socket.to(roomKey).emit("playerLeft", { playerName: socket.id });
        }
      }
      socket.leave(roomKey);
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
      rooms.forEach((room, roomKey) => {
        if (room.players.some((player) => player.id === socket.id)) {
          socket.to(roomKey).emit("playerLeft", { playerName: socket.id });
          room.players = room.players.filter(
            (player) => player.id !== socket.id
          );
          if (room.players.length === 0) {
            rooms.delete(roomKey);
          }
        }
      });
    });
  });

  res.end();
};

export default SocketHandler;
