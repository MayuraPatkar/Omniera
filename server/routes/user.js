const express = require("express");
const path=require ("Path")

const router = express.Router();

// GET '/'
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname,'../../client/home.html'))
});

module.exports = router;