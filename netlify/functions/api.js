// netlify/functions/api.js
const express = require('express');
const serverless = require('serverless-http');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Hello from Express on Netlify!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/users', (req, res) => {
  res.json({
    users: [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ]
  });
});

app.get('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = { id: userId, name: `User ${userId}`, email: `user${userId}@example.com` };
  res.json(user);
});

app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  const newUser = {
    id: Date.now(),
    name,
    email,
    created: new Date().toISOString()
  };
  res.status(201).json(newUser);
});

// Error handling
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Export the serverless function
module.exports.handler = serverless(app);