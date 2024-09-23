const mongoose = require('mongoose');
const app = require('./app');
const { EventEmitter } = require('events');
const path = require("path");
const PORT = process.env.PORT || 3000;

const busEmitter = new EventEmitter();
busEmitter.setMaxListeners(15);
for (let i = 0; i < 15; i++) {
  busEmitter.on('exit', () => {
    console.log('Exit listener', i + 1);
  });
}

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
const userRoutes = require("./routes/user");

// ROUTES
app.use("/", userRoutes);