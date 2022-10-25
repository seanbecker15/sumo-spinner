const display = document.getElementById("canvas");
const context = display.getContext("2d");
const socket = io();

const gridSize = 1000;

let displaySize =
  (display.width =
  display.height =
    Math.min(window.innerWidth, window.innerHeight) * 2);
let blockSize = displaySize / gridSize;
let splashMessage = "";
display.style.width = displaySize / 2 + "px";
display.style.height = displaySize / 2 + "px";
let playing = false;

let spinnerBlue = new Image();
spinnerBlue.src = "./spinner-blue.svg";
let spinnerRed = new Image();
spinnerRed.src = "./spinner-red.svg";
let fire = new Image();
fire.src = "./fire.png";
let eggplant = new Image();
eggplant.src = "./eggplant.png";
let potato = new Image();
potato.src = "./potato.png";
let wind = new Image();
wind.src = "./wind.png";

let hits = {};
let rotation = 0;
let spinners = [];
let powerup;
let username = "";
let topfive;
let playersOnline = 1;

document.addEventListener("keydown", (event) => {
  // prevent scroll on up and down arrow
  if (["ArrowUp", "ArrowDown"].includes(event.code)) {
    event.preventDefault();
  }
});

socket.on("update", function (data) {
  spinners = data.spinners;
  powerup = data.powerup;
});

socket.on("startGame", function (data) {
  splash("");
  playing = true;
});

socket.on("win", function () {
  playing = false;
  context.clearRect(0, 0, displaySize, displaySize);
  const type = spinners.length > 2 ? "waitForGameFour" : "waitForGame";
  splash("👍😃🌝 You won! Waiting for new game...");
});

socket.on("lose", function () {
  playing = false;
  context.clearRect(0, 0, displaySize, displaySize);
  splash("👎⚰️🚒 :( Waiting for new game...");
});

socket.on("gameover", function () {
  const type = spinners.length > 2 ? "waitForGameFour" : "waitForGame";
  setTimeout(function () {
    socket.emit(type, name);
  }, 2000);
});

socket.on("stats", function (data) {
  playersOnline = data.playersOnline;
  topfive = data.topfive;
});

socket.on("hit", function (coordinates) {
  hits.timer = 50;
  hits.x = coordinates.x;
  hits.y = coordinates.y;
});

let keys = {};
const converter = {
  38: "w",
  87: "w",
  40: "s",
  83: "s",
  37: "a",
  65: "a",
  39: "d",
  68: "d",
};

document.getElementById("up").addEventListener("click", () => {
  keys["w"] = true;
  const keysPressed = Object.keys(keys).sort().join("");
  socket.emit("keyPress", keysPressed);
});

document.getElementById("right").addEventListener("click", () => {
  keys["d"] = true;
  const keysPressed = Object.keys(keys).sort().join("");
  socket.emit("keyPress", keysPressed);
});

document.getElementById("down").addEventListener("click", () => {
  keys["s"] = true;
  const keysPressed = Object.keys(keys).sort().join("");
  socket.emit("keyPress", keysPressed);
});

document.getElementById("left").addEventListener("click", () => {
  keys["a"] = true;
  const keysPressed = Object.keys(keys).sort().join("");
  socket.emit("keyPress", keysPressed);
});

document.onkeydown = function (event) {
  if (converter[event.keyCode]) {
    event = event || window.event;
    keys[converter[event.keyCode]] = true;
    const keysPressed = Object.keys(keys).sort().join("");
    socket.emit("keyPress", keysPressed);
  }
};

document.onkeyup = function (event) {
  if (converter[event.keyCode]) {
    event = event || window.event;
    delete keys[converter[event.keyCode]];
  }
};

window.onresize = function () {
  displaySize =
    display.width =
    display.height =
      Math.min(window.innerWidth, window.innerHeight) * 2;
  blockSize = displaySize / gridSize;
  display.style.width = displaySize / 2 + "px";
  display.style.height = displaySize / 2 + "px";
};

function drawSpinner(spinner, image) {
  context.save();
  let x = spinner.x * blockSize;
  let y = spinner.y * blockSize;
  let w = spinner.radius * 2 * blockSize;
  let h = spinner.radius * 2 * blockSize;
  context.translate(x, y);
  rotation += spinner.dtheta;
  context.rotate((rotation * Math.PI) / 180);
  context.translate(-x, -y);
  context.drawImage(image, x - w / 2, y - h / 2, w, h);
  context.restore();
  if (spinner.name) {
    context.font = "30px Comic Sans MS";
    context.fillStyle = "rgba(255, 255, 255, 0.5)";
    context.textAlign = "center";
    context.fillText(spinner.name, x, y + (h * 3) / 5);
  }
}

function drawStats() {
  context.font = "25px Comic Sans MS";
  context.fillStyle = "rgb(255,0,0)";
  context.textAlign = "start";
  context.fillText(`${playersOnline} players online`, 0, 25);
  if (topfive && topfive.length > 0) {
    for (var i = 0; i < topfive.length; i++) {
      const str = `${i + 1}. ${topfive[i].playerName}:${topfive[i].wins}`;
      context.fillText(str, 0, (i + 2) * 25);
    }
  }
}

function drawPowerup(powerup) {
  if (powerup) {
    let image;
    switch (powerup.type) {
      case "eggplant":
        image = eggplant;
        break;
      case "potato":
        image = potato;
        break;
      case "wind":
        image = wind;
        break;
    }
    let x = powerup.x * blockSize;
    let y = powerup.y * blockSize;
    let w = 60 * blockSize;
    let h = 60 * blockSize;
    context.drawImage(image, x - w / 2, y - h / 2, w, h);
  }
}

function splash(message) {
  splashMessage = message;
}

function displaySplash() {
  context.font = "50px Comic Sans MS";
  context.fillStyle = "rgb(255,0,0)";
  context.textAlign = "center";
  context.fillText(splashMessage, 500 * blockSize, 500 * blockSize);
}

function frame() {
  context.clearRect(0, 0, displaySize, displaySize);
  if (spinners.length > 0) {
    drawSpinner(spinners[1], spinnerRed);
    drawSpinner(spinners[0], spinnerBlue);
    if (spinners.length > 2) {
      drawSpinner(spinners[2], spinnerRed);
      drawSpinner(spinners[3], spinnerRed);
    }
    if (hits.timer-- > 0) {
      context.drawImage(
        fire,
        (hits.x - 40) * blockSize,
        (hits.y - 40) * blockSize,
        80 * blockSize,
        80 * blockSize
      );
    }
  }
  if (powerup) {
    drawPowerup(powerup);
  }
  displaySplash();
  drawStats();
  context.fill();
  requestAnimationFrame(frame);
}

function play(gameType) {
  let modal = document.getElementById("modal");
  let input = document.getElementById("name");
  modal.style.display = "none";
  context.clearRect(0, 0, displaySize, displaySize);
  splash("Waiting for game... ⏳");
  name = input.value.substring(0, 20);
  socket.emit(gameType, name);
}

function play2() {
  play("waitForGame");
}

function play4() {
  play("waitForGameFour");
}

window.onload = frame;
