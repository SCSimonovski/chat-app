const socket = io();

// ELEMENTS
const $form = document.querySelector("form");
const $messageInput = document.querySelector("input");
const $sendMessage = document.querySelector("#send");
const $locationButton = document.querySelector("#location");
const $messages = document.querySelector("#messages");
const $sidebar = document.querySelector("#sidebar");

const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationTemplate = document.querySelector("#location-template").innerHTML;
const roomUsersTemplate = document.querySelector("#room-users-template")
  .innerHTML;

const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const autoscroll = () => {
  const newMessage = $messages.lastElementChild;

  const marginHeight = getComputedStyle(newMessage).marginBottom;
  const newMessageHeight = newMessage.offsetHeight + parseInt(marginHeight);

  const containerHeight = $messages.scrollHeight;

  const viewHeight = $messages.offsetHeight;
  const scrollOffset = $messages.scrollTop + viewHeight + 5;

  if (containerHeight - newMessageHeight <= scrollOffset) {
    $messages.scrollTop = $messages.scrollHeight;
  }
};

socket.on("message", (message) => {
  const html = Mustache.render(messageTemplate, {
    text: message.text,
    username: message.username,
    createdAt: moment(message.createdAt).format("h:mm a"),
  });
  $messages.insertAdjacentHTML("beforeend", html);

  autoscroll();
});

socket.on("locationMessage", (message) => {
  const html = Mustache.render(locationTemplate, {
    url: message.url,
    username: message.username,
    createdAt: moment(message.createdAt).format("h:mm a"),
  });
  $messages.insertAdjacentHTML("beforeend", html);
});

socket.on("roomUsers", ({ room, users }) => {
  const html = Mustache.render(roomUsersTemplate, {
    room,
    users,
  });

  $sidebar.innerHTML = html;
});

$form.addEventListener("submit", (e) => {
  e.preventDefault();
  $sendMessage.setAttribute("disabled", "disabled");

  socket.emit("sendMessage", $messageInput.value, (msg) => {
    console.log(msg);
    $messageInput.value = "";
    $messageInput.focus();
    $sendMessage.removeAttribute("disabled");
  });
});

$locationButton.addEventListener("click", (e) => {
  e.preventDefault();
  $locationButton.setAttribute("disabled", "disabled");

  if (!navigator.geolocation) {
    return alert("Your browser does not support sharing location!");
  }

  navigator.geolocation.getCurrentPosition((position) => {
    const { latitude, longitude } = position.coords;
    socket.emit("sendLocation", { latitude, longitude }, (msg) => {
      console.log(msg);
      $locationButton.removeAttribute("disabled");
    });
  });
});

socket.emit("join", { username, room }, (error) => {
  if (error) {
    alert(error);
    console.log(location);
    location.assign("/");
  }
});
