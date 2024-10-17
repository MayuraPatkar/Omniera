const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const { accounts, allUserChats, chatHistory } = require("../DB/models");
const { spawn } = require('child_process');
const multer = require('multer');
const upload = multer();
const { v4: uuidv4 } = require('uuid');
const { status } = require("express/lib/response");
const router = express.Router();

router.use(cookieParser());
router.use(express.json());

//GET '/chat'
router.get('/', (req, res) => {
    const sessionString = req.cookies.sessionToken;
    if (sessionString) {
        res.render('chat', { session: sessionString });
    } else {
        res.redirect('/login');
    }
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

    // Collect data from Python process
    pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
    });

    // Handle stderr
    pythonProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    // Handle process close event
    pythonProcess.on('close', async (code) => {
        if (code !== 0) {
            return res.status(500).json({ status: "error", message: "Python process failed" });
        }

        try {
            const jsonResponse = JSON.parse(result);
            if (!jsonResponse) {
                return res.status(500).json({ status: "error", message: "No AI response" });
            }

            let chatSession;
            let sessionId;
            if (!chatSessionId) {
                sessionId = uuidv4();

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

    pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        return res.status(500).json({ status: "error", message: "Failed to start Python process" });
    });
});

// HANDLE TITLE
router.post('/update-title', async (req, res) => {
    const { sessionId, newTitle } = req.body;

    try {

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

// HANDLE LOAD ALL CHATS
router.get("/chat-history", async (req, res) => {
    const sessionString = req.cookies.sessionToken;

    if (!sessionString) {
        return res.status(400).json({ status: "error", message: "No session token provided" });
    }

    try {
        const user = await accounts.findOne({ session: sessionString });

        if (!user) {
            return res.status(404).json({ status: "error", message: "User not found" });
        }

        const chats = await allUserChats.find({ user: user._id }).sort({ "conversation.time": -1 });

        if (chats.length === 0) {
            return res.status(200).json({ status: "success", message: "No chat history", chats: [] });
        }

        return res.status(200).json({ status: "success", chats });

    } catch (error) {
        console.error("Error fetching chat history:", error);
        return res.status(500).json({ status: "error", message: "Error fetching chat history" });
    }
});


// HANDLE LOAD CHAT-HISTORY 
router.post('/get_chat_history', async (req, res) => {
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
            return res.status(200).json({ status: "notFound", message: "No chat history" });
        }

        const history = await chatHistory.find({ chat: chatSession._id }).sort({ time: -1 });

        const formattedHistory = history.map(chat => ({
            prompt: chat.conversation.user,
            response: chat.conversation.ai,
        }));

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
        console.error('Error deleting data:', error);
        return res.status(500).json({ status: "error", message: "Failed to delete data" });
    }
});

// HANDLE LOAD CHAT PAGE
router.get('/:session', async (req, res) => {
    try {
        const chatSessionId = req.params.session;
        const sessionString = req.cookies.sessionToken;

        if (!sessionString) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized: No session token' });
        }

        const user = await accounts.findOne({ session: sessionString });
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        const chatSession = await allUserChats.findOne({ session: chatSessionId, user: user._id });
        if (!chatSession) {
            return res.status(404).json({ status: 'error', message: 'Chat session not found' });
        }

        res.render('chat', { session: chatSession.session });
    } catch (error) {
        console.error('Error loading chat page:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load chat page' });
    }
});

module.exports = router;
