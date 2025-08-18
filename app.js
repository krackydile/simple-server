// app.js
const express = require('express');
const app = express();
const router = express.Router();

// Example route
router.get('/hello', (req, res) => {
    res.send('Hello from Netlify Express Function!');
});

// Mount the router under a base path (e.g., /api)
app.use('/api/', router);

module.exports = app;