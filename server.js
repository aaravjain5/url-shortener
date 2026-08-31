const app = require('./src/app');
const { connectRedis } = require('./src/config/redisClient');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await connectRedis();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();