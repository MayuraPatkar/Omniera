const express =  require('express');
const mongoose = require('mongoose');
const app = require('./app');
const { EventEmitter } = require('events');
const path = require("path");
const PORT = process.env.PORT || 3000;

const busEmitter = new EventEmitter();
busEmitter.setMaxListeners(15);

// Adding multiple listeners for 'exit' event
for (let i = 0; i < 15; i++) {
  busEmitter.on('exit', () => {
    console.log('Exit listener', i + 1);
  });
}

// Setting up EJS as the template engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../client"));

// DATABASE CONNECTION
const DB_URI = 'mongodb://127.0.0.1:27017/test';
mongoose.connect(DB_URI).then(() => {
    console.log('Database connected successfully');

    // START SERVER
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}/`);
    });
}).catch(err => {
    console.error('Database connection error:', err);
});

// IMPORTED ROUTES
const userRoutes = require("./routes/user"); // Importing user routes
const chatRoutes = require("./routes/chat"); // Importing chat routes

// ROUTES MIDDLEWARE
app.use("/", userRoutes);
app.use("/chat", chatRoutes);
app.use('/assets', express.static('assets'));
app.use('/static', express.static('static'));

// 404
app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, '../client/404.html'));
});

