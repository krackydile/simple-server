// netlify/functions/api.js
const express = require('express');
const serverless = require('serverless-http');
const fetch = require('node-fetch');
const crypto = require('crypto');
const path = require('path');
const cors = require('cors');

const app = express();

// Environment variables
const ZDK_API_KEY = process.env.ZDK_API_KEY;
const ZDK_API_HOST = process.env.ZDK_API_HOST || "dev.zu.casa";

if (!ZDK_API_KEY) {
    console.log("ZDK_API_KEY env variable must be defined!");
}

if (!ZDK_API_HOST) {
    console.log("ZDK_API_HOST env variable must be defined!");
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple in-memory session store (replace with database in production)
const sessions = new Map();

// Utility functions
function generateRandomUser() {
    return {
        id: crypto.randomUUID(),
        name: `random-user-${Math.floor(Math.random() * 100)}`
    };
}

function getSession(req, res) {
    // Try to get session from cookie
    const sessionCookie = req.headers.cookie?.split(';')
        .find(c => c.trim().startsWith('session='))
        ?.split('=')[1];

    if (sessionCookie) {
        try {
            const sessionData = Buffer.from(decodeURIComponent(sessionCookie), 'base64').toString();
            const user = JSON.parse(sessionData);
            return user;
        } catch (error) {
            console.error('Error parsing session cookie:', error);
        }
    }

    // Create new user session
    const user = generateRandomUser();
    const sessionData = Buffer.from(JSON.stringify(user)).toString('base64');
    
    // Set cookie (expires in 1 year)
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    
    res.setHeader('Set-Cookie', `session=${encodeURIComponent(sessionData)}; Path=/; Expires=${expires.toUTCString()}; SameSite=Lax`);
    
    return user;
}

async function createRoom() {
    const body = {
        arguments: [
            {
                metadata: { name: "test room" },
                kind: 2,
                capacity: 32,
                retention: 86400000000000 // 24 hours
            }
        ]
    };

    try {
        const response = await fetch(`https://room.${ZDK_API_HOST}/room.rooms.private.v1.Service/Create`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'authorization': 'Bearer ' + ZDK_API_KEY,
            },
            body: JSON.stringify(body)
        });

        if (response.status !== 200) {
            throw new Error('Unauthorized');
        }

        const data = await response.json();
        return data.rooms[0];
    } catch (error) {
        console.error('Error creating room:', error);
        throw error;
    }
}

async function selectRoom(id) {
    const body = {
        arguments: [
            {
                query: {
                    conditions: [
                        {
                            ids: [id]
                        }
                    ]
                }
            }
        ]
    };

    try {
        const response = await fetch(`https://room.${ZDK_API_HOST}/room.rooms.private.v1.Service/Select`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'authorization': 'Bearer ' + ZDK_API_KEY,
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error selecting room:', error);
        throw error;
    }
}

async function updateRoom(id, capacity = null, metadata = null) {
    const args = {
        query: {
            conditions: [
                {
                    ids: [id]
                }
            ]
        }
    };

    if (capacity !== null) {
        args.capacity = { value: capacity };
    }

    if (metadata !== null) {
        args.metadata = { value: metadata };
    }

    const body = {
        arguments: [args]
    };

    try {
        const response = await fetch(`https://room.${ZDK_API_HOST}/room.rooms.private.v1.Service/Update`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'authorization': 'Bearer ' + ZDK_API_KEY,
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error updating room:', error);
        throw error;
    }
}

async function deleteRoom(id) {
    const body = {
        arguments: [
            {
                query: {
                    conditions: [
                        {
                            ids: [id]
                        }
                    ]
                }
            }
        ]
    };

    try {
        const response = await fetch(`https://room.${ZDK_API_HOST}/room.rooms.private.v1.Service/Delete`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'authorization': 'Bearer ' + ZDK_API_KEY,
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error deleting room:', error);
        throw error;
    }
}

async function kickMember(userId) {
    const body = {
        arguments: [
            {
                query: {
                    conditions: [
                        {
                            user_ids: [userId]
                        }
                    ]
                },
                reason: "something"
            }
        ]
    };

    try {
        const response = await fetch(`https://room.${ZDK_API_HOST}/room.members.private.v1.Service/Kick`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'authorization': 'Bearer ' + ZDK_API_KEY,
            },
            body: JSON.stringify(body)
        });

        if (response.status !== 200) {
            throw new Error('Unauthorized');
        }

        return true;
    } catch (error) {
        console.error('Error kicking member:', error);
        throw error;
    }
}

async function getAuthToken(id, nickname) {
    const body = {
        arguments: [
            {
                id: id,
                avatar: "",
                nickname: nickname,
                fullname: "",
                permissions: [100, 200, 300, 400, 500, 600, 700, 800]
            }
        ]
    };

    try {
        const response = await fetch(`https://user.${ZDK_API_HOST}/user.tokens.private.v1.Service/Create`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'authorization': 'Bearer ' + ZDK_API_KEY,
            },
            body: JSON.stringify(body)
        });

        if (response.status !== 200) {
            throw new Error('Unauthorized');
        }

        const data = await response.json();
        return data.tokens[0];
    } catch (error) {
        console.error('Error getting auth token:', error);
        throw error;
    }
}

app.use(cors({
    origin: '*'
}));

// Routes
app.get('/', (req, res) => {
    const user = getSession(req, res);
    console.log('User session:', user, 'Headers:', req.headers);
    
    res.json({
        message: 'ZDK API Server (converted from Go)',
        user: user,
        endpoints: [
            'GET /api/me - Get current user',
            'GET /api/token - Get auth token',
            'GET /api/room - Create room',
            'GET /api/kick?userId=ID - Kick member',
            'POST /api/room/select - Select room by ID',
            'PUT /api/room/:id - Update room',
            'DELETE /api/room/:id - Delete room'
        ]
    });
});

app.get('/api/me', (req, res) => {
    try {
        const user = getSession(req, res);
        res.json(user);
    } catch (error) {
        console.error('Error in /api/me:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/token', async (req, res) => {
    try {
        if (!ZDK_API_KEY) {
            return res.status(500).json({ error: 'ZDK_API_KEY not configured' });
        }

        const user = getSession(req, res);
        const token = await getAuthToken(user.id, user.name);
        res.json({ token: token });
    } catch (error) {
        console.error('Error in /api/token:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/room', async (req, res) => {
    try {
        if (!ZDK_API_KEY) {
            return res.status(500).json({ error: 'ZDK_API_KEY not configured' });
        }

        const room = await createRoom();
        res.json({ room: room });
    } catch (error) {
        console.error('Error in /api/room:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/kick', async (req, res) => {
    try {
        if (!ZDK_API_KEY) {
            return res.status(500).json({ error: 'ZDK_API_KEY not configured' });
        }

        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'userId parameter required' });
        }

        await kickMember(userId);
        res.json({});
    } catch (error) {
        console.error('Error in /api/kick:', error);
        res.status(500).json({ error: error.message });
    }
});

// Additional room management endpoints
app.post('/api/room/select', async (req, res) => {
    try {
        if (!ZDK_API_KEY) {
            return res.status(500).json({ error: 'ZDK_API_KEY not configured' });
        }

        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ error: 'Room ID required' });
        }

        const result = await selectRoom(id);
        res.json(result);
    } catch (error) {
        console.error('Error in /api/room/select:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/room/:id', async (req, res) => {
    try {
        if (!ZDK_API_KEY) {
            return res.status(500).json({ error: 'ZDK_API_KEY not configured' });
        }

        const { id } = req.params;
        const { capacity, metadata } = req.body;

        const result = await updateRoom(id, capacity, metadata);
        res.json(result);
    } catch (error) {
        console.error('Error in /api/room/:id (PUT):', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/room/:id', async (req, res) => {
    try {
        if (!ZDK_API_KEY) {
            return res.status(500).json({ error: 'ZDK_API_KEY not configured' });
        }

        const { id } = req.params;
        const result = await deleteRoom(id);
        res.json(result);
    } catch (error) {
        console.error('Error in /api/room/:id (DELETE):', error);
        res.status(500).json({ error: error.message });
    }
});

// Error handling
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Export the serverless function
module.exports.handler = serverless(app);