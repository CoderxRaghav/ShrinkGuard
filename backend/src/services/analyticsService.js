const pool = require("../config/db");

async function recordClick(urlId) {
    const query = `
        INSERT INTO click_events (url_id)
        VALUES ($1);
    `;

    await pool.query(query, [urlId]);
}

module.exports = {
    recordClick
};