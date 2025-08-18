const express = require('express')
const serverless = require("serverless-http")
const app = express()
const port = 8888;
const cors = require('cors');
const path = require('path');
const fetch = require("node-fetch");
const ZDK_API_HOST = "dev.zu.casa";

// middleware
app.use(express.urlencoded({extended: false}))

require('dotenv').config();
const ZDK_API_KEY = process.env.ZDK_API_KEY;
if (!ZDK_API_KEY) {
    console.log("ZDK_API_KEY env variable must be defined!")
    process.exit(99);
}

//Hardcoded user data (this can be replaced with anything)
const user = {id: "5896f971-59f0-49b0-b358-c3596f169635", name: "hardcoded_user"};

//Authenticate user with ZDK backend
async function token(id, nickname) {
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

async function room() {
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

async function kick(userId) {
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
app.use('/static', express.static(path.join(__dirname, '/../../../frontend/build/static')))

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '/../../../frontend/build/index.html'));
});

app.get('/me', function (req, res) {
    res.send(JSON.stringify({id: user.id, name: user.name}));
});

app.get('/token', async function (req, res) {
    const result = await token(user.id, user.name)
    res.send(JSON.stringify({token: result.tokens[0]}));
});

app.get('/room', async function (req, res) {
    const result = await room();
    res.send(JSON.stringify({room: result.rooms[0]}));
});

app.get('/kick', async function (req, res) {
    const result = await kick(req.body.id);
    res.send(JSON.stringify({room: result.rooms[0]}));
});


/* istanbul ignore next */
if (!module.parent) {
    app.listen(8888);
    console.log('Express started on port 8888');
}

module.exports.handler = serverless(app);