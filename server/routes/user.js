const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const { db, accounts } = require("../models/dataBase");
const bcrypt = require('bcrypt');
const { spawn } = require('child_process');

const pythonProcess = spawn('python', ['response.py']);


const router = express.Router();
router.use(cookieParser());

// GET '/'
router.get("/", (req, res) => {
    const sessionString = req.cookies.sessionToken;
    if (sessionString) {
        accounts.findOne({ session: sessionString })
            .then((user) => {
                if (user) {
                    if (sessionString === user.session) {
                        res.sendFile(path.join(__dirname, '../../client/home.html'));
                    } else {
                        res.sendFile(path.join(__dirname, '../../client/landing.html'));
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

router.post("/ai-response", (req, res) => {
    const prompt = req.body;
    const pythonProcess = spawn('python', [path.join(__dirname, '../../server/T-MLM/response.py'), JSON.stringify(prompt)]);

    let result = '';

    pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            return res.status(500).json({ status: "error", message: "Python process failed" });
        }
        try {
            const jsonResponse = JSON.parse(result);
            return res.status(200).json({
                status: "success",
                response: jsonResponse,
            });
        } catch (error) {
            return res.status(500).json({ status: "error", message: "Invalid JSON response" });
        }
    });
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
