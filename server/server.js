const mongoose = require('mongoose');
const app = require('./app');
const PORT = process.env.PORT || 3000;

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