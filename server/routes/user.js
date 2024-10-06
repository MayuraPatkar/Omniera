const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const { db, accounts, allUserChats, chatHistory } = require("../DB/dataBase");
const bcrypt = require('bcrypt');
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


// GET '/signup'
router.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/signup.html'));
});


// GET '/login'
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/login.html'));
});


//GET '/profile'
router.get('/profile', (req, res) => {
    res.render('profile', { session: chatHistory.session });
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
