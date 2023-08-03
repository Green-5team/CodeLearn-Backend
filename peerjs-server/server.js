const https = require("https");
const fs = require("fs");
const express = require("express");
const app = express();
const { ExpressPeerServer } = require("peer");
const server = https.createServer({
  key: fs.readFileSync('example.key'),
  cert: fs.readFileSync('example.crt'),
}, app);

const { v4: uuidv4 } = require("uuid");
app.set("view engine", "ejs");

const io = require("socket.io")(server, {
  cors: {
    origin: '*'
  }
});

const opinions = {
  debug: true,
}
app.use("/peerjs", ExpressPeerServer(server, opinions));
app.use(express.static("public"));

// app.get("/", (req, res) => {
//   res.redirect(`/${uuidv4()}`);
// });

// app.get("/:room", (req, res) => {
//   res.render("room", { roomId: req.params.room });
// });

io.on("connection", (socket) => {
  socket.on("voice-join-room", (roomId, userId) => {
    socket.join(roomId);
    setTimeout(()=>{
      socket.to(roomId).broadcast.emit("user-connected", userId);
    }, 1000)
  });
});



server.listen(process.env.PORT || 3030);
