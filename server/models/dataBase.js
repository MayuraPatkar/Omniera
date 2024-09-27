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

// Account Schema
const accountSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    session: {
        type: String,
        default: null,
    },
}, { timestamps: true });

const accounts = mongoose.model("accounts", accountSchema);

// Schema for storing all user chat sessions (conversations)
const allUserChatsSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "accounts",
        required: true,
    },
    session: String,
    conversation: {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        time: {
            type: Date,
            default: Date.now,
        },
    },
}, { timestamps: true });

const allUserChats = mongoose.model("allUserChats", allUserChatsSchema);

// Chat History Schema for individual chat messages
const chatHistorySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "accounts",
        required: true,
    },
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "allUserChats",
        required: true,
    },
    conversation: {
        user: {
            type: String,
            required: true,
        },
        ai: {
            type: String,
            required: true,
        },
    },
    time: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

const chatHistory = mongoose.model("chatHistories", chatHistorySchema);

module.exports = { db, accounts, allUserChats, chatHistory };
