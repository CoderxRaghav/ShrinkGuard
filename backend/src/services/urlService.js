const pool = require("../config/db");

async function createShortUrl(userId, originalUrl, shortCode) {
    const query = `
        INSERT INTO urls (user_id, original_url, short_code)
        VALUES ($1, $2, $3)
        RETURNING *;
    `;

    const values = [userId, originalUrl, shortCode];

    const result = await pool.query(query, values);

    return result.rows[0];
}

async function getUrlByShortCode(shortCode) {
    const query = `
        SELECT *
        FROM urls
        WHERE short_code = $1;
    `;

    const result = await pool.query(query, [shortCode]);

    return result.rows[0];
}

module.exports = {
    createShortUrl,
    getUrlByShortCode
};