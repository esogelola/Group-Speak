var title = $("title");
var notificationNumber = 0;
var visibility = false;
var titleName = "Group Speak";
var socket = io();

var lastTypedTime = new Date(0);
var typingDelayMillis = 5000;

//Chat room messages will be stored
var messages = [];
//Rooms will be stored
var rooms = [];
//Information about the current user that will be sent every time, (onJoin, onMessage, onExit)
var userData = {
  username: "",
  room: "",
};
var initialMessageLoad = true;
/*
TODO: How many users are in the current room, let the user know.
TODO: 
*/
//Update title on page load
$(function () {
  title.html(`${titleName}`);
  $("#alertHome").hide();
});
//Typing Status helper (https://stackoverflow.com/questions/8963810/user-is-typing-function-in-chat)
function refreshTypingStatus() {
  if (
    !$("#messageArea").is(":focus") ||
    $("#messageArea").val() == "" ||
    new Date().getTime() - lastTypedTime.getTime() > typingDelayMillis
  ) {
    if (userData.username != "" && userData.room != "") {
      socket.emit("userStoppedTyping", {
        username: userData.username,
        room: userData.room,
        typingTime: new Date().getTime() - lastTypedTime.getTime(),
      });
    }
  } else {
    if (userData.username != "" && userData.room != "") {
      socket.emit("userIsTyping", {
        username: userData.username,
        room: userData.room,
        typingTime: new Date().getTime() - lastTypedTime.getTime(),
      });
    }
  }
}
function updateLastTypedTime() {
  lastTypedTime = new Date();
}
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
    $("#alertHome").html(
      `Someone  by ${data[0].value} is already in #${data[1].value}`
    );
    $("#alertHome").show();
    return false;
  });
  socket.on("userValid", (socketData) => {
    userData.username = socketData.username;
    userData.room = socketData.room;
    $("#joinScreen").hide();
    $("#chatScreen").show();
    $("#lblRoom").html(`#${userData.room}`);
    $("#lblMessage").html(`Message #${userData.room}`);
    $("#userInfo").html(
      `<small class="text-muted">username: <span class="text-primary">[${data[0].value}]</span></small>`
    );
    getMessages();

    socket.on("userJoinedRoom", (data) => {
      console.log(`${data.username} has joined ${data.room}`);
      $("#messages").append(
        `<div class="w-100 mx-auto my-3 text-center"><p class="text-muted">${data.username} has joined ${data.room}</p></div>`
      );
      $(".chat")
        .stop()
        .animate(
          {
            scrollTop: $(".chat")[0].scrollHeight,
          },
          800
        );
    });
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
    $("#alertHome").hide();
  });
  $("#btnDisconnect").click((e) => {
    e.preventDefault();
    $("#joinScreen").show();
    $("#chatScreen").hide();
    $("#lblRoom").html(``);
    $("#lblMessage").html(`Message`);
    $("#alertHome").hide();
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
  socket.on("userLeftRoom", (data) => {
    console.log(`${data.username} has joined ${data.room}`);
    $("#messages").append(
      `<div class="w-100 mx-auto my-3 text-center"><p class="text-muted">${data.username} has left ${data.room}</p></div>`
    );
    $(".chat")
      .stop()
      .animate(
        {
          scrollTop: $(".chat")[0].scrollHeight,
        },
        800
      );
  });
  socket.on("userTyping", (data) => {
    console.log(`${data.username} is typing....`);
    $("#info").html(
      `<div id="typing-${data.username}"><span class="mb-0 text-muted">
          ${data.username} is typing...
        </span></div>`
    );

    if (data.typingTime >= typingDelayMillis) {
      $(`#typing-${data.username}`).remove();
    }
  });
  socket.on("stopTyping", (data) => {
    $(`#typing-${data.username}`).remove();
  });
  setInterval(refreshTypingStatus, 100);
  $("#messageArea").keypress(updateLastTypedTime);
  $("#messageArea").blur(refreshTypingStatus);
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
  $.get(`/messages?room=${userData.room}`, (data) => {
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
  $.post("/messages", messageData);
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
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
