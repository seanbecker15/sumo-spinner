const display = document.getElementById("canvas");
const context = display.getContext("2d");
const socket = io();

const gridSize = 1000;

let displaySize = display.width = display.height = Math.min(window.innerWidth, window.innerHeight) * 2;
let blockSize = displaySize / gridSize;

display.style.width = (displaySize / 2) + "px";
display.style.height = (displaySize / 2) + "px";

let spinners = {};
socket.on("update", function (data) {
    spinners = data.spinners;
    requestAnimationFrame(frame);
});

let player = {

};

socket.emit("joinGame", player);

document.onkeydown = function (event) {
    event = event || window.event;
    switch(event.keyCode) {
    case 87:
        socket.emit('keyPress','w');
        break;
    case 83:
        socket.emit('keyPress','s');
        break;
    case 65:
        socket.emit('keyPress','a');
        break;
    case 68:
        socket.emit('keyPress','d');
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

function drawSpinner(spinner) {
    //todo change this to drawImage of the actual spinner
    context.fillStyle = 'rgb(255,0,0)';
    context.fillRect(spinner.x, spinner.y, 5, 5);
}

function frame() {
    context.clearRect(0, 0, displaySize, displaySize);
    for (var key in spinners) {
		drawSpinner(spinners[key]);
	}
    context.fill();
}