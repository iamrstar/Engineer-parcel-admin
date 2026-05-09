const express = require("express");
const router = express.Router();
const VisitorLog = require("../models/Analytics");

// Record Tracking Event
router.post("/track", async (req, res) => {
    try {
        const { sessionId, path, event, data } = req.body;

        if (event === "pageview") {
            const log = new VisitorLog({
                sessionId,
                path,
                referrer: data.referrer,
                userAgent: req.headers["user-agent"],
                device: data.device,
            });
            await log.save();
            return res.status(201).json({ success: true });
        }

        if (event === "heartbeat") {
            // Find the most recent log for this session and path within the last hour
            const log = await VisitorLog.findOne({ sessionId, path }).sort({ timestamp: -1 });
            if (log) {
                const now = new Date();
                const diff = (now - new Date(log.lastHeartbeat)) / 1000; // diff in seconds
                if (diff < 60) { // Only update if last heartbeat was within a minute
                    log.duration += diff;
                }
                log.lastHeartbeat = now;
                await log.save();
            }
            return res.json({ success: true });
        }

        if (event === "click") {
            const log = await VisitorLog.findOne({ sessionId, path }).sort({ timestamp: -1 });
            if (log) {
                log.clicks.push({
                    element: data.element,
                    text: data.text,
                });
                await log.save();
            }
            return res.json({ success: true });
        }

        res.status(400).json({ error: "Invalid event" });
    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get Stats for Dashboard
router.get("/stats", async (req, res) => {
    try {
        const { range = "7d" } = req.query;
        const days = range === "24h" ? 1 : range === "30d" ? 30 : 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Daily Visitors & Page Views
        const dailyStats = await VisitorLog.aggregate([
            { $match: { timestamp: { $gte: startDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                    uniqueVisitors: { $addToSet: "$sessionId" },
                    pageViews: { $sum: 1 }
                }
            },
            { $project: { date: "$_id", visitors: { $size: "$uniqueVisitors" }, views: "$pageViews" } },
            { $sort: { date: 1 } }
        ]);

        // Top Pages
        const topPages = await VisitorLog.aggregate([
            { $match: { timestamp: { $gte: startDate } } },
            {
                $group: {
                    _id: "$path",
                    views: { $sum: 1 },
                    avgDuration: { $avg: "$duration" }
                }
            },
            { $sort: { views: -1 } },
            { $limit: 10 }
        ]);

        // Device Breakdown
        const devices = await VisitorLog.aggregate([
            { $match: { timestamp: { $gte: startDate } } },
            {
                $group: {
                    _id: "$device.os",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Summary Stats
        const totalViews = await VisitorLog.countDocuments({ timestamp: { $gte: startDate } });
        const uniqueVisitors = await VisitorLog.distinct("sessionId", { timestamp: { $gte: startDate } });
        const avgDuration = await VisitorLog.aggregate([
            { $match: { timestamp: { $gte: startDate } } },
            { $group: { _id: null, avg: { $avg: "$duration" } } }
        ]);

        res.json({
            dailyStats,
            topPages,
            devices,
            summary: {
                totalViews,
                uniqueVisitors: uniqueVisitors.length,
                avgDuration: avgDuration[0]?.avg || 0
            }
        });
    } catch (error) {
        console.error("Stats Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
