const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('D:/MeChat/serviceAccountKey.json'); // Path to your service account key

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://mechat-e3549-default-rtdb.europe-west1.firebasedatabase.app" // Your database URL
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const database = admin.database();

app.use(express.static('public')); // Serve static files from 'public' directory

// Serve the HTML file for the chat interface
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Handle socket connections
io.on('connection', (socket) => {
    console.log('A user connected');

    // Join a room
    socket.on('join room', (room) => {
        socket.join(room); // Join the specified room
        console.log(`User joined room: ${room}`);
        
        // Load existing messages for that room (if applicable)
        database.ref(`rooms/${room}/messages`).once('value', (snapshot) => {
            snapshot.forEach((childSnapshot) => {
                const data = childSnapshot.val();
                socket.emit('chat message', data); // Send existing messages to the new client
            });
        });
    });

    // Listen for chat messages from clients
    socket.on('chat message', (data) => {
        const { room, username, message } = data; // Destructure data
        const messageData = { username, message, timestamp: new Date().toLocaleTimeString() }; // Include timestamp
        
        // Store message in Firebase under the specific room
        database.ref(`rooms/${room}/messages`).push(messageData); 
        io.to(room).emit('chat message', messageData); // Broadcast message to all clients in that room
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// Start the server on port 3000
server.listen(3000, () => {
    console.log('Listening on *:3000');
});
