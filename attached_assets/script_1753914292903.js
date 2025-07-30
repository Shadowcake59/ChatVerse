var socket;
var usernameInput;
var chatIDInput;
var messageInput;
var chatRoom;
var dingSound;
var messages = [];
var delay = true;
var isDisconnected = false; // Flag for actual disconnection

function onload() {
  socket = io();
  usernameInput = document.getElementById("NameInput");
  chatIDInput = document.getElementById("IDInput");
  messageInput = document.getElementById("ComposedMessage");
  chatRoom = document.getElementById("RoomID");
  dingSound = document.getElementById("Ding");

  socket.on("join", function (room) {
    chatRoom.innerHTML = "Chatroom : " + room;
  });

  socket.on("recieve", function (message) {
    if (isImageURL(message)) {
      addImageMessage(message);
    } else {
      console.log(message);
      messages.push(message);
      dingSound.currentTime = 0;
      dingSound.play();

      if (messages.length > 9) {
        messages.shift();
      }

      for (i = 0; i < messages.length; i++) {
        document.getElementById("Message" + i).innerHTML = messages[i];
        document.getElementById("Message" + i).style.color = "#303030";
      }
    }
  });

  socket.on("disconnect", function (reason) {
    // Check if the disconnect is due to inappropriate language or kick command
    if (isDisconnected) {
      window.location.href = "/disconnected.html"; // Redirect only if disconnected
    }
  });

  // Handle the redirect event
  socket.on("redirect", function (url) {
    window.location.href = url;
  });

  messageInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (messageInput.value.trim() !== "") {
        if (isImageURL(messageInput.value)) {
          sendImage(messageInput.value);
        } else {
          Send();
        }
      }
    }
  });
}

function addImageMessage(imageData) {
  var img = document.createElement("img");
  img.src = imageData;

  var container = document.getElementById("ImageContainer");
  container.appendChild(img);
}

function isImageURL(url) {
  return url.match(/\.(jpeg|jpg|gif|png|svg)$/i) !== null;
}

function sendImage(imageURL) {
  socket.emit("send", imageURL);
  messageInput.value = "";
}

function Connect() {
  socket.emit("join", chatIDInput.value, usernameInput.value);
}

function Send() {
  if (
    delay &&
    messageInput.value.trim() !== "" &&
    messageInput.value.length <= 500
  ) {
    delay = false;
    setTimeout(delayReset, 3000); // Wait 3 seconds before allowing another message
    socket.emit("send", messageInput.value);
    messageInput.value = "";
  } else if (messageInput.value.length > 500) {
    // Handle message exceeding character limit
    alert("Message exceeds character limit (500 characters)");
  }
}

function delayReset() {
  delay = true;
}
