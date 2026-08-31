const express = require('express');
const urlRoutes = require('./routes/urlRoutes');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use('/', urlRoutes);

module.exports = app;