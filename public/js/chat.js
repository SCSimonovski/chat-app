const socket = io();

// ELEMENTS
const $form = document.querySelector("form");
const $messageInput = document.querySelector("input");
const $sendMessage = document.querySelector("#send");
const $locationButton = document.querySelector("#location");
const $messages = document.querySelector("#messages");
const $sidebar = document.querySelector("#sidebar");
const $sidebarContainer = document.querySelector("#sidebar-container");
const $sidebarButton = document.querySelector("#sidebar-button");
const $usersIcon = document.querySelector("#users-icon");
const $arrowIcon = document.querySelector("#arrow-icon");

const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationTemplate = document.querySelector("#location-template").innerHTML;
const roomUsersTemplate = document.querySelector("#room-users-template")
  .innerHTML;

const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

window.onload = (event) => {
  if (window.innerWidth <= 700) {
    const width = $sidebarContainer.offsetWidth - $sidebarButton.offsetWidth;
    $sidebarContainer.style.marginLeft = `-${width}px`;
    $usersIcon.classList.remove("sidebar__users-icon--hidden");
  } else {
    $sidebarContainer.style.marginLeft = "0px";
  }
};

$sidebarButton.addEventListener("click", (e) => {
  const width = $sidebarContainer.offsetWidth - $sidebarButton.offsetWidth;

  if ($sidebarContainer.style.marginLeft === `0px`) {
    $sidebarContainer.style.marginLeft = `-${width}px`;
    $usersIcon.classList.remove("sidebar__users-icon--hidden");
    $arrowIcon.classList.remove("fa-angle-left");
    $arrowIcon.classList.add("fa-angle-right");
  } else {
    $sidebarContainer.style.marginLeft = "0px";
    $usersIcon.classList.add("sidebar__users-icon--hidden");
    $arrowIcon.classList.remove("fa-angle-right");
    $arrowIcon.classList.add("fa-angle-left");
  }
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
  let messageTextModClass = "";
  let messageModClass = "";

  if (message.username === "Admin") {
    messageTextModClass = "message__text--admin";
  } else if (message.username === username.toLowerCase()) {
    messageTextModClass = "message__text--user";
    messageModClass = "message--user-box";
  }

  const html = Mustache.render(messageTemplate, {
    text: message.text,
    username: message.username,
    messageTextModClass,
    messageModClass,
    createdAt: moment(message.createdAt).format("h:mm a"),
  });
  $messages.insertAdjacentHTML("beforeend", html);

  autoscroll();
});

socket.on("locationMessage", (message) => {
  let messageModClass =
    message.username === username.toLowerCase() ? "message--user-box" : "";

  const $mapContainer = document.createElement("div");
  const $map = document.createElement("div");

  $mapContainer.classList.add("map-container");
  $mapContainer.setAttribute("id", "map-container");

  $map.classList.add("map");
  $map.setAttribute("id", "map");

  const uluru = {
    lat: message.location.latitude,
    lng: message.location.longitude,
  };

  const googleMap = new window.google.maps.Map($map, {
    zoom: 12,
    center: uluru,
  });

  new window.google.maps.Marker({
    position: uluru,
    map: googleMap,
  });

  const html = Mustache.render(locationTemplate, {
    username: message.username,
    messageModClass,
    createdAt: moment(message.createdAt).format("h:mm a"),
  });

  if (message.username === username.toLowerCase()) {
    $mapContainer.classList.add("map-container--right");

    const $button = document.createElement("button");
    $button.classList.add("map__button");
    $button.innerHTML = "Stop Sharing";

    $button.addEventListener("click", (e) => {
      e.preventDefault();
      $button.setAttribute("disabled", "disabled");
      socket.emit("stopSharingMap");
    });

    $map.appendChild($button);
  }

  $messages.insertAdjacentHTML("beforeend", html);
  $mapContainer.appendChild($map);
  $messages.appendChild($mapContainer);

  autoscroll();
});

socket.on("abortSharing", () => {
  const $mapContainer = document.querySelector("#map-container");
  const $map = document.querySelector("#map");
  const $sharingEnded = document.createElement("p");

  $sharingEnded.innerHTML = "Location sharing ended";
  $sharingEnded.classList.add("message__text");
  $sharingEnded.classList.add("message__text--sharing-ended");

  $mapContainer.removeChild($map);
  $mapContainer.appendChild($sharingEnded);
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
      $locationButton.removeAttribute("disabled");
    });
  });
});

socket.emit("join", { username, room }, (error) => {
  if (error) {
    alert(error);
    location.assign("/");
  }
});
