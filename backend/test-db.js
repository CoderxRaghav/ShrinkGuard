// const pool = require("./src/config/db");

// async function testConnection() {
//     try {
//         const result = await pool.query("SELECT NOW()");
//         console.log("PostgreSQL connected successfully!");
//         console.log("Database time:", result.rows[0].now);
//     } catch (error) {
//         console.error("Database connection failed:");
//         console.error(error.message);
//     } finally {
//         await pool.end();
//     }
// }

// testConnection();
const pool = require("./src/config/db");

console.log("pool type:", pool.constructor.name);
console.log("query type:", typeof pool.query);
console.log("end type:", typeof pool.end);