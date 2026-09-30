# ShrinkGuard

**A production-shaped URL shortener with self-built distributed rate limiting and async click analytics — designed to demonstrate backend systems fundamentals, not just a CRUD wrapper around a hash function.**

[Live Demo](#) · [Video Walkthrough](#) · [Architecture](#architecture)

---

## Overview

Most URL shortener projects are a single `POST /shorten` endpoint and a lookup table — a database exercise wearing a systems-project costume. ShrinkGuard treats the shortener as the *product* and rate limiting as *infrastructure protecting that product*, because that's how it actually needs to work in production: without protection, a `/shorten` endpoint is a free spam-link generator, and a public `/:code` redirect endpoint is an open invitation for scrapers and bots.

The result is one coherent system that touches caching, distributed correctness, and asynchronous processing — instead of three separate toy projects doing each in isolation.

---

## The Core Problem This Project Solves

> **How do you rate-limit an API correctly when it's running on more than one server instance — without double-counting or letting a race condition slip a request past the limit?**

A naive in-memory counter (`requests++`) works on one server and breaks the moment you run two, because each instance has its own counter with no shared state. ShrinkGuard solves this with a **Redis-backed token bucket, implemented as an atomic Lua script** — so the check-and-decrement happens as a single atomic operation in Redis itself, regardless of which server instance handled the request.

---

## Features

- **Short link generation** — collision-safe short code generation, redirect with correct HTTP status (301/302 handled deliberately)
- **Two independent rate-limiting policies:**
  - Per-**user** limit on `POST /shorten` (stops spam link creation)
  - Per-**IP** limit on `GET /:code` (stops scraper/bot abuse) — different policy because the abuse pattern is different
- **Redis caching layer** — hot short-codes served from cache; PostgreSQL hit only on cache miss
- **Async click analytics** — every redirect publishes a click event to a queue instead of writing to Postgres synchronously, so the redirect itself stays fast under load

---

## Architecture

```
                    ┌─────────────────────────┐
                    │   Client / Browser        │
                    └───────────┬───────────────┘
                                │
                    ┌───────────▼───────────────┐
                    │        Express API          │
                    │  ┌────────────────────────┐ │
POST /shorten ──────┼─►│ Rate Limit: per-user    │ │
                    │  │ (Redis token bucket,    │ │
                    │  │  Lua script - atomic)   │ │
                    │  └───────────┬────────────┘ │
                    │              ▼                │
                    │      write to PostgreSQL       │
                    │                                │
GET /:code ─────────┼─►┌────────────────────────┐  │
                    │  │ Rate Limit: per-IP      │  │
                    │  │ (separate policy)       │  │
                    │  └───────────┬────────────┘  │
                    │              ▼                │
                    │   Redis cache lookup           │
                    │   (miss → PostgreSQL fallback) │
                    │              ▼                │
                    │   push click event → Queue     │
                    │              ▼                │
                    │        redirect (fast)          │
                    └────────────────────────────────┘
                                │
                    ┌───────────▼───────────────┐
                    │   BullMQ Worker (async)     │
                    │   aggregates click events    │
                    │   writes analytics rollups   │
                    │   to PostgreSQL               │
                    └────────────────────────────┘
```

**Why this split:** the redirect path (`GET /:code`) is the highest-traffic, latency-sensitive path — it must stay fast, so analytics writes are pushed off the critical path entirely via a queue and handled by a separate worker process. Rate-limit state lives in Redis (fast, atomic, shared across instances); durable data — links, click aggregates — lives in PostgreSQL.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| API | Node.js + Express | Simple, well-understood request handling |
| Rate limiting | Redis + Lua script (self-built, not a library) | Atomic cross-instance token bucket |
| Cache | Redis | Sub-millisecond lookups for hot short-codes |
| Queue | BullMQ (Redis-backed) | Async analytics processing off the critical path |
| Database | PostgreSQL | Durable storage for links, users, click aggregates |
| Containerization | Docker + Docker Compose | One-command local environment (API + worker + Redis + Postgres) |
| Deployment | Render / AWS free tier | Publicly demoable, real deployment target |

---

## Key Design Decisions

- **Rate limiter built from scratch, not `express-rate-limit`:** using a library would prove you can install a package, not that you understand the race condition a naive counter has across multiple instances. The Lua script check-and-decrement is atomic at the Redis level, which is what actually makes it correct under concurrency.
- **Two rate-limit policies, not one global limit:** `/shorten` and `/:code` have different abuse profiles (spam creation vs. scraping), so they're limited per-user and per-IP respectively, with different thresholds — a deliberate design choice, not a default.
- **Click analytics decoupled via queue:** writing analytics synchronously on every redirect would make the redirect path only as fast as the slowest DB write. Queuing it means the user-facing path is unaffected by analytics load, and the worker can batch/aggregate writes efficiently.
- **Cache-aside pattern for lookups:** Redis is checked first; PostgreSQL is the fallback and source of truth on a miss, with the cache repopulated after — standard, defensible caching strategy rather than caching everything blindly.

---

## Local Setup

```bash
git clone https://github.com/CoderxRaghav/shrinkguard.git
cd shrinkguard
docker-compose up   # spins up API, worker, Redis, and Postgres together

# Or run manually:
cd backend && npm install && npm run dev      # API
cd backend && npm run worker                   # BullMQ worker (separate process)
```

### Windows PowerShell

PowerShell may block the `npm.ps1` shim because of its script execution policy. Use `npm.cmd` instead. The backend already has a `package.json`, so do not run `npm init -y` in this project.

```powershell
cd shrinkguard\backend
npm.cmd install
npm.cmd run dev
```

Environment variables required — see `.env.example`.

---

## Verifying the Rate Limiter Works

```bash
# Fire 20 rapid requests against /shorten as the same user —
# requests beyond the configured limit should return 429
for i in {1..20}; do curl -X POST http://localhost:5000/shorten -H "Authorization: Bearer <token>" -d '{"url":"https://example.com"}'; done
```

Run the API as two separate instances (`PORT=5000` and `PORT=5001`) behind a shared Redis instance and repeat the test split across both — the limit still holds correctly across instances, proving the atomicity claim above isn't just theoretical.

---

## Future Scope

Deliberately out of scope for v1, to keep the core systems concepts (rate limiting, caching, async processing) the clear focus:

- Custom short-code aliases / vanity URLs
- QR code generation per link
- Team/workspace-level link management
- Geo-based redirect rules

---

## Author

**Raghav Tiwari** — B.Tech CSE, PSIT Kanpur
[GitHub](https://github.com/CoderxRaghav) · [LinkedIn](https://www.linkedin.com/in/raghav-tiwari-4a4b7c/)
