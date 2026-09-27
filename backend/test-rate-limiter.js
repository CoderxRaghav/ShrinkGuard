const {
    checkRateLimit
} = require("./src/rateLimiter/rateLimiter");

async function testRateLimiter() {
    const key = "test-rate-limit";

    for (let i = 1; i <= 7; i++) {
        const result = await checkRateLimit(
            key,
            5,
            0
        );

        console.log(`Request ${i}:`, result);
    }
}

testRateLimiter();