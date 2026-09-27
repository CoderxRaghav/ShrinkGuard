const { redisClient, connectRedis } = require("./src/config/redis");

async function testRedis() {
    try {
        await connectRedis();

        console.log("Redis connected successfully!");

        await redisClient.set("test:key", "Hello ShrinkGuard");

        const value = await redisClient.get("test:key");

        console.log("Redis value:", value);
    } catch (error) {
        console.error("Redis connection failed:");
        console.error(error.message);
    } finally {
        if (redisClient.isOpen) {
            await redisClient.quit();
        }
    }
}

testRedis();