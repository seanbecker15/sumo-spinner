const display = document.getElementById("canvas");
const context = display.getContext("2d");
const socket = io();

const gridSize = 1000;

let displaySize = display.width = display.height = Math.min(window.innerWidth, window.innerHeight) * 2;
let blockSize = displaySize / gridSize;

display.style.width = (displaySize / 2) + "px";
display.style.height = (displaySize / 2) + "px";
let playing = false;
context.font = '50px arial'
context.fillStyle = 'rgb(255,0,0)';
context.fillText('waiting for game...', 500, 500);
context.fill();

let spinnerImage = new Image();
spinnerImage.src = './spinner.svg';

let rotation = 0;
let spinners = [];

socket.on("update", function (data) {
    spinners = data;
    requestAnimationFrame(frame);
});

socket.on('startGame', function (data) {
    playing = true;
});

let player = {

};

socket.emit("waitForGame", player);

document.onkeydown = function (event) {
    event = event || window.event;
    switch (event.keyCode) {
        case 38:
        case 87:
            socket.emit('keyPress', 'w');
            break;
        case 40:
        case 83:
            socket.emit('keyPress', 's');
            break;
        case 37:
        case 65:
            socket.emit('keyPress', 'a');
            break;
        case 39:
        case 68:
            socket.emit('keyPress', 'd');
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
    context.save();
    context.translate(spinner.x * blockSize, spinner.y * blockSize);
    context.rotate(rotation++ * Math.PI / 64);
    context.translate(-spinner.x * blockSize, -spinner.y * blockSize);
    context.drawImage(spinnerImage, spinner.x * blockSize - 145 * blockSize / 2, spinner.y * blockSize - 135 * blockSize / 2, 145 * blockSize, 135 * blockSize);
    context.restore();
}

function frame() {
    context.clearRect(0, 0, displaySize, displaySize);
    spinners.forEach((spinner) => drawSpinner(spinner));
    context.fill();
}