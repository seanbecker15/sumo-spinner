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
let clientsWaitingFour = [];
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
    constructor(clientIdA, clientIdB, fourplayers, clientIdC, clientIdD) {
        this.gameId = guid();
        this.clientA = clients[clientIdA];
        this.clientA.isPlaying = true;
        this.clientA.game = this;
        this.clientB = clients[clientIdB];
        this.clientB.isPlaying = true;
		this.clientB.game = this;
        this.spinnerA = new Spinner(200, 200);
		this.spinnerB = new Spinner(gridSize - 200, gridSize - 200);
		this.fourplayers = fourplayers;
		this.playersRemaining = 2;
		if(this.fourplayers) {
			this.playersRemaining = 4;
			this.clientC = clients[clientIdC];
			this.clientC.isPlaying = true;
			this.clientC.game = this;
			this.clientD = clients[clientIdD];
			this.clientD.isPlaying = true;
			this.clientD.game = this;
			this.spinnerC = new Spinner(200, gridSize - 200);
			this.spinnerD = new Spinner(gridSize - 200, 200);
		}
        gamesInProgress++;
        console.log(`Game ${this.gameId} starting...`);
	}
    tick() {
        const resultA = this.spinnerA.move();
		const resultB = this.spinnerB.move();
		let resultC;
		let resultD;
		if(this.fourplayers) {
			resultC = this.spinnerC.move();
			resultD = this.spinnerD.move();
		}
		this.detectCollision();
		if(this.fourplayers) {
			this.clientA.emit('update', [this.spinnerA, this.spinnerB, this.spinnerC, this.spinnerD]);
			this.clientB.emit('update', [this.spinnerB, this.spinnerA, this.spinnerC, this.spinnerD]);
			this.clientC.emit('update', [this.spinnerC, this.spinnerA, this.spinnerB, this.spinnerD]);
			this.clientD.emit('update', [this.spinnerD, this.spinnerA, this.spinnerB, this.spinnerB]);
		} else {
			this.clientA.emit('update', [this.spinnerA, this.spinnerB]);
			this.clientB.emit('update', [this.spinnerB, this.spinnerA]);
		}
        if (resultA === 'lose') {
            this.playerLeave('a');
        }
        if (resultB === 'lose') {
            this.playerLeave('b');
		}
		if(this.fourplayers) {
			if (resultC === 'lose') {
				this.playerLeave('c');
			}
			if (resultD === 'lose') {
				this.playerLeave('d');
			}
		}
	}
	
	// Have to revise this for C and D
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
        } else if (this.fourplayers && this.clientC.id === clientId) {
			this.spinnerC.input(key);
		} else if (this.fourplayers && this.clientD.id === clientId) {
			this.spinnerD.input(key);
		}
    }
    playerLeave(clientId) {
		console.log(`Client ${clientId} has left game ${this.gameId}`);
		if(!this.fourplayers) {
			// Client B wins
			if (this.clientA.id === clientId) {
				this.clientB.isPlaying = false;
				this.clientA.isPlaying = false;
				this.clientB.emit('win');
				this.gameEnd();
				return;
			}
			else if (this.clientB.id === clientId) {
				this.clientA.isPlaying = false;
				this.clientB.isPlaying = false;
				this.clientA.emit('win');
				gameEnd();
				return;
			}
		}
		var clientLetter;
		switch(clientId) {
			case this.clientA.id:
				clientLetter = 'a';
				this.clientA.dx = 0;
				this.clientA.dy = 0;
				this.clientA.x = -500;
				this.clientA.y = -500;
				this.clientA.emit('lose');
				this.clientA.isPlaying = false;
			case this.clientB.id:
				clientLetter = 'b';
				this.clientB.dx = 0;
				this.clientB.dy = 0;
				this.clientB.x = -500;
				this.clientB.y = -500;
				this.clientB.emit('lose');
				this.clientB.isPlaying = false;
			case this.clientC.id:
				clientLetter = 'c';
				this.clientC.dx = 0;
				this.clientC.dy = 0;
				this.clientC.x = -500;
				this.clientC.y = -500;
				this.clientC.emit('lose');
				this.clientC.isPlaying = false;
			default:
				clientLetter = 'd';
				this.clientD.dx = 0;
				this.clientD.dy = 0;
				this.clientD.x = -500;
				this.clientD.y = -500;
				this.clientD.emit('lose');
				this.clientD.isPlaying = false;
		}
		// someone should win, game will end
		if(this.playersleft === 2) {
			if(this.clientA.isPlaying) {
				this.clientA.isPlaying = false;
				this.clientA.emit('win');
			} else if(this.clientB.isPlaying) {
				this.clientB.isPlaying = false;
				this.clientB.emit('win');
			} else if(this.clientC.isPlaying) {
				this.clientC.isPlaying = false;
				this.clientC.emit('win');
			} else {
				this.clientD.isPlaying = false;
				this.clientD.emit('win');
			}
			gameEnd();
		}
		this.playersleft--;
	}
	
	// Everybody besides winner loses.
    gameEnd() {
		console.log(`Game ${this.gameId} is over`);
		gamesInProgress--;
		delete games[this.gameId];
        /*const winner = (result === 'a') ? this.clientB : this.clientA;
        const loser = (result === 'a') ? this.clientA : this.clientB;
DONE        console.log(`Game ${this.gameId} is over`);
DONE        this.clientA.isPlaying = false;
DONE        this.clientB.isPlaying = false;
DONE        winner.emit('win');
DONE        loser.emit('lose');
        gamesInProgress--;
        delete games[this.gameId];*/
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
	for (var clientId of clientsWaitingFour) {
		const client = clients[clientId];
		if (client.isConnected && !client.isPlaying) {
			newClientsWaiting.push(clientId);
		}
	}
	clientsWaitingFour = newClientsWaiting;
	if (clientsWaitingFour.length > 3 && gamesInProgress < maxGames) {
		let [clientIdA, clientIdB, clientIdC, clientIdD] = clientsWaitingFour.splice(0, 4);
		const newGame = new Game(clientIdA, clientIdB, true, clientIdC, clientIdD);
		games[newGame.gameId] = newGame;
	}
	newClientsWaiting = [];
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
