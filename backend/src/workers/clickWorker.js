const { Worker } = require("bullmq");

const pool = require("../config/db");

const worker = new Worker(
    "click-events",
    async (job) => {
        console.log("JOB RECEIVED:", job.id, job.data);

        const { urlId } = job.data;

        const query = `
            INSERT INTO click_events (url_id)
            VALUES ($1);
        `;

        await pool.query(query, [urlId]);

        console.log(`Click recorded for URL ID: ${urlId}`);
    },
    {
        connection: {
            host: "redis",
            port: 6379
        }
    }
);

worker.on("ready", () => {
    console.log("Worker connected to Redis!");
});

worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
    console.error(`Job ${job?.id} failed:`, error.message);
});

worker.on("error", (error) => {
    console.error("Worker error:", error.message);
});

console.log("Click analytics worker is running...");