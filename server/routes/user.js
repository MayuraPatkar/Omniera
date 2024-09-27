const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const { db, accounts, allUserChats, chatHistory } = require("../models/dataBase");
const bcrypt = require('bcrypt');
const { spawn } = require('child_process');
const multer = require('multer');
const upload = multer();
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

router.use(cookieParser());
router.use(express.json())


// GET '/'
router.get("/", (req, res) => {
    const sessionString = req.cookies.sessionToken;
    if (sessionString) {
        accounts.findOne({ session: sessionString })
            .then((user) => {
                if (user) {
                    if (sessionString === user.session) {
                        res.sendFile(path.join(__dirname, '../../client/dashboard.html'));
                    } else {
                        res.sendFile(path.join(__dirname, '../../client/landingpage.html'));
                    }
                } else {
                    res.sendFile(path.join(__dirname, '../../client/landingpage.html'));
                }
            })
            .catch((err) => {
                console.error(err);
                res.status(500).send("Internal server error");
            });
    } else {
        res.sendFile(path.join(__dirname, '../../client/landingpage.html'));
    }
});


//GET '/newchat'
router.get('/newchat', (req, res) => {
    res.render('chat', { session: chatHistory.session });
});


// GET '/login'
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/login.html'));
});


// GET '/signup'
router.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/signup.html'));
});


// Handle sign-up
router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const emailInUse = await accounts.findOne({ email }).lean();

        if (emailInUse) {
            return res.status(401).json({
                status: "error",
                message: "Email is already associated with another account",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const sessionString = await generateSession();

        const newUser = new accounts({
            name,
            email,
            password: hashedPassword,
            session: sessionString,
        });

        await newUser.save();

        const expirationTime = 24 * 60 * 60 * 1000;
        const expirationDate = new Date(Date.now() + expirationTime);

        res.cookie("sessionToken", sessionString, {
            expires: expirationDate,
            httpOnly: true,
        });

        return res.status(201).json({
            status: "success",
            message: "Sign-up successful!",
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
});


// Handle login
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const expirationTime = 24 * 60 * 60 * 1000;
    const expirationDate = new Date(Date.now() + expirationTime);

    try {
        const user = await accounts.findOne({ email: email });

        if (user) {
            const passwordMatch = await bcrypt.compare(password, user.password);

            if (passwordMatch) {
                res.cookie("sessionToken", user.session, {
                    expires: expirationDate,
                    httpOnly: true,
                    secure: true,
                });
                return res.status(200).json({
                    status: "success",
                    message: "Login successful!",
                    user,
                });
            } else {
                return res.status(401).json({
                    status: "error",
                    message: "Incorrect username or password.",
                });
            }
        } else {
            return res.status(401).json({
                status: "error",
                message: "Incorrect username or password.",
            });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
});


//HANDLE AI RESPONSE
router.post("/ai-response", upload.none(), async (req, res) => {
    const sessionString = req.cookies.sessionToken;

    let userId = null;

    if (sessionString) {
        try {
            const user = await accounts.findOne({ session: sessionString });
            if (user) {
                userId = user._id;
            }
        } catch (error) {
            console.error("Error finding user:", error);
            return res.status(500).json({ status: "error", message: "User lookup failed" });
        }
    }

    const { conversationTitle, prompt } = req.body;
    const pythonProcess = spawn('python', [path.join(__dirname, '../../server/T-MLM/response.py'), JSON.stringify(prompt)]);

    let result = '';

    pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    pythonProcess.on('close', async (code) => {
        if (code !== 0) {
            return res.status(500).json({ status: "error", message: "Python process failed" });
        }
        try {
            const jsonResponse = JSON.parse(result);

            if (jsonResponse) {
                try {
                    // if chat session already exists or create a new one
                    let chatSession = await allUserChats.findOne({ user: userId, "conversation.title": conversationTitle });

                    if (!chatSession) {
                        const sessionId = uuidv4(); // Unique session for each chat

                        // new chat session
                        chatSession = new allUserChats({
                            user: userId,
                            session: sessionId,
                            conversation: {
                                title: conversationTitle,
                                time: new Date(),
                            },
                        });
                        await chatSession.save();
                    }

                    // Save chat history
                    const newChatHistory = new chatHistory({
                        user: userId,
                        chat: chatSession._id,
                        conversation: {
                            user: prompt,
                            ai: jsonResponse,
                        },
                        time: new Date(),
                    });

                    await newChatHistory.save();

                    // Respond to the client
                    return res.status(200).json({
                        status: "success",
                        response: jsonResponse,
                    });

                } catch (dbError) {
                    console.error("Error saving to the database:", dbError);
                    return res.status(500).json({ status: "error", message: "Database save error" });
                }
            } else {
                console.log("No AI response");
            }
        } catch (error) {
            console.error("Invalid JSON response:", error);
            return res.status(500).json({ status: "error", message: "Invalid JSON response" });
        }
    });
});


//HANDLE LOAD ALL CHATS
router.get("/chat-history", async (req, res) => {
    const sessionString = req.cookies.sessionToken;
    let userId = null;

    if (sessionString) {
        try {
            const user = await accounts.findOne({ session: sessionString });
            if (user) {
                userId = user._id;
            } else {
                return res.status(404).json({ status: "error", message: "User not found" });
            }
        } catch (error) {
            return res.status(500).json({ status: "error", message: "Error finding user" });
        }
    }

    try {
        const chats = await allUserChats.find({ user: userId }).sort({ "conversation.time": -1 });
        return res.status(200).json({ status: "success", chats });
    } catch (error) {
        return res.status(500).json({ status: "error", message: "Error fetching chat history" });
    }
});


//HANDLE LOAD CHAT-HISTORY 
router.post('/get_chat_history/', async (req, res) => {
    const sessionString = req.cookies.sessionToken;

    if (!sessionString) {
        return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    let userId = null;

    try {
        const user = await accounts.findOne({ session: sessionString });
        if (user) {
            userId = user._id;
        } else {
            return res.status(404).json({ status: "error", message: "User not found" });
        }
    } catch (error) {
        console.error("Error finding user:", error);
        return res.status(500).json({ status: "error", message: "User lookup failed" });
    }

    const session = req.body.session;

    try {
        const chatSession = await allUserChats.findOne({ session, user: userId });

        if (!chatSession) {
            return res.status(404).json({ status: "error", message: "Chat session not found" });
        }
        const history = await chatHistory.find({ chat: chatSession._id }).sort({ time: -1 });

        // Respond 
        const formattedHistory = history.map(chat => ({
            prompt: chat.conversation.user,
            response: chat.conversation.ai,
        }));

        return res.status(200).json(formattedHistory);
    } catch (error) {
        console.error("Error fetching chat history:", error);
        return res.status(500).json({ status: "error", message: "Error fetching chat history" });
    }
});


// LOGOUT ENDPOINT
router.post('/logout', (req, res) => {
    res.clearCookie('sessionToken');
    return res.status(200).json({ status: "success", message: "Logged out successfully." });
});


// KILL ACCOUNT
router.post('/kill-account', async (req, res) => {
    const sessionString = req.cookies.sessionToken;

    if (!sessionString) {
        return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    try {
        const user = await accounts.findOne({ session: sessionString });

        if (!user) {
            return res.status(404).json({ status: "error", message: "User not found" });
        }

        await accounts.deleteOne({ _id: user._id });
        await allUserChats.deleteMany({ user: user._id });
        await chatHistory.deleteMany({ user: user._id });

        // Clear the session cookie
        res.clearCookie('sessionToken');

        return res.status(200).json({ status: "success", message: "Account deleted successfully." });
    } catch (error) {
        console.error("Error deleting account:", error);
        return res.status(500).json({ status: "error", message: "Internal server error" });
    }
});


//HANDLE LOAD CHAT PAGE
router.get('/chat/:session', async (req, res) => {
    try {
        const chatSessionId = req.params.session;
        const sessionString = req.cookies.sessionToken;

        const loggedInUser = await accounts.findOne({ session: sessionString });
        const chatHistory = await allUserChats.findOne({ session: chatSessionId });

        if (loggedInUser && chatHistory) {
            res.render('chat', { session: chatHistory.session });
        } else {
            res.render("notfound");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
});


// Function to generate session token
function generateSession() {
    return new Promise((resolve, reject) => {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let sessionString = "";
        for (let i = 0; i < 20; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            sessionString += characters.charAt(randomIndex);
        }
        db.collection("accounts")
            .find({ session: sessionString })
            .toArray()
            .then((result) => {
                if (result.length > 0) {
                    resolve(sessionString);
                } else {
                    resolve(sessionString);
                }
            })
            .catch((error) => {
                console.error(error);
                reject(error);
            });
    });
}


// 404 Page Not Found Middleware
router.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, '../../client/404.html'));
});

module.exports = router;
