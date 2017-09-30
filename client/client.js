const display = document.getElementById("canvas");
const context = display.getContext("2d");
const socket = io();

const gridSize = 40;

let displaySize = display.width = display.height = Math.min(window.innerWidth, window.innerHeight) * 2;
let blockSize = displaySize / gridSize;

display.style.width = (displaySize / 2) + "px";
display.style.height = (displaySize / 2) + "px";

socket.on("update", function (data) {
    requestAnimationFrame(frame);
});

socket.emit("joinGame", player);

document.onkeydown = function (event) {
    event = event || window.event;
    // todo handle key presses here
    // socket.emit("keyPress", );
};

window.onresize = function () {
    displaySize = display.width = display.height = Math.min(window.innerWidth, window.innerHeight) * 2;
    blockSize = displaySize / gridSize;
    display.style.width = (displaySize / 2) + "px";
    display.style.height = (displaySize / 2) + "px";
};

function frame() {
    context.clearRect(0, 0, displaySize, displaySize);
    // todo draw frame
    context.fill();
}