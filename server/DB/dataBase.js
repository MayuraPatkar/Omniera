const mongoose = require("mongoose");
require('dotenv').config();

const DB_URI = process.env.DB_URI;

mongoose.connect(DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .catch((error) => {
        console.error("Error connecting to the MongoDB database:", error);
    });

const db = mongoose.connection;

module.exports = { db };
