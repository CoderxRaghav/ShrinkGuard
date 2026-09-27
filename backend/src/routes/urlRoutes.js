const express = require("express");
const crypto = require("crypto");
const pool = require("../config/db");
const clickQueue = require("../queues/clickQueue");
const {
    redisClient,
    connectRedis
} = require("../config/redis");

const {
    checkRateLimit
} = require("../rateLimiter/rateLimiter");

const {
    createShortUrl,
    getUrlByShortCode
} = require("../services/urlService");

const router = express.Router();

router.post("/shorten", async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                error: "URL is required"
            });
        }

        const shortCode = crypto
            .randomBytes(4)
            .toString("hex");

        // Temporary user ID for Step 7 testing
        const userId = 1;

        const rateLimit = await checkRateLimit(
            `rate:user:${userId}`,
            5,
            0
        );

        if (!rateLimit.allowed) {
            return res.status(429).json({
                error: "Too many requests"
            });
        }

        const result = await createShortUrl(
            userId,
            url,
            shortCode
        );

        res.status(201).json({
            message: "URL shortened successfully",
            shortCode: result.short_code,
            originalUrl: result.original_url
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Internal server error"
        });
    }
});

router.get("/analytics/:shortCode", async (req, res) => {
    try {
        const { shortCode } = req.params;

        const query = `
            SELECT
                u.short_code,
                u.original_url,
                COUNT(c.id) AS total_clicks
            FROM urls u
            LEFT JOIN click_events c
                ON u.id = c.url_id
            WHERE u.short_code = $1
            GROUP BY
                u.id,
                u.short_code,
                u.original_url;
        `;

        const result = await pool.query(query, [shortCode]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Short URL not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Internal server error"
        });
    }
});

router.get("/:shortCode", async (req, res) => {
    try {
        const ip = req.ip;

        const rateLimit = await checkRateLimit(
            `rate:ip:${ip}`,
            20,
            0
        );

        if (!rateLimit.allowed) {
            return res.status(429).json({
                error: "Too many requests"
            });
        }

        const { shortCode } = req.params;

        await connectRedis();

        const cacheKey = `url:${shortCode}`;

        let url;

        // 1. Check Redis first
        const cachedUrl = await redisClient.get(cacheKey);

        if (cachedUrl) {
            url = JSON.parse(cachedUrl);
        } else {
            // 2. Fallback to PostgreSQL
            url = await getUrlByShortCode(shortCode);

            if (url) {
                // 3. Store in Redis for future requests
                await redisClient.set(
                    cacheKey,
                    JSON.stringify(url),
                    {
                        EX: 3600
                    }
                );
            }
        }

        if (!url) {
            return res.status(404).json({
                error: "Short URL not found"
            });
        }

        await clickQueue.add("click", {
            urlId: url.id
        });

        res.redirect(url.original_url);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Internal server error"
        });
    }
});

module.exports = router;
