const express = require("express");

const urlRoutes = require("./routes/urlRoutes");

const app = express();

app.use(express.json());

app.use("/api", urlRoutes);
app.use("/", urlRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "ShrinkGuard API is running"
    });
});

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`ShrinkGuard API running on port ${PORT}`);
});