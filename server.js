import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import pkg from 'pg';
const { Pool } = pkg;

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 5163;

// Postgres configuration ////////////////////////////////// 
// const pool = new Pool({
//   user: 'postgres',
//   host: 'localhost',
//   database: 'postgres',
//   password: 'postgres',
//   port: 5432,
//   ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
// });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

// Maintain a list of connected users //////////////////////
const users = [];

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

// Socket Connections //////////////////////////////////////
io.on('connection', (socket) => {
  console.log('a user connected');

  // Add user to the list of connected users
  const userName = socket.handshake.query.name;
  users.push(userName);

  // Show previous messages from the database, displaying an error if there is one
  pool.query('SELECT * FROM messages ORDER BY timestamp ASC', (error, result) => {
    if (error) {
      console.error('Error pulling messages from DB. ERROR:', error);
      return;
    }
    result.rows.forEach(row => {
      io.to(socket.id).emit('chat message', {
        username: row.username,
        message: row.message,
      });
    });
  });

  // Chat messages
  socket.on('chat message', (msg) => {
    io.emit('chat message', {
      username: userName,
      message: msg,
    });

    // Messages to DB
    const insert = 'INSERT INTO messages (username, message) VALUES ($1, $2)';
    const values = [userName, msg];
    pool.query(insert, values, (error) => {
      if (error) {
        console.error('Error inserting messages to DB. ERROR: ', error);
      }
    });
  });

// Clear chat event
socket.on('clear chat', () => {
  pool.query('TRUNCATE TABLE messages', (error) => {
    if (error) {
      console.error('Error truncating messages:', error);
      return;
    }
    io.emit('cleared chat');
  });
});

  // Disconnection
  socket.on('disconnect', () => {
    console.log('user disconnected');

    // Remove user from the list of connected users
    const index = users.indexOf(userName);
    if (index !== -1) {
      users.splice(index, 1);
    }
  });
});
// Ready for browsers to connect ///////////////////////////
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
