// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Store connected users
const users = {};

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Handle socket connections
io.on('connection', (socket) => {
    console.log('New user connected');

    // Prompt for username
    socket.emit('request username');

    // Handle username submission
    socket.on('set username', (username) => {
        if (users[username]) {
            socket.emit('username exists');
            return;
        }

        users[username] = socket.id;
        socket.username = username;
        
        // Notify all users about new connection
        io.emit('user joined', {
            username: username,
            timestamp: new Date().toLocaleTimeString(),
            userCount: Object.keys(users).length
        });

        // Send current user list to the new user
        socket.emit('user list', Object.keys(users));
    });

    // Handle typing indicator
    socket.on('typing', () => {
        socket.broadcast.emit('user typing', socket.username);
    });

    // Handle stopped typing
    socket.on('stopped typing', () => {
        socket.broadcast.emit('user stopped typing', socket.username);
    });

    // Handle chat messages
    socket.on('chat message', (msg) => {
        const messageData = {
            username: socket.username,
            message: msg.text,
            timestamp: new Date().toLocaleTimeString(),
            isPrivate: msg.isPrivate || false,
            recipient: msg.recipient || null
        };

        if (msg.isPrivate && msg.recipient) {
            // Private message
            const recipientSocketId = users[msg.recipient];
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('chat message', messageData);
                socket.emit('chat message', messageData); // Also send to sender
            }
        } else {
            // Broadcast message to everyone
            io.emit('chat message', messageData);
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        if (socket.username) {
            delete users[socket.username];
            io.emit('user left', {
                username: socket.username,
                timestamp: new Date().toLocaleTimeString(),
                userCount: Object.keys(users).length
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});