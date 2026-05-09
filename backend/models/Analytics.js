const mongoose = require("mongoose");

const visitorLogSchema = new mongoose.Schema({
    sessionId: { type: String, required: true },
    path: { type: String, required: true },
    referrer: { type: String },
    userAgent: { type: String },
    device: {
        os: String,
        browser: String,
        screenSize: String,
    },
    duration: { type: Number, default: 0 }, // in seconds
    clicks: [{
        element: String,
        text: String,
        timestamp: { type: Date, default: Date.now }
    }],
    timestamp: { type: Date, default: Date.now },
    lastHeartbeat: { type: Date, default: Date.now }
});

// Index for faster aggregation
visitorLogSchema.index({ timestamp: -1 });
visitorLogSchema.index({ sessionId: 1 });

module.exports = mongoose.model("VisitorLog", visitorLogSchema);
