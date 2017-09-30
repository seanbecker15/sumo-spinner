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

let player = {

};

socket.emit("joinGame", player);

document.onkeydown = function (event) {
    event = event || window.event;
    switch(event.keycode) {
    case 87:
        socket.emit('keypress','w');
        break;
    case 83:
        socket.emit('keypress','s');
        break;
    case 65:
        socket.emit('keypress','a');
        break;
    case 68:
        socket.emit('keypress','d');
        break;
    default:
        break;
    }
};

window.onresize = function () {
    displaySize = display.width = display.height = Math.min(window.innerWidth, window.innerHeight) * 2;
    blockSize = displaySize / gridSize;
    display.style.width = (displaySize / 2) + "px";
    display.style.height = (displaySize / 2) + "px";
};

function frame() {
    context.clearRect(0, 0, displaySize, displaySize);
    context.fill();
}