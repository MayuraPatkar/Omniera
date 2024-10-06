const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const { accounts, allUserChats, chatHistory } = require("../DB/dataBase");
const { spawn } = require('child_process');
const multer = require('multer');
const upload = multer();
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

router.use(cookieParser());
router.use(express.json())


//GET '/newchat'
router.get('/chat', (req, res) => {
    res.render('chat', { session: chatHistory.session });
});


// HANDLE AI RESPONSE AND DB 
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

    const { conversationTitle, prompt, chatSessionId } = req.body;
    const pythonProcess = spawn('python', [path.join(__dirname, '../../server/T-CLM2/response.py'), JSON.stringify(prompt)]);

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

            if (!jsonResponse) {
                return res.status(500).json({ status: "error", message: "No AI response" });
            }

            // Chat session handling
            let chatSession;
            let sessionId;
            if (chatSessionId == "chat") {
                sessionId = uuidv4(); // Unique session for each chat

                // New chat session
                chatSession = new allUserChats({
                    user: userId,
                    session: sessionId,
                    conversation: {
                        title: conversationTitle,
                        time: new Date(),
                    },
                });

                await chatSession.save();
            } else {
                chatSession = await allUserChats.findOne({ session: chatSessionId });
                if (!chatSession) {
                    return res.status(404).json({ status: "error", message: "Chat session not found" });
                }
            }

            // Save chat history
            const newChatHistory = new chatHistory({
                user: userId,
                chat: chatSession._id,
                title: conversationTitle,
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
                sessionId: chatSession.session,
            });

        } catch (error) {
            console.error("Error handling AI response or saving chat:", error);
            return res.status(500).json({ status: "error", message: "Error processing AI response" });
        }
    });
});


//HANDLE TITLE
router.post('/update-title', async (req, res) => {
    const { sessionId, newTitle } = req.body;

    try {
        // Update the title in the database based on sessionId
        const chatSession = await allUserChats.findOneAndUpdate(
            { session: sessionId },
            { $set: { 'conversation.title': newTitle } }
        );

        if (!chatSession) {
            return res.status(404).json({ status: 'error', message: 'Chat session not found' });
        }

        res.status(200).json({ status: 'success', message: 'Title updated' });
    } catch (error) {
        console.error('Error updating title:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update title' });
    }
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

        // Format the chat history
        const formattedHistory = history.map(chat => ({
            prompt: chat.conversation.user,
            response: chat.conversation.ai,
        }));

        // Respond with chat history and the title
        return res.status(200).json({
            status: "success",
            title: chatSession.conversation.title,
            history: formattedHistory,
        });

    } catch (error) {
        console.error("Error fetching chat history:", error);
        return res.status(500).json({ status: "error", message: "Error fetching chat history" });
    }
});


// DELETE chat route
router.post('/delete-chat', async (req, res) => {
    const { sessionId } = req.body;

    if (!sessionId) {
        return res.status(400).json({ status: "error", message: "Session ID is required" });
    }

    try {
        const chatSession = await allUserChats.findOneAndDelete({ session: sessionId });

        if (!chatSession) {
            return res.status(404).json({ status: "error", message: "Chat session not found" });
        }
        await chatHistory.deleteMany({ chat: chatSession._id });
        return res.status(200).json({ status: "success", message: "Chat deleted successfully" });

    } catch (error) {
        console.error('Error deleting chat:', error);
        return res.status(500).json({ status: "error", message: "Failed to delete chat" });
    }
});

// HANDLE DELETE USER DATA
router.post('/clear-data', async (req, res) => {
    const sessionString = req.cookies.sessionToken;

    if (!sessionString) {
        return res.status(400).json({ status: "error", message: "Session ID is required" });
    }

    try {
        const user = await accounts.findOneAndDelete({ session: sessionString });

        if (!user) {
            return res.status(404).json({ status: "error", message: "user session not found" });
        }
        await allUserChats.deleteMany({ user: user._id });
        await chatHistory.deleteMany({ user: user._id });
        return res.status(200).json({ status: "success", message: "Data cleared successfully" });

    } catch (error) {
        console.error('Error deleting chat:', error);
        return res.status(500).json({ status: "error", message: "Failed to delete data" });
    }
});


// HANDLE LOAD CHAT PAGE
router.get('/chat/:session', async (req, res) => {
    try {
        const chatSessionId = req.params.session;
        const sessionString = req.cookies.sessionToken;

        const loggedInUser = await accounts.findOne({ session: sessionString });
        const chatHistory = await allUserChats.findOne({ session: chatSessionId });

        if (loggedInUser && chatHistory) {
            res.render('chat', { session: chatHistory.session });
        } else {
            res.render("404");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
});


// 404 Page Not Found Middleware
router.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, '../../client/404.html'));
});


module.exports = router;