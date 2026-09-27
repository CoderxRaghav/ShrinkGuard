const { Queue } = require("bullmq");

const clickQueue = new Queue("click-events", {
    connection: {
        host: "redis",
        port: 6379
    }
});

module.exports = clickQueue;