const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const server = require("http").createServer(app);
const io = require("socket.io")(server);

function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

app.use("*", function (req, res, next) {
    if (process.env.NODE_ENV === 'production')
        if (req.headers['x-forwarded-proto'] != 'https')
            return res.redirect('https://' + req.headers.host + req.url);
        else
            return next();
    else
        return next();
});
app.use(express.static(__dirname + "/client"));
app.all("*", function (req, res) {
    res.redirect("/");
});

server.listen(port, function () {
    console.log("Server running at port %s", port);
});

const gridSize = 1000;
let gamesInProgress = 0;
let clientsWaiting = [];
let games = {};
let clients = {};
let maxGames = 5;
class Spinner {
    constructor(x = 0, y = 0, radius = 50) {
        this.x = x;
        this.y = y;
        this.dx = 0;
        this.dy = 0;
        this.radius = radius;
        this.dtheta = 5;
    }
    move() {
        if (this.x < 0 || this.x > gridSize || this.y < 0 || this.y > gridSize) {
            return 'lose';
        }
        if (this.directionRequest) {
            if (this.directionRequest.includes('w')) {
				if(this.dy >= 0)
					this.dy += 1;
				else
					this.dy += 2.5;

            }
            if (this.directionRequest.includes('s')) {
				if(this.dy <= 0)
					this.dy -= 1;
				else
					this.dy -= 2.5;
            }
            if (this.directionRequest.includes('a')) {
				if(this.dx <= 0)
					this.dx -= 1;
				else
					this.dx -= 2.5;
            }
            if (this.directionRequest.includes('d')) {
                if(this.dx >= 0)
					this.dx += 1;
				else
					this.dx += 2.5;
            }
        }
        this.directionRequest = undefined;
        this.dtheta += 0.005;
        const speed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        const terminalVelocity = 10;
        if (speed > terminalVelocity) {
            this.dx *= terminalVelocity / speed;
            this.dy *= terminalVelocity / speed;
        }
        this.x += this.dx;
        this.y -= this.dy;
    }
    input(key) {
        this.directionRequest = key;
    }
}

class Game {
    constructor(clientIdA, clientIdB) {
        this.gameId = guid();
        this.clientA = clients[clientIdA];
        this.clientA.isPlaying = true;
        this.clientA.game = this;
        this.clientB = clients[clientIdB];
        this.clientB.isPlaying = true;
        this.clientB.game = this;
        this.spinnerA = new Spinner(200, 200);
        this.spinnerB = new Spinner(gridSize - 200, gridSize - 200);
        gamesInProgress++;
        console.log(`Game ${this.gameId} starting...`);
    }
    tick() {
        const resultA = this.spinnerA.move();
        const resultB = this.spinnerB.move();
        this.detectCollision();
        this.clientA.emit('update', [this.spinnerA, this.spinnerB]);
        this.clientB.emit('update', [this.spinnerB, this.spinnerA]);
        if (resultA === 'lose') {
            this.gameEnd('a');
        }
        if (resultB === 'lose') {
            this.gameEnd('b');
        }
    }
    distanceBetween(a = this.spinnerA, b = this.spinnerB) {
        return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
    }
    detectCollision() {
        if (this.distanceBetween() < (this.spinnerA.radius + this.spinnerB.radius)) {
			const x = (this.spinnerA.x + this.spinnerB.x) / 2;
			const y = (this.spinnerA.y + this.spinnerB.y) / 2;
			this.clientA.emit('hit', {x, y});
			this.clientB.emit('hit', {x, y});
            const tmpx = this.spinnerA.dx;
            const tmpy = this.spinnerA.dy;
            this.spinnerA.dx = this.spinnerB.dx * this.spinnerB.dtheta / 5;
            this.spinnerA.dy = this.spinnerB.dy * this.spinnerB.dtheta / 5;
            this.spinnerB.dx = tmpx * this.spinnerA.dtheta / 5;
            this.spinnerB.dy = tmpy * this.spinnerA.dtheta / 5;
        }
    }
    input(clientId, key) {
        if (this.clientA.id === clientId) {
            this.spinnerA.input(key);
        } else if (this.clientB.id === clientId) {
            this.spinnerB.input(key);
        }
    }
    playerLeave(clientId) {
        console.log(`Client ${clientId} has left game ${this.gameId}`);
        if (this.clientA.id === clientId) {
            this.gameEnd('a');
        } else {
            this.gameEnd('b');
        }
    }
    gameEnd(result) {
        const winner = (result === 'a') ? this.clientB : this.clientA;
        const loser = (result === 'a') ? this.clientA : this.clientB;
        console.log(`Game ${this.gameId} is over`);
        this.clientA.isPlaying = false;
        this.clientB.isPlaying = false;
        winner.emit('win');
        loser.emit('lose');
        gamesInProgress--;
        delete games[this.gameId];
    }
}

io.on("connection", function (client) {
    console.log("Client " + client.id + " has connected.");
    client.isConnected = true;
    client.isPlaying = false;
    clients[client.id] = client;
    client.on('waitForGame', function () {
        console.log(`Client ${client.id} has started waiting for a game`);
        clientsWaiting.push(client.id);
    });
    client.on("keyPress", function (key) {
        if (client.isPlaying) {
            client.game.input(client.id, key);
            //console.log(`Got a keypress, ${key} from client ${client.id}`);
        }
    });
    client.on("disconnect", function () {
        console.log("Client " + client.id + " has disconnected.");
        if (client.isPlaying) {
            client.game.playerLeave(client.id);
            client.isPlaying = false;
        }
        client.isConnected = false;
    });
});

setInterval(function () {
    for (var gameId in games) {
        games[gameId].tick(); //Updates game data, sends to clients
    }
    let newClientsWaiting = [];
    for (var clientId of clientsWaiting) {
        const client = clients[clientId];
        if (client.isConnected && !client.isPlaying) {
            newClientsWaiting.push(clientId);
        }
    }
    clientsWaiting = newClientsWaiting;
    if (clientsWaiting.length > 1 && gamesInProgress < maxGames) {
        let [clientIdA, clientIdB] = clientsWaiting.splice(0, 2);
        const newGame = new Game(clientIdA, clientIdB);
        games[newGame.gameId] = newGame;
    }
}, 20);
