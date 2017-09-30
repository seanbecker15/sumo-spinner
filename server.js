const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const server = require("http").createServer(app);
const io = require("socket.io")(server);

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

const gridSize = 40;
let clients = {};

io.on("connection", function (client) {
    console.log("Client " + client.id + " has connected.");
    client.isConnected = true;
    client.isPlaying = false;
    clients[client.id] = client;
    client.on("joinGame", function () {
        console.log("Client " + client.id + " has joined the game.");
        client.isPlaying = true;
    });
    client.on("keyPress", function (direction) {
        if (client.isPlaying) {
            // todo
        }
    });
    client.on("disconnect", function () {
        console.log("Client " + client.id + " has disconnected.");
        client.isConnected = false;
        if (client.isPlaying) {
            console.log("Client " + client.id + " has left the game.");
            client.isPlaying = false;
        }
    });
});

setInterval(function () {
    // todo (think of this as the controller)
}, 40);