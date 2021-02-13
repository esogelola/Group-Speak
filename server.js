const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { emit } = require("process");
dotenv.config();
const DB_URL = `mongodb+srv://ameroft:${process.env.DB_PASSWORD}@cluster0.dcuv4.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);

app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

mongoose.Promise = global.Promise;
var rooms = [
  "Anime",
  "Movies",
  "Free Time",
  "Books",
  "Travel",
  "Hobbies",
  "News",
  "Covid19",
  "NodeJS",
];
var users = [];

mongoose
  .connect(DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Successfully connected to the database mongoDB Atlas Server");
  })
  .catch((err) => {
    console.log("Could not connect to the database. Exiting now...", err);
    process.exit();
  });
app.get("/messages", (req, res) => {
  if (req.query.room) {
    Message.find({ room: req.query.room }, (err, messages) => {
      res.send(messages);
    });
  } else {
    res.sendStatus(500);
  }
});
const Message = mongoose.model("Message", {
  username: {
    type: String,
    required: true,
    lowercase: true,
  },
  room: { type: String, required: true, lowercase: true },
  message: { type: String, required: true, lowercase: true, trim: true },
  date_sent: { type: Date, required: true },
});

app.post("/messages", (req, res) => {
  var messageData = new Message(req.body);
  if (
    messageData.username == "" ||
    messageData.room == "" ||
    messageData.message.trim() == ""
  ) {
  } else {
    messageData.save((err) => {
      if (err) {
        //   sendStatus(500);
        console.log(err);
      }

      //Send Message to all users
      io.to(messageData.room).emit("message", req.body);
      res.sendStatus(200);
    });
  }
});

io.on("connect", (socket) => {
  console.log(`[${socket.id}] - has connected`);
  socket.emit("rooms", rooms);

  socket.on("join", (data) => {
    if (
      users.find(
        (user) => user.username == data.username && user.room == data.room
      ) != undefined
    ) {
      socket.emit(
        "userExists",
        data + " username is taken! Try some other username."
      );
    } else {
      users.push({
        socket_id: socket.id,
        username: data.username,
        room: data.room,
      });

      console.log(`${data.username} has joined #${data.room}`);

      socket.emit("userValid", data);

      socket.join(data.room.toLowerCase());
      socket.to(data.room.toLowerCase()).emit("userJoinedRoom", {
        username: data.username,
        room: data.room,
      });
    }
  });
  socket.on("userIsTyping", (data) => {
    socket.to(data.room.toLowerCase()).emit("userTyping", data);
  });
  socket.on("userStoppedTyping", (data) => {
    if (data.username != "") {
      socket.to(data.room.toLowerCase()).emit("stopTyping", data);
    }
  });

  socket.on("leave", (data) => {
    socket.leave(data.room.toLowerCase());
    users = users.filter((user) => user.socket_id != socket.id);
    console.log(`${data.username} has left #${data.room}`);
    socket.to(data.room.toLowerCase()).emit("userLeftRoom", {
      username: data.username,
      room: data.room,
    });
  });

  socket.on("disconnect", function (data) {
    users = users.filter((user) => user.socket_id != socket.id);
    console.log(`[${socket.id}] - has disconnected`);
  });
});

var server = http.listen(process.env.PORT, () => {
  console.log(`Server is listening on port ${process.env.PORT}`);
});
