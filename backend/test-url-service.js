const {
    createShortUrl,
    getUrlByShortCode
} = require("./src/services/urlService");

async function test() {
    try {
        // First create a test user
        const userResult = await require("./src/config/db").query(
            `INSERT INTO users (email)
             VALUES ($1)
             ON CONFLICT (email)
             DO UPDATE SET email = EXCLUDED.email
             RETURNING id`,
            ["test@shrinkguard.com"]
        );

        const userId = userResult.rows[0].id;
        const shortCode = `test-${Date.now()}`;

        // Create a short URL
        const url = await createShortUrl(
            userId,
            "https://www.google.com",
            shortCode
        );

        console.log("URL created:");
        console.log(url);

        // Fetch it using short code
        const foundUrl = await getUrlByShortCode(shortCode);

        console.log("\nURL fetched:");
        console.log(foundUrl);

    } catch (error) {
        console.error("Test failed:");
        console.error(error.message);
    }
}

test();