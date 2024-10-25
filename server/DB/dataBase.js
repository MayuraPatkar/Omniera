const mongoose = require("mongoose");
const databaseUrl = "mongodb+srv://mayurpatkar68:U5SD1fuLctdYrEup@cluster0.zlnie.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(databaseUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .catch((error) => {
        console.error("Error connecting to the MongoDB database:", error);
    });

const db = mongoose.connection;

module.exports = { db };
