// netlify/functions/api.js
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const ZDK_API_HOST = "dev.zu.casa";

// Middleware
app.use(express.urlencoded({extended: false}));
app.use(express.json());

// Get API key from environment variables
const ZDK_API_KEY = process.env.ZDK_API_KEY;
if (!ZDK_API_KEY) {
    console.log("ZDK_API_KEY env variable must be defined!");
    // Don't exit in serverless - just log the error
}

// Hardcoded user data
const user = {
    id: "5896f971-59f0-49b0-b358-c3596f169635", 
    name: "hardcoded_user"
};

// CORS configuration
app.use(cors({
    origin: '*'
}));

// Utility functions
async function createAuthToken(id, nickname) {
    const opts = {
        method: "POST",
        headers: {
            'content-type': 'application/json',
            'authorization': 'Bearer ' + ZDK_API_KEY,
        },
        body: JSON.stringify({
            arguments: [
                {
                    id: crypto.randomUUID(),
                    avatar: "", //optional
                    nickname: nickname, //optional
                    fullname: "", //optional
                    permissions: [100, 200, 300, 400, 500, 600, 700, 800]
                }
            ]
        })
    };

    try {
        const result = await fetch('https://user.' + ZDK_API_HOST + '/user.tokens.private.v1.Service/Create', opts);
        return await result.json();
    } catch (error) {
        console.error('Error creating auth token:', error);
        throw error;
    }
}

async function createRoom() {
    const opts = {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'Authorization': 'Bearer ' + ZDK_API_KEY,
        },
        body: JSON.stringify({
            arguments: [
                {
                    metadata: {name: 'test room'},
                    kind: 2,
                    capacity: 32,
                    retention: 86400000000000
                }
            ]
        })
    };

    try {
        const result = await fetch('https://room.' + ZDK_API_HOST + '/room.rooms.private.v1.Service/Create', opts);
        return await result.json();
    } catch (error) {
        console.error('Error creating room:', error);
        throw error;
    }
}

async function kickMember(userId) {
    const opts = {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'Authorization': 'Bearer ' + ZDK_API_KEY,
        },
        body: JSON.stringify({
            arguments: [
                {
                    query: [
                        {
                            conditions: [{
                                user_ids: [userId]
                            }]
                        }
                    ]
                }
            ]
        })
    };

    try {
        const result = await fetch('https://room.' + ZDK_API_HOST + '/room.members.private.v1.Service/Kick', opts);
        return await result.json();
    } catch (error) {
        console.error('Error kicking member:', error);
        throw error;
    }
}

// Routes
app.get('/', function (req, res) {
    res.json({
        message: 'ZDK API Server running on Netlify!',
        endpoints: [
            'GET /api/me - Get user info',
            'GET /api/token - Get auth token',
            'GET /api/room - Create room',
            'POST /api/kick - Kick member'
        ]
    });
});

app.get('/api/me', function (req, res) {
    res.json({id: user.id, name: user.name});
});

app.get('/api/token', async function (req, res) {
    try {
        if (!ZDK_API_KEY) {
            return res.status(500).json({error: 'ZDK_API_KEY not configured'});
        }
        
        const result = await createAuthToken(user.id, user.name);
        res.json({token: result.tokens[0]});
    } catch (error) {
        console.error('Token creation failed:', error);
        res.status(500).json({error: 'Failed to create token'});
    }
});

app.get('/api/room', async function (req, res) {
    try {
        if (!ZDK_API_KEY) {
            return res.status(500).json({error: 'ZDK_API_KEY not configured'});
        }
        
        const result = await createRoom();
        res.json({room: result.rooms[0]});
    } catch (error) {
        console.error('Room creation failed:', error);
        res.status(500).json({error: 'Failed to create room'});
    }
});

// Changed to POST for kick endpoint since it needs body data
app.post('/api/kick', async function (req, res) {
    try {
        if (!ZDK_API_KEY) {
            return res.status(500).json({error: 'ZDK_API_KEY not configured'});
        }
        
        const userId = req.body.id;
        if (!userId) {
            return res.status(400).json({error: 'User ID required in request body'});
        }
        
        const result = await kickMember(userId);
        res.json({result: result});
    } catch (error) {
        console.error('Kick member failed:', error);
        res.status(500).json({error: 'Failed to kick member'});
    }
});

// Error handling middleware
app.use((req, res) => {
    res.status(404).json({error: 'Route not found'});
});

app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({error: 'Internal server error'});
});

// Export the serverless function
module.exports.handler = serverless(app);