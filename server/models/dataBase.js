const mongoose = require("mongoose");

const databaseUrl = "mongodb://127.0.0.1:27017/test";

mongoose
    .connect(databaseUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .catch((error) => {
        console.error("Error connecting to the MongoDB database:", error);
    });

const db = mongoose.connection;

const accountSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    session: String,
  });
  
  const accounts = mongoose.model("accounts", accountSchema);

module.exports = { db, accounts}