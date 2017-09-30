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

let spinnerBlue = new Image();
spinnerBlue.src = './spinner-blue.svg';
let spinnerRed = new Image();
spinnerRed.src = './spinner-red.svg';

let rotation = 0;
let spinners = [];

socket.on("update", function (data) {
    spinners = data;
    requestAnimationFrame(frame);
});

socket.on('startGame', function (data) {
    playing = true;
});

<<<<<<< HEAD
socket.on('win', function() {
=======
socket.on('gameOver', function () {
    playing = false;
    context.clearRect(0, 0, displaySize, displaySize);
    context.font = '50px arial'
    context.fillStyle = 'rgb(255,0,0)';
    context.fillText('waiting for game...', 500 * blockSize, 500 * blockSize);
    context.fill();
    socket.emit('waitForGame');
});

socket.on('win', function () {
>>>>>>> e8d8fd9e2c8b0201fc83f58df2fd55ee7504014a
    playing = false;
    context.clearRect(0, 0, displaySize, displaySize);
    context.font = '50px arial';
    context.fillStyle = 'rgb(255,0,0)';
    context.fillText('You won! Wait to play again...', 500 * blockSize, 500 * blockSize);
    context.fill();
<<<<<<< HEAD
    setTimeout(function() {
=======
    setTimeout(function () {
        context.clearRect(0, 0, displaySize, displaySize);
        context.font = '50px arial'
        context.fillStyle = 'rgb(255,0,0)';
        context.fillText('waiting for game...', 500, 500);
        context.fill();
>>>>>>> e8d8fd9e2c8b0201fc83f58df2fd55ee7504014a
        socket.emit('waitForGame');
    }, 5000);
    // Idea: Winner of game is placed at beginning of queue
})

socket.on('lose', function () {
    playing = false;
    context.clearRect(0, 0, displaySize, displaySize);
    context.font = '50px arial';
    context.fillStyle = 'rgb(255,0,0)';
    context.fillText('You lost :( Wait to play again...', 500 * blockSize, 500 * blockSize);
    context.fill();
<<<<<<< HEAD
    setTimeout(function() {
=======
    setTimeout(function () {
        context.clearRect(0, 0, displaySize, displaySize);
        context.font = '50px arial'
        context.fillStyle = 'rgb(255,0,0)';
        context.fillText('waiting for game...', 500, 500);
        context.fill();
>>>>>>> e8d8fd9e2c8b0201fc83f58df2fd55ee7504014a
        socket.emit('waitForGame');
    }, 5000);
    // Idea: loser of game is pushed to end of queue
})

socket.emit("waitForGame");

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

function drawSpinner(spinner, image) {
    context.save();
    let x = spinner.x * blockSize;
    let y = spinner.y * blockSize;
    let w = 170 * blockSize;
    let h = 170 * blockSize;
    context.translate(x, y);
    rotation += spinner.dtheta;
    context.rotate(rotation * Math.PI / 180);
    context.translate(-x, -y);
    context.drawImage(image, x - w / 2, y - h / 2, w, h);
    context.drawImage(image, x - w / 2, y - h / 2, w, h);
    context.restore();
}

function frame() {
    context.clearRect(0, 0, displaySize, displaySize);
    drawSpinner(spinners[1], spinnerRed);
    drawSpinner(spinners[0], spinnerBlue);
    context.fill();
}