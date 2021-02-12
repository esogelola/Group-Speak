var title = $("title");
var notificationNumber = 0;
var visibility = false;
var titleName = "Group Speak";
var socket = io();
//Chat room messages will be stored
var messages = [];
//Rooms will be stored
var rooms = [];
//Information about the current user that will be sent every time, (onJoin, onMessage, onExit)
var userData = {
  username: "",
  room: "",
};

//Update title on page load
$(function () {
  title.html(`${titleName}`);
});

//The following lines of code, are event listeners & Helper functions for those event listeners
const eventNotificationAdd = new Event("notificationAdd");
const eventNotificationRemove = new Event("notificationRemove");

//Notifications event listeners and helper function
function updateNotification() {
  title.html(
    (notificationNumber > 0 ? "(" + notificationNumber + ") " : "") +
      `${titleName}`
  );
}

document.addEventListener("visibilitychange", function (ev) {
  visibility = document.visibilityState == "hidden" ? false : true;
  if (visibility) {
    notificationNumber = 0;
    updateNotification();
  }
});

document.addEventListener(
  "notificationAdd",
  function (e) {
    notificationNumber = notificationNumber + 1;
    updateNotification();
  },
  false
);

document.addEventListener(
  "notificationRemove",
  function (e) {
    notificationNumber = notificationNumber - 1;
    updateNotification();
  },
  false
);

//Join Room function & Send Message Function

function joinRoom(data) {
  var valid = true;
  socket.emit("join", { username: data[0].value, room: data[1].value });
  socket.on("userExists", function (socketData) {
    console.log("user already exists");
    return false;
  });
  socket.on("userValid", (socketData) => {
    userData.username = socketData.username;
    userData.room = socketData.room;
    $("#joinScreen").hide();
    $("#chatScreen").show();
    $("#lblRoom").html(`#${userData.room}`);
    $("#lblMessage").html(`Message #${userData.room}`);
    getMessages();
  });

  return true;
}

//The following lines of code is the button join function
//Storing the username and users room in javascript
$(function () {
  $("#chatScreen").hide();
  $("#btnJoin").click((e) => {
    e.preventDefault();
    var data = $("form").serializeArray();
    joinRoom(data);
  });
  $("#btnDisconnect").click((e) => {
    e.preventDefault();
    $("#joinScreen").show();
    $("#chatScreen").hide();
    $("#lblRoom").html(``);
    $("#lblMessage").html(`Message`);

    socket.emit("leave", { username: userData.username, room: userData.room });
  });
  $("#btnSend").click((e) => {
    e.preventDefault();

    var message = $("#messageArea").val();
    $("#messageArea").val("");
    if (
      userData.username == "" ||
      userData.room == "" ||
      message.trim() == ""
    ) {
      console.log("Invalid");
    } else {
      sendMessage({
        username: userData.username,
        room: userData.room,
        message,
        date_sent: new Date(),
      });
    }
  });

  socket.on("message", addMessage);
});

function addMessage(messageData) {
  if (messageData.username != userData.username) {
    $("#messages").append(
      `<div><span class="mb-0 text-muted">${
        messageData.username
      } - [<span class="text-info">${formatDate(
        new Date(messageData.date_sent)
      )}</span>]</span><p class="mt-0 mb-3">${messageData.message}</p></div>`
    );
  } else {
    $("#messages").append(
      `<div class="text-end"><span class="mb-0 text-muted"> [<span class="text-info">${formatDate(
        new Date(messageData.date_sent)
      )}</span>] - ${messageData.username}</span><p class="mt-0 mb-3">${
        messageData.message
      }</p></div>`
    );
  }
  if (visibility == false) document.dispatchEvent(eventNotificationAdd);
}
function getMessages() {
  $.get(`group-speak.herokuapp.com/messages?room=${userData.room}`, (data) => {
    data.forEach(addMessage);
    $(".chat")
      .stop()
      .animate(
        {
          scrollTop: $(".chat")[0].scrollHeight,
        },
        800
      );
  });
}
function sendMessage(messageData) {
  $.post("group-speak.herokuapp.com/messages", messageData);
  $(".chat")
    .stop()
    .animate(
      {
        scrollTop: $(".chat")[0].scrollHeight,
      },
      800
    );
}
//Following lines of code is the socket.io client side

$(function () {
  socket.on("connect", () => {
    socket.on("rooms", (data) => {
      var roomList = $("#roomSelect");
      roomList.html("");
      for (var i = 0; i < data.length; i++) {
        var roomItem = data[i];
        roomList.append("<option>" + roomItem + "</option>");
      }
    });
  });
});

function formatDate(date) {
  return new Date().toLocaleString(undefined, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
