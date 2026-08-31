const express = require('express');
const urlRoutes = require('./routes/urlRoutes');
const rateLimiter = require('./middleware/rateLimiter');

const app = express();

app.use(express.json());

// Tag every response with which instance handled it
app.use((req, res, next) => {
    res.setHeader('X-Served-By', process.env.INSTANCE_NAME || 'unknown');
    next();
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api/shorten', rateLimiter);
app.use('/', urlRoutes);

module.exports = app;