const fs = require("fs");
const path = require("path");

const {
    redisClient,
    connectRedis
} = require("../config/redis");

const luaScript = fs.readFileSync(
    path.join(__dirname, "tokenBucket.lua"),
    "utf8"
);

async function checkRateLimit(key, capacity, refillRate) {
    await connectRedis();

    const now = Date.now() / 1000;

    const result = await redisClient.eval(luaScript, {
        keys: [key],
        arguments: [
            capacity.toString(),
            refillRate.toString(),
            now.toString()
        ]
    });

    return {
        allowed: result[0] === 1,
        remainingTokens: result[1]
    };
}

module.exports = {
    checkRateLimit
};