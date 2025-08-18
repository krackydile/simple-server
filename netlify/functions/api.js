// netlify/functions/api.js
const express = require("express");
const serverless = require("serverless-http");
const cors = require("cors");
const fetch = require("node-fetch");
const { randomUUID } = require("crypto"); // used instead of crypto.randomUUID()
require("dotenv").config();

// ---- Config / env
const ZDK_API_HOST = "dev.zu.casa"; // same as sample
const ZDK_API_KEY = process.env.ZDK_API_KEY;
if (!ZDK_API_KEY) {
  console.log("ZDK_API_KEY env variable must be defined!");
  // Don't exit in Lambda; return 500s instead.
}

// ---- Hardcoded user (from sample)
const user = { id: "5896f971-59f0-49b0-b358-c3596f169635", name: "hardcoded_user" };

// ---- Helpers: mirror original simple-server functions
async function createAuthToken(id, nickname) {
  const opts = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + ZDK_API_KEY,
    },
    body: JSON.stringify({
      arguments: [
        {
          id: randomUUID(),
          avatar: "",
          nickname,
          fullname: "",
          permissions: [100, 200, 300, 400, 500, 600, 700, 800],
        },
      ],
    }),
  };
  const result = await fetch(`https://user.${ZDK_API_HOST}/user.tokens.private.v1.Service/Create`, opts);
  return result.json();
}

async function createRoom() {
  const opts = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: "Bearer " + ZDK_API_KEY,
    },
    body: JSON.stringify({
      arguments: [
        {
          metadata: { name: "test room" },
          kind: 2,
          capacity: 32,
          retention: 86400000000000,
        },
      ],
    }),
  };
  const result = await fetch(`https://room.${ZDK_API_HOST}/room.rooms.private.v1.Service/Create`, opts);
  return result.json();
}

async function kickMember(userId) {
  const opts = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: "Bearer " + ZDK_API_KEY,
    },
    body: JSON.stringify({
      arguments: [
        {
          query: [
            {
              conditions: [{ user_ids: [userId] }],
            },
          ],
        },
      ],
    }),
  };
  const result = await fetch(`https://room.${ZDK_API_HOST}/room.members.private.v1.Service/Kick`, opts);
  return result.json();
}

// ---- Express app (serverless)
const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json()); // needed for POST bodies
app.use(express.urlencoded({ extended: false }));

// Health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Routes matching the sample
app.get("/api/me", (_req, res) => {
  res.json({ id: user.id, name: user.name });
});

app.get("/api/token", async (_req, res) => {
  if (!ZDK_API_KEY) return res.status(500).json({ error: "Missing ZDK_API_KEY" });
  try {
    const result = await createAuthToken(user.id, user.name);
    res.json({ token: result.tokens?.[0] });
  } catch (e) {
    res.status(500).json({ error: "createAuthToken failed", details: String(e) });
  }
});

app.get("/api/room", async (_req, res) => {
  if (!ZDK_API_KEY) return res.status(500).json({ error: "Missing ZDK_API_KEY" });
  try {
    const result = await createRoom();
    res.json({ room: result.rooms?.[0] });
  } catch (e) {
    res.status(500).json({ error: "createRoom failed", details: String(e) });
  }
});

// The original code used GET with req.body.id; here we accept either query ?id=... or POST body {id:...}
app.all("/api/kick", async (req, res) => {
  if (!ZDK_API_KEY) return res.status(500).json({ error: "Missing ZDK_API_KEY" });
  const userId = req.method === "GET" ? req.query.id : req.body?.id;
  if (!userId) return res.status(400).json({ error: "Missing user id" });

  try {
    const result = await kickMember(userId);
    res.json({ result });
  } catch (e) {
    res.status(500).json({ error: "kickMember failed", details: String(e) });
  }
});

module.exports.handler = serverless(app);