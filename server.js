// Dependencies ////////////////////////////////////////////
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configure the web server ////////////////////////////////
app
  .use(express.static('public'))
  .use(express.json())
  .use(express.urlencoded({ extended: true }))
  .set('views', 'views')
  .set('view engine', 'ejs');

// Routes //////////////////////////////////////////////////
app.get('/', function (req, res) {
  res.render('pages/index');
});

  //Socket Connections
io.on('connection', (socket) => {
  console.log('a user connected');

  //Chat messages
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg); // Broadcast the message to all connected clients
  });

  //Disconnection
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// Ready for browsers to connect ///////////////////////////
const PORT = process.env.PORT || 5163
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
