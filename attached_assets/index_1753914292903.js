const http = require("node:http");
const express = require("express");
const socketio = require("socket.io");
const path = require("path");

const app = express();
const httpserver = http.Server(app);
const io = socketio(httpserver);

const gamedirectory = path.join(__dirname, "html");

app.use(express.static(gamedirectory));

httpserver.listen(3000);

var rooms = [];
var usernames = [];

// List of inappropriate words (expand as needed)
const inappropriateWords = ["badword1", "badword2", "badword3"];

io.on("connection", function (socket) {
  socket.on("join", function (room, username) {
    // Check for excessive spaces in the username
    if (
      username.trim().length < 3 ||
      username.trim().length < username.length - 3
    ) {
      socket.emit(
        "joinError",
        "Invalid username: Please use a username without excessive spaces.",
      );
      return; // Stop further processing
    }

    if (username != "") {
      rooms[socket.id] = room;
      usernames[socket.id] = username;
      socket.leaveAll();
      socket.join(room);
      io.in(room).emit(
        "recieve",
        "Server : " + username + " has entered the chat.",
      );
      socket.emit("join", room);
    }
  });

  socket.on("send", function (message) {
    // Check if the message contains an inappropriate word
    if (inappropriateWords.some((word) => message.includes(word))) {
      // Disconnect the offending user only
      socket.emit("disconnect", "Inappropriate language used");
      socket.disconnect(true, "Inappropriate language used");
      socket.emit(
        "recieve",
        "Server: You have been disconnected for using inappropriate language.",
      ); // Send a "disconnect" message to the client
    } else if (message.startsWith("//Kick ")) {
      // Check for kick command
      const targetUsername = message.substring(7).trim(); // Extract username
      if (usernames[socket.id] === "Server Admin") {
        // Check if sender is admin
        for (const id in usernames) {
          if (usernames[id] === targetUsername) {
            io.in(rooms[id]).emit(
              "recieve",
              "Server: " + targetUsername + " has been kicked.",
            );
            io.sockets.connected[id].disconnect(true, "You have been kicked."); // Correctly disconnect the socket
            delete rooms[id];
            delete usernames[id];
            break;
          }
        }
      } else {
        socket.emit("recieve", "Server: You are not authorized to kick users.");
      }
    } else {
      io.in(rooms[socket.id]).emit(
        "recieve",
        usernames[socket.id] + " : " + message,
      );
    }
  });

  socket.on("recieve", function (message) {
    socket.emit("recieve", message);
  });

  socket.on("disconnect", function (reason) {
    if (reason === "Inappropriate language used") {
      socket.emit(
        "recieve",
        "Server: You have been disconnected for using inappropriate language.",
      );
      // Redirect to the disconnected.html page
      socket.emit("redirect", "/disconnected.html");
    }
  });
});