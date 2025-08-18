// netlify/functions/api.js
const serverless = require('serverless-http');
const app = require('../../app'); // Adjust path based on your project structure

exports.handler = serverless(app);