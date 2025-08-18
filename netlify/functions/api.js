const express = require('express');
const app = express();
const serverless = require('serverless-http');
const cors = require('cors');
const fetch = require('node-fetch');
const ZDK_API_HOST = "dev.zu.casa";

// middleware
app.use(express.urlencoded({extended: false}));

require('dotenv').config();
const ZDK_API_KEY = process.env.ZDK_API_KEY;
if (!ZDK_API_KEY) {
    console.log("ZDK_API_KEY env variable must be defined!");
    // process.exit(99); (Don't exit in serverless - just log the error)
}

//Hardcoded user data (this can be replaced with anything)
const user = {id: "5896f971-59f0-49b0-b358-c3596f169635", name: "hardcoded_user"};

//Authenticate user with ZDK backend
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
    }

    const result = await fetch('https://user.' + ZDK_API_HOST + '/user.tokens.private.v1.Service/Create', opts);
    return result.json();
}

async function createRoom() {
    const opts = {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'Authorization':  'Bearer ' + ZDK_API_KEY,
        },
        body: JSON.stringify({
            arguments: [
                {
                    metadata: {name: 'test room'},
                    kind: 2,
                    capacity:  32,
                    retention: 86400000000000
                }
            ]
        })
    };

    const result = await fetch('https://room.' + ZDK_API_HOST + '/room.rooms.private.v1.Service/Create', opts);
    return result.json();
}

async function kickMember(userId) {
    const opts = {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'Authorization':  'Bearer ' + ZDK_API_KEY,
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

    const result = await fetch('https://room.' + ZDK_API_HOST + '/room.members.private.v1.Service/Kick', opts);
    return result.json();
}

app.use(cors({
    origin: '*'
}));

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
    res.send(JSON.stringify({id: user.id, name: user.name}));
});

app.get('/api/token', async function (req, res) {
    const result = await createAuthToken(user.id, user.name)
    res.send(JSON.stringify({token: result.tokens[0]}));
});

app.get('/api/room', async function (req, res) {
    const result = await createRoom();
    res.send(JSON.stringify({room: result.rooms[0]}));
});

app.post('/api/kick', async function (req, res) {
    const result = await kickMember(req.body.id);
    res.send(JSON.stringify({room: result.rooms[0]}));
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