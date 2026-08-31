const express = require('express');
const urlRoutes = require('./routes/urlRoutes');
const rateLimiter = require('./middleware/rateLimiter');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api/shorten', rateLimiter);
app.use('/', urlRoutes);

module.exports = app;