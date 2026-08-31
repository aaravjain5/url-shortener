const { redisClient } = require('../config/redisClient');

const WINDOW_SIZE_SECONDS = 60;
const MAX_REQUESTS_PER_WINDOW = 20;

async function rateLimiter(req, res, next) {
    try {
        const clientId = req.ip;
        const key = `rate_limit:${clientId}`;
        const now = Date.now();
        const windowStart = now - WINDOW_SIZE_SECONDS * 1000;

        // Remove timestamps outside the current sliding window
        await redisClient.zRemRangeByScore(key, 0, windowStart);

        // Count how many requests fall within the current window
        const requestCount = await redisClient.zCard(key);

        if (requestCount >= MAX_REQUESTS_PER_WINDOW) {
            return res.status(429).json({
                error: 'Too many requests. Please try again later.'
            });
        }

        // Record this request's timestamp
        await redisClient.zAdd(key, { score: now, value: `${now}-${Math.random()}` });

        // Set expiry on the key so it cleans up automatically if the client goes idle
        await redisClient.expire(key, WINDOW_SIZE_SECONDS);

        next();
    } catch (error) {
        console.error('Rate limiter error:', error);
        // Fail open — if Redis has an issue, don't block legitimate traffic
        next();
    }
}

module.exports = rateLimiter;