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
<<<<<<< HEAD
    constructor() {
        this.x = 0;
        this.y = 0;
        this.dx = 0;
        this.dy = 0;
    }
    move() {
        switch (this.directionRequest) {
            case 'w':
                this.dy += 1;
                break;
            case 's':
                this.dy -= 1;
                break;
            case 'a':
                this.dx -= 1;
                break;
            case 'd':
                this.dx += 1;
                break;
            default: break;
        }
        this.directionRequest = undefined;
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
=======
	constructor(x=0, y=0,radius=100) {
		this.x = x;
		this.y = y;
		this.dx = 0;
		this.dy = 0;
		this.radius = radius;
	}
	move() {
		if (this.x - this.radius < 0 
			|| this.x + this.radius > gridSize 
			|| this.y - this.radius < 0 
			|| this.y + this.radius > gridSize) {
				return 'lose';
			}
		switch (this.directionRequest) {
		case 'w':
			this.dy += 1;
			break;
		case 's':
			this.dy -= 1;
			break;
		case 'a':
			this.dx -= 1;
			break;
		case 'd':
			this.dx += 1;
			break;
		default: break; 
		}
		this.directionRequest = undefined;
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
>>>>>>> winning

}

class Game {
<<<<<<< HEAD
    constructor(clientIdA, clientIdB) {
        this.gameId = guid();
        this.clientA = clients[clientIdA];
        this.clientA.isPlaying = true;
        this.clientA.game = this;
        this.clientB = clients[clientIdB];
        this.clientB.isPlaying = true;
        this.clientB.game = this;
        this.spinnerA = new Spinner();
        this.spinnerB = new Spinner();
        gamesInProgress++;
        console.log(`Game ${this.gameId} starting...`);
    }
    tick() {
        this.spinnerA.move();
        this.spinnerB.move();
        this.clientA.emit('update', [this.spinnerA, this.spinnerB]);
        this.clientB.emit('update', [this.spinnerA, this.spinnerB]);
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
        this.gameEnd();
    }
    gameEnd() {
        console.log(`Game ${this.gameId} is over`);
        this.clientA.isPlaying = false;
        this.clientB.isPlaying = false;
        this.clientA.emit('gameOver');
        this.clientB.emit('gameOver');
        gamesInProgress--;
        delete games[this.gameId];
    }
=======
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
		this.clientA.emit('update', [this.spinnerA, this.spinnerB]);
		this.clientB.emit('update', [this.spinnerA, this.spinnerB]);
		if (resultA === 'lose') {
			this.gameEnd('a');
		}
		if (resultB === 'lose') {
			this.gameEnd('b');
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
>>>>>>> winning
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
