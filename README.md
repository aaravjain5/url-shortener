# Distributed URL Shortener

A URL shortening service built to demonstrate core system-design concepts: atomic distributed counters, rate limiting, containerization, and horizontal scaling with load balancing.

Built with **Node.js**, **Express**, **Redis**, **Docker**, and **Nginx** as part of my backend portfolio.

---

## What It Does

Takes a long URL and returns a short, unique code that redirects back to the original — the same idea behind bit.ly or tinyurl. But the real point of this project isn't the URL shortening logic itself (which is simple); it's everything around it that makes it work correctly at scale:

- Generating unique short codes safely, even under concurrent load
- Rate limiting abuse, correctly, even when the app is running as multiple instances
- Running behind a load balancer distributing traffic across multiple app containers

---

## Architecture

```
Client → Nginx (load balancer, port 3000)
              ↓
   ┌──────────┼──────────┐
  app1       app2       app3   (3 Express instances)
   └──────────┼──────────┘
              ↓
           Redis (shared state: counter, URL mappings, rate limits)
```

All three app instances are stateless and identical — they share everything that matters (the URL counter, stored mappings, and rate-limit counters) through Redis. This is what actually makes horizontal scaling work: any instance can handle any request, because none of them hold state locally.

---

## How Short Codes Are Generated

Each new URL gets a short code by:
1. Atomically incrementing a counter in Redis (`INCR`) — this guarantees a unique number even if multiple requests hit different app instances at the exact same moment
2. Encoding that number into Base62 (`a-z`, `A-Z`, `0-9`) — keeping codes compact (a counter in the millions still produces just 4-5 characters)

Using Redis's atomic increment instead of, say, a random string avoids collision entirely — there's no scenario where two different URLs could ever end up with the same short code, and no need for collision-checking logic as a workaround.

---

## Rate Limiting

Implemented as a **sliding window** algorithm (not a simple fixed window), backed by Redis sorted sets: each request's timestamp is recorded, and on every new request, timestamps older than the current 60-second window are dropped before counting how many remain. If the count is at the limit (20 requests/minute per IP), the request is rejected with `429 Too Many Requests`.

The rate limiter is intentionally backed by Redis rather than in-memory storage — since the app runs as multiple separate instances behind a load balancer, an in-memory counter would only track requests hitting *that specific instance*, letting a client bypass the limit just by getting routed elsewhere. Redis gives all instances a single, shared, accurate view of each client's recent request history.

---

## Load Balancing

Nginx sits in front of three identical app instances and distributes incoming requests across them using round-robin. Each response includes an `X-Served-By` header identifying which instance handled it — a simple way to visibly confirm requests are actually being distributed rather than always hitting the same container.

---

## API Endpoints

### Shorten a URL

```
POST /api/shorten
Content-Type: application/json

{
  "longUrl": "https://example.com/some/very/long/path"
}
```

**Response — 201 Created**
```json
{
  "shortCode": "k",
  "shortUrl": "http://localhost:3000/k",
  "longUrl": "https://example.com/some/very/long/path"
}
```

**Response — 400 Bad Request** (missing or invalid URL)
```json
{
  "error": "longUrl must be a valid URL"
}
```

**Response — 429 Too Many Requests** (rate limit exceeded)
```json
{
  "error": "Too many requests. Please try again later."
}
```

### Redirect to the Original URL

```
GET /:shortCode
```

Redirects (`302`) to the original long URL, or returns `404` if the short code doesn't exist.

---

## Tech Stack

- **Node.js + Express** — API server
- **Redis** — atomic counters, URL storage, and rate-limit tracking, shared across all instances
- **Docker + Docker Compose** — containerizing the app and Redis
- **Nginx** — reverse proxy and load balancer across multiple app instances
- **Jest + Supertest** — integration testing

---

## Running Locally

```bash
git clone https://github.com/aaravjain5/url-shortener.git
cd url-shortener
docker compose up --build
```

This starts Redis, three app instances, and Nginx together. The API is available at `http://localhost:3000`.

## Running Tests

```bash
docker compose up -d redis
npm test
```

Tests run against an isolated Redis database (separate from local dev data), so results are consistent across repeated runs and don't depend on or interfere with real usage data.

---

## Design Decisions

**Why Base62 + Redis counter instead of hashing or random generation?**
Guarantees uniqueness by construction — no collision-checking retry logic needed, and codes stay short and predictable.

**Why sliding window over fixed window for rate limiting?**
A fixed window (e.g., "reset every 60 seconds on the clock") allows a burst of traffic right at the boundary between two windows to effectively double the allowed rate. A sliding window checks a continuously moving 60-second range, avoiding that edge case.

**Why does the rate limiter "fail open" on Redis errors?**
If Redis becomes temporarily unavailable, the rate limiter is designed to let requests through rather than block all traffic. Availability of the core service was prioritized over strict rate-limit enforcement during a Redis outage — a reasonable trade-off for this project, though a production system might handle this differently depending on how critical strict rate limiting is.

---

## Author

**Aarav Jain**
[GitHub](https://github.com/aaravjain5)

---

## License

© 2026 Aarav Jain. All rights reserved.

This project is shared publicly for portfolio and demonstration purposes only. You're welcome to read through the code and learn from it, but it is not licensed for reuse, redistribution, or submission as your own work.