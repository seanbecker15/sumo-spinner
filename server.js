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
let scoreboard = [];
let maxGames = 5;

function addToLeaderboard(playerName, wins) {
	console.log(`adding ${playerName} to the leaderboard with ${wins} wins`);
	const element = scoreboard.find((obj) => {
		return obj.playerName === playerName;
	});
	if (element) {
		element.wins = Math.max(element.wins, wins);
	} else {
		scoreboard.push({ playerName, wins });
	}
	scoreboard.sort((a, b) => b.wins - a.wins);
}

class Powerup {
    constructor(x = gridSize / 2, y = gridSize / 2, type = 'eggplant') {
        this.x = x;
        this.y = y;
        this.type = type;
    }
}

class Spinner {
    constructor(x = 0, y = 0, name = '', radius = 50) {
        this.x = x;
        this.y = y;
        this.name = name;
        this.dx = 0;
        this.dy = 0;
        this.radius = radius;
        this.dtheta = 5;
        this.size = 1;
    }
    move() {
        if (this.x < 0 || this.x > gridSize || this.y < 0 || this.y > gridSize) {
            return 'lose';
        }
        if (this.directionRequest) {
            if (this.directionRequest.includes('w')) {
                if (this.dy >= 0)
                    this.dy += 1;
                else
                    this.dy += 2.5;

            }
            if (this.directionRequest.includes('s')) {
                if (this.dy <= 0)
                    this.dy -= 1;
                else
                    this.dy -= 2.5;
            }
            if (this.directionRequest.includes('a')) {
                if (this.dx <= 0)
                    this.dx -= 1;
                else
                    this.dx -= 2.5;
            }
            if (this.directionRequest.includes('d')) {
                if (this.dx >= 0)
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
    applyPowerup(powerup) {
        switch (powerup.type) {
            case 'eggplant':
                this.size += 0.25;
                this.radius += 25;
                break;
            case 'wind':
                this.dtheta = this.dtheta + 2;
                break;
        }
    }
}

class Game {
    constructor(clientIdA, clientIdB, fourplayers = false, clientIdC, clientIdD) {
        this.gameId = guid();
        this.clientA = clients[clientIdA];
        this.clientA.isPlaying = true;
		this.clientA.game = this;
		this.clientA.emit('startGame');
        this.clientB = clients[clientIdB];
        this.clientB.isPlaying = true;
		this.clientB.game = this;
		this.clientB.emit('startGame');
        this.spinnerA = new Spinner(200, 200, this.clientA.name);
		this.spinnerB = new Spinner(gridSize - 200, gridSize - 200, this.clientB.name);
		this.fourplayers = fourplayers;
		this.playersRemaining = 2;
		this.powerup = new Powerup();
		if(this.fourplayers) {
			this.playersRemaining = 4;
			this.clientC = clients[clientIdC];
			this.clientC.isPlaying = true;
			this.clientC.game = this;
			this.clientC.emit('startGame');
			this.clientD = clients[clientIdD];
			this.clientD.isPlaying = true;
			this.clientD.game = this;
			this.clientD.emit('startGame');
			this.spinnerC = new Spinner(200, gridSize - 200, this.clientC.name);
			this.spinnerD = new Spinner(gridSize - 200, 200, this.clientD.name);
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
		if (!this.powerup && Math.random() > 0.995) {
            const x = Math.random() * gridSize;
            const y = Math.random() * gridSize;
            const type = (Math.random() > 0.5) ? 'eggplant' : 'wind';
            this.powerup = new Powerup(x, y, type);
		}
		if(this.fourplayers) {
			this.clientA.emit('update', { spinners: [this.spinnerA, this.spinnerB, this.spinnerC, this.spinnerD], powerup: this.powerup });
			this.clientB.emit('update', { spinners: [this.spinnerB, this.spinnerA, this.spinnerC, this.spinnerD], powerup: this.powerup });
			this.clientC.emit('update', { spinners: [this.spinnerC, this.spinnerA, this.spinnerB, this.spinnerD], powerup: this.powerup });
			this.clientD.emit('update', { spinners: [this.spinnerD, this.spinnerA, this.spinnerB, this.spinnerC], powerup: this.powerup });
		} else {
			this.clientA.emit('update', { spinners: [this.spinnerA, this.spinnerB], powerup: this.powerup });
			this.clientB.emit('update', { spinners: [this.spinnerB, this.spinnerA], powerup: this.powerup });
		}
		
        if (resultA === 'lose' && this.clientA.isPlaying) {
            this.playerLeave(this.clientA.id);
        }
        if (resultB === 'lose' && this.clientB.isPlaying) {
            this.playerLeave(this.clientB.id);
		}
		if(this.fourplayers) {
			if (resultC === 'lose' && this.clientC.isPlaying) {
				this.playerLeave(this.clientC.id);
			}
			if (resultD === 'lose' && this.clientD.isPlaying) {
				this.playerLeave(this.clientD.id);
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
            this.clientA.emit('hit', { x, y });
			this.clientB.emit('hit', { x, y });
			if (this.fourplayers) {
				this.clientC.emit('hit', { x, y });
				this.clientD.emit('hit', { x, y });
			}
            const tmpx = this.spinnerA.dx;
            const tmpy = this.spinnerA.dy;
            this.spinnerA.dx = this.spinnerB.dx * this.spinnerB.size * this.spinnerB.dtheta / 5;
            this.spinnerA.dy = this.spinnerB.dy * this.spinnerB.size * this.spinnerB.dtheta / 5;
            this.spinnerB.dx = tmpx * this.spinnerA.size * this.spinnerA.dtheta / 5;
            this.spinnerB.dy = tmpy * this.spinnerA.size * this.spinnerA.dtheta / 5;
            if (this.spinnerA.dtheta > 6)
                this.spinnerA.dtheta--;
            if (this.spinnerB.dtheta > 6)
                this.spinnerB.dtheta--;
		}
		if (this.fourplayers) {
			if (this.distanceBetween(this.spinnerA, this.spinnerC) < (this.spinnerA.radius + this.spinnerC.radius)) {
				const x = (this.spinnerA.x + this.spinnerC.x) / 2;
				const y = (this.spinnerA.y + this.spinnerC.y) / 2;
				this.clientA.emit('hit', { x, y });
				this.clientB.emit('hit', { x, y });
				if (this.fourplayers) {
					this.clientC.emit('hit', { x, y });
					this.clientD.emit('hit', { x, y });
				}
				const tmpx = this.spinnerA.dx;
				const tmpy = this.spinnerA.dy;
				this.spinnerA.dx = this.spinnerC.dx * this.spinnerC.size * this.spinnerC.dtheta / 5;
				this.spinnerA.dy = this.spinnerC.dy * this.spinnerC.size * this.spinnerC.dtheta / 5;
				this.spinnerC.dx = tmpx * this.spinnerA.size * this.spinnerA.dtheta / 5;
				this.spinnerC.dy = tmpy * this.spinnerA.size * this.spinnerA.dtheta / 5;
				if (this.spinnerA.dtheta > 6)
					this.spinnerA.dtheta--;
				if (this.spinnerC.dtheta > 6)
					this.spinnerC.dtheta--;
			}
			if (this.distanceBetween(this.spinnerA, this.spinnerD) < (this.spinnerA.radius + this.spinnerD.radius)) {
				const x = (this.spinnerA.x + this.spinnerD.x) / 2;
				const y = (this.spinnerA.y + this.spinnerD.y) / 2;
				this.clientA.emit('hit', { x, y });
				this.clientB.emit('hit', { x, y });
				if (this.fourplayers) {
					this.clientC.emit('hit', { x, y });
					this.clientD.emit('hit', { x, y });
				}
				const tmpx = this.spinnerA.dx;
				const tmpy = this.spinnerA.dy;
				this.spinnerA.dx = this.spinnerD.dx * this.spinnerD.size * this.spinnerD.dtheta / 5;
				this.spinnerA.dy = this.spinnerD.dy * this.spinnerD.size * this.spinnerD.dtheta / 5;
				this.spinnerD.dx = tmpx * this.spinnerA.size * this.spinnerA.dtheta / 5;
				this.spinnerD.dy = tmpy * this.spinnerA.size * this.spinnerA.dtheta / 5;
				if (this.spinnerA.dtheta > 6)
					this.spinnerA.dtheta--;
				if (this.spinnerD.dtheta > 6)
					this.spinnerD.dtheta--;
			}
			if (this.distanceBetween(this.spinnerB, this.spinnerC) < (this.spinnerB.radius + this.spinnerC.radius)) {
				const x = (this.spinnerB.x + this.spinnerC.x) / 2;
				const y = (this.spinnerB.y + this.spinnerC.y) / 2;
				this.clientA.emit('hit', { x, y });
				this.clientB.emit('hit', { x, y });
				if (this.fourplayers) {
					this.clientC.emit('hit', { x, y });
					this.clientD.emit('hit', { x, y });
				}
				const tmpx = this.spinnerB.dx;
				const tmpy = this.spinnerB.dy;
				this.spinnerB.dx = this.spinnerC.dx * this.spinnerC.size * this.spinnerC.dtheta / 5;
				this.spinnerB.dy = this.spinnerC.dy * this.spinnerC.size * this.spinnerC.dtheta / 5;
				this.spinnerC.dx = tmpx * this.spinnerB.size * this.spinnerB.dtheta / 5;
				this.spinnerC.dy = tmpy * this.spinnerB.size * this.spinnerB.dtheta / 5;
				if (this.spinnerB.dtheta > 6)
					this.spinnerB.dtheta--;
				if (this.spinnerC.dtheta > 6)
					this.spinnerC.dtheta--;
			}
			if (this.distanceBetween(this.spinnerB, this.spinnerD) < (this.spinnerB.radius + this.spinnerD.radius)) {
				const x = (this.spinnerB.x + this.spinnerD.x) / 2;
				const y = (this.spinnerB.y + this.spinnerD.y) / 2;
				this.clientA.emit('hit', { x, y });
				this.clientB.emit('hit', { x, y });
				if (this.fourplayers) {
					this.clientC.emit('hit', { x, y });
					this.clientD.emit('hit', { x, y });
				}
				const tmpx = this.spinnerB.dx;
				const tmpy = this.spinnerB.dy;
				this.spinnerB.dx = this.spinnerD.dx * this.spinnerD.size * this.spinnerD.dtheta / 5;
				this.spinnerB.dy = this.spinnerD.dy * this.spinnerD.size * this.spinnerD.dtheta / 5;
				this.spinnerD.dx = tmpx * this.spinnerB.size * this.spinnerB.dtheta / 5;
				this.spinnerD.dy = tmpy * this.spinnerB.size * this.spinnerB.dtheta / 5;
				if (this.spinnerB.dtheta > 6)
					this.spinnerB.dtheta--;
				if (this.spinnerD.dtheta > 6)
					this.spinnerD.dtheta--;
			}
			if (this.distanceBetween(this.spinnerC, this.spinnerD) < (this.spinnerC.radius + this.spinnerD.radius)) {
				const x = (this.spinnerC.x + this.spinnerD.x) / 2;
				const y = (this.spinnerC.y + this.spinnerD.y) / 2;
				this.clientA.emit('hit', { x, y });
				this.clientB.emit('hit', { x, y });
				if (this.fourplayers) {
					this.clientC.emit('hit', { x, y });
					this.clientD.emit('hit', { x, y });
				}
				const tmpx = this.spinnerC.dx;
				const tmpy = this.spinnerC.dy;
				this.spinnerC.dx = this.spinnerD.dx * this.spinnerD.size * this.spinnerD.dtheta / 5;
				this.spinnerC.dy = this.spinnerD.dy * this.spinnerD.size * this.spinnerD.dtheta / 5;
				this.spinnerD.dx = tmpx * this.spinnerC.size * this.spinnerC.dtheta / 5;
				this.spinnerD.dy = tmpy * this.spinnerC.size * this.spinnerC.dtheta / 5;
				if (this.spinnerC.dtheta > 6)
					this.spinnerC.dtheta--;
				if (this.spinnerD.dtheta > 6)
					this.spinnerD.dtheta--;
			}
		}
        if (this.powerup && this.distanceBetween(this.spinnerA, this.powerup) < this.spinnerA.radius) {
            this.spinnerA.applyPowerup(this.powerup);
            this.powerup = undefined;
        }
        if (this.powerup && this.distanceBetween(this.spinnerB, this.powerup) < this.spinnerB.radius) {
            this.spinnerB.applyPowerup(this.powerup);
            this.powerup = undefined;
		}
		if (this.fourplayers) {
			if (this.powerup && this.distanceBetween(this.spinnerC, this.powerup) < this.spinnerC.radius) {
				this.spinnerC.applyPowerup(this.powerup);
				this.powerup = undefined;
			}
			if (this.powerup && this.distanceBetween(this.spinnerD, this.powerup) < this.spinnerD.radius) {
				this.spinnerD.applyPowerup(this.powerup);
				this.powerup = undefined;
			}
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
				this.clientB.wins = (this.clientB.wins) ? this.clientB.wins+1 : 1;
				addToLeaderboard(this.clientB.name, this.clientB.wins);
				this.clientA.emit('lose');
				this.gameEnd();
				return;
			}
			else if (this.clientB.id === clientId) {
				this.clientA.isPlaying = false;
				this.clientB.isPlaying = false;
				this.clientA.emit('win');
				this.clientA.wins = (this.clientA.wins) ? this.clientA.wins+1 : 1;
				addToLeaderboard(this.clientA.name, this.clientA.wins);
				this.clientB.emit('lose');
				this.gameEnd();
				return;
			}
		}
		var clientLetter;
		switch(clientId) {
			case this.clientA.id:
				clientLetter = 'a';
				this.spinnerA.dx = 0;
				this.spinnerA.dy = 0;
				this.spinnerA.x = -500;
				this.spinnerA.y = -500;
				this.clientA.emit('lose');
				this.clientA.isPlaying = false;
				break;
			case this.clientB.id:
				clientLetter = 'b';
				this.spinnerB.dx = 0;
				this.spinnerB.dy = 0;
				this.spinnerB.x = -500;
				this.spinnerB.y = -500;
				this.clientB.emit('lose');
				this.clientB.isPlaying = false;
				break;
			case this.clientC.id:
				clientLetter = 'c';
				this.spinnerC.dx = 0;
				this.spinnerC.dy = 0;
				this.spinnerC.x = -500;
				this.spinnerC.y = -500;
				this.clientC.emit('lose');
				this.clientC.isPlaying = false;
				break;
			case this.clientD.id:
				clientLetter = 'd';
				this.spinnerD.dx = 0;
				this.spinnerD.dy = 0;
				this.spinnerD.x = -500;
				this.spinnerD.y = -500;
				this.clientD.emit('lose');
				this.clientD.isPlaying = false;
		}
		// someone should win, game will end
		if(this.playersRemaining === 2) {
			if(this.clientA.isPlaying) {
				this.clientA.isPlaying = false;
				this.clientA.emit('win');
				this.clientA.wins = (this.clientA.wins) ? this.clientA.wins+1 : 1;
			} else if(this.clientB.isPlaying) {
				this.clientB.isPlaying = false;
				this.clientB.emit('win');
				this.clientB.wins = (this.clientB.wins) ? this.clientB.wins+1 : 1;
			} else if(this.clientC.isPlaying) {
				this.clientC.isPlaying = false;
				this.clientC.emit('win');
				this.clientC.wins = (this.clientC.wins) ? this.clientC.wins+1 : 1;
			} else {
				this.clientD.isPlaying = false;
				this.clientD.emit('win');
				this.clientD.wins = (this.clientD.wins) ? this.clientD.wins+1 : 1;
			}
			this.gameEnd();
		}
		this.playersRemaining--;
	}
	
	// Everybody besides winner loses.
    gameEnd() {
		console.log(`Game ${this.gameId} is over`);
		gamesInProgress--;
		this.clientA.emit('gameover');
		this.clientB.emit('gameover');
		if (this.fourplayers) {
			this.clientC.emit('gameover');
			this.clientD.emit('gameover');
		}
		delete games[this.gameId];
    }
}

io.on("connection", function (client) {
    console.log("Client " + client.id + " has connected.");
    client.isConnected = true;
    client.isPlaying = false;
    clients[client.id] = client;
    client.on('waitForGame', function (name) {
        client.name = name;
        console.log(`Client ${client.id} with name ${client.name} has started waiting for a game`);
        clientsWaiting.push(client.id);
	});
	client.on('waitForGameFour', function(name) {
		client.name = name;
        console.log(`Client ${client.id} with name ${client.name} has started waiting for a 4-player game`);
        clientsWaitingFour.push(client.id);
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
	//Send stats to players
	const topfive = scoreboard.slice(0,5);
	const playersOnline = Object.keys(clients).map(k=>clients[k]).filter(el=>el.isConnected).reduce((acc,_)=>acc+1, 0);
	for (var clientid in clients) {
		const client = clients[clientid];
		if (client.isConnected)
			client.emit('stats', { topfive, playersOnline });
	}
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
		const newGame = new Game(clientIdA, clientIdB, false);
		games[newGame.gameId] = newGame;
	} 
}, 20);
