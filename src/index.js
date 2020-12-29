const http = require("http");
const path = require("path");
const express = require("express");
const socketio = require("socket.io");
const Filter = require("bad-words");

const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/messages.js");
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require("./utils/users");

const app = express();

const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, "../public");

app.use(express.static(publicDirectoryPath));

io.on("connection", (socket) => {
  socket.on("join", (options, acknowledgement) => {
    const { user, error } = addUser({ id: socket.id, ...options });

    if (error) {
      return acknowledgement(error);
    }

    socket.join(user.room);

    socket.emit("message", generateMessage(`Welcome!`));
    socket.broadcast
      .to(user.room)
      .emit("message", generateMessage(`${user.username} has join the chat!`));
    io.to(user.room).emit("roomUsers", {
      users: getUsersInRoom(user.room),
      room: user.room,
    });
    acknowledgement();
  });

  socket.on("sendMessage", (text, acknowledgement) => {
    const filter = new Filter();
    if (filter.isProfane(text)) {
      return acknowledgement("Profanity is not allowed!");
    }

    const user = getUser(socket.id);

    io.to(user.room).emit("message", generateMessage(text, user.username));
    acknowledgement("Message was delivered!");
  });

  socket.on("sendLocation", (location, acknowledgement) => {
    const user = getUser(socket.id);

    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(
        `https://google.com/maps?q=${location.latitude},${location.longitude}`,
        user.username,
        location
      )
    );
    acknowledgement("Message was delivered!");
  });

  socket.on("stopSharingMap", (acknowledgement) => {
    const user = getUser(socket.id);
    io.to(user.room).emit("abortSharing");
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage(`${user.username} has left the chat!`)
      );
      io.to(user.room).emit("roomUsers", {
        users: getUsersInRoom(user.room),
        room: user.room,
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Server is up on port ${port}!`);
});
