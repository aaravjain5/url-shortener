const { redisClient } = require('../config/redisClient');
const { encode } = require('../utils/base62');

const COUNTER_KEY = 'url:counter';
const URL_PREFIX = 'url:';

async function shortenUrl(req, res) {
    try {
        const { longUrl } = req.body;

        if (!longUrl || typeof longUrl !== 'string') {
            return res.status(400).json({ error: 'longUrl is required and must be a string' });
        }

        // Basic URL validation
        try {
            new URL(longUrl);
        } catch {
            return res.status(400).json({ error: 'longUrl must be a valid URL' });
        }

        // Atomically increment the counter in Redis
        const counterValue = await redisClient.incr(COUNTER_KEY);

        // Convert the counter to a short Base62 code
        const shortCode = encode(counterValue);

        // Store the mapping: shortCode -> longUrl
        await redisClient.set(`${URL_PREFIX}${shortCode}`, longUrl);

        const shortUrl = `${req.protocol}://${req.get('host')}/${shortCode}`;

        return res.status(201).json({
            shortCode,
            shortUrl,
            longUrl
        });
    } catch (error) {
        console.error('Error shortening URL:', error);
        return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
}

async function redirectUrl(req, res) {
    try {
        const { shortCode } = req.params;

        const longUrl = await redisClient.get(`${URL_PREFIX}${shortCode}`);

        if (!longUrl) {
            return res.status(404).json({ error: `No URL found for code: ${shortCode}` });
        }

        return res.redirect(302, longUrl);
    } catch (error) {
        console.error('Error redirecting:', error);
        return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
}

module.exports = { shortenUrl, redirectUrl };