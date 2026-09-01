const request = require('supertest');
const app = require('../src/app');
const { redisClient, connectRedis } = require('../src/config/redisClient');

beforeAll(async () => {
    await connectRedis();
});

afterAll(async () => {
    await redisClient.quit();
});

describe('POST /api/shorten', () => {
    it('should shorten a valid URL and return a shortCode', async () => {
        const response = await request(app)
            .post('/api/shorten')
            .send({ longUrl: 'https://example.com/test-page' });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('shortCode');
        expect(response.body).toHaveProperty('shortUrl');
        expect(response.body.longUrl).toBe('https://example.com/test-page');
    });

    it('should reject a request with no longUrl', async () => {
        const response = await request(app)
            .post('/api/shorten')
            .send({});

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });

    it('should reject an invalid URL', async () => {
        const response = await request(app)
            .post('/api/shorten')
            .send({ longUrl: 'not-a-real-url' });

        expect(response.status).toBe(400);
    });
});

describe('GET /:shortCode', () => {
    it('should redirect to the original URL for a valid shortCode', async () => {
        const shortenResponse = await request(app)
            .post('/api/shorten')
            .send({ longUrl: 'https://example.com/redirect-test' });

        const { shortCode } = shortenResponse.body;

        const redirectResponse = await request(app).get(`/${shortCode}`);

        expect(redirectResponse.status).toBe(302);
        expect(redirectResponse.headers.location).toBe('https://example.com/redirect-test');
    });

    it('should return 404 for a non-existent shortCode', async () => {
        const response = await request(app).get('/this-code-does-not-exist-xyz');

        expect(response.status).toBe(404);
    });
});