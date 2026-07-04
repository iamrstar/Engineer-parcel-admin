const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Partner = require("../models/Partner");
const Booking = require("../models/Booking");
const partnerPortalAuth = require("../middleware/partnerPortalAuth");

// POST /login
router.post("/login", async (req, res) => {
    try {
        const { identifier, password } = req.body; // identifier can be email or partnerId
        
        if (!identifier || !password) {
            return res.status(400).json({ message: "Please provide both identifier and password" });
        }

        const searchIdentifier = identifier.trim();
        const partner = await Partner.findOne({
            $or: [
                { email: searchIdentifier.toLowerCase() },
                { partnerId: { $regex: new RegExp(`^${searchIdentifier}$`, 'i') } }
            ]
        }).select("+password");

        if (!partner || !partner.password) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, partner.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: partner._id, role: "partner" },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            token,
            partner: {
                _id: partner._id,
                name: partner.name,
                email: partner.email,
                partnerId: partner.partnerId,
                pricePerKg: partner.pricePerKg
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /me
router.get("/me", partnerPortalAuth, async (req, res) => {
    try {
        const partner = req.partner;
        res.json({
            _id: partner._id,
            name: partner.name,
            email: partner.email,
            partnerId: partner.partnerId,
            pricePerKg: partner.pricePerKg
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /dashboard
router.get("/dashboard", partnerPortalAuth, async (req, res) => {
    try {
        const { timeframe, startDate, endDate } = req.query; 
        const query = { vendorId: req.partner.partnerId };

        if (timeframe === "month") {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            query.createdAt = { $gte: startOfMonth };
        } else if (timeframe === "prevMonth") {
            const startOfPrevMonth = new Date();
            startOfPrevMonth.setMonth(startOfPrevMonth.getMonth() - 1);
            startOfPrevMonth.setDate(1);
            startOfPrevMonth.setHours(0, 0, 0, 0);

            const endOfPrevMonth = new Date();
            endOfPrevMonth.setDate(0); // Last day of previous month
            endOfPrevMonth.setHours(23, 59, 59, 999);
            
            query.createdAt = { $gte: startOfPrevMonth, $lte: endOfPrevMonth };
        } else if (timeframe === "last3Months") {
            const startOf3MonthsAgo = new Date();
            startOf3MonthsAgo.setMonth(startOf3MonthsAgo.getMonth() - 3);
            startOf3MonthsAgo.setHours(0, 0, 0, 0);
            query.createdAt = { $gte: startOf3MonthsAgo };
        } else if (timeframe === "custom" && startDate && endDate) {
            query.createdAt = { 
                $gte: new Date(startDate), 
                $lte: new Date(endDate + 'T23:59:59.999Z') 
            };
        }

        const bookings = await Booking.find(query);
        
        let totalOrders = bookings.length;
        let totalKgs = 0;
        
        bookings.forEach(b => {
            if (b.packageDetails && b.packageDetails.chargeableWeight) {
                let weight = b.packageDetails.chargeableWeight;
                if (b.packageDetails.chargeableWeightUnit === 'g') {
                    weight = weight / 1000;
                }
                totalKgs += weight;
            } else if (b.packageDetails && b.packageDetails.weight) {
                let weight = b.packageDetails.weight;
                if (b.packageDetails.weightUnit === 'g') {
                    weight = weight / 1000;
                }
                totalKgs += weight;
            }
        });

        const pricePerKg = req.partner.pricePerKg || 0;
        const totalRupees = totalKgs * pricePerKg;

        // Status Breakdown
        const statusBreakdown = {
            "Pending": 0,
            "In Transit": 0,
            "Delivered": 0,
            "Returned": 0,
            "Failed": 0,
            "Other": 0
        };

        // Chart Data (Aggregate by Date)
        const chartDataMap = {};

        bookings.forEach(b => {
            // Populate Status Breakdown
            const status = b.status || "Pending";
            if (statusBreakdown[status] !== undefined) {
                statusBreakdown[status]++;
            } else if (status === "RTO" || status === "RTS" || status === "Returned") {
                statusBreakdown["Returned"]++;
            } else if (status === "Failed" || status === "Cancelled") {
                statusBreakdown["Failed"]++;
            } else if (status === "Out for Delivery" || status === "Dispatched") {
                statusBreakdown["In Transit"]++;
            } else {
                statusBreakdown["Other"]++;
            }

            // Populate Chart Data
            const dateStr = b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : "Unknown";
            if (!chartDataMap[dateStr]) {
                chartDataMap[dateStr] = 0;
            }
            chartDataMap[dateStr]++;
        });

        // Convert chartDataMap to array and sort by date
        const chartData = Object.keys(chartDataMap)
            .filter(date => date !== "Unknown")
            .sort((a, b) => new Date(a) - new Date(b))
            .map(date => ({
                date,
                orders: chartDataMap[date]
            }));

        res.json({
            totalOrders,
            totalKgs: totalKgs.toFixed(2),
            totalRupees: totalRupees.toFixed(2),
            pricePerKg,
            statusBreakdown,
            chartData
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /orders
router.get("/orders", partnerPortalAuth, async (req, res) => {
    try {
        const { timeframe, startDate, endDate } = req.query; 
        const query = { vendorId: req.partner.partnerId };

        if (timeframe === "month") {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            query.createdAt = { $gte: startOfMonth };
        } else if (timeframe === "prevMonth") {
            const startOfPrevMonth = new Date();
            startOfPrevMonth.setMonth(startOfPrevMonth.getMonth() - 1);
            startOfPrevMonth.setDate(1);
            startOfPrevMonth.setHours(0, 0, 0, 0);

            const endOfPrevMonth = new Date();
            endOfPrevMonth.setDate(0);
            endOfPrevMonth.setHours(23, 59, 59, 999);
            
            query.createdAt = { $gte: startOfPrevMonth, $lte: endOfPrevMonth };
        } else if (timeframe === "last3Months") {
            const startOf3MonthsAgo = new Date();
            startOf3MonthsAgo.setMonth(startOf3MonthsAgo.getMonth() - 3);
            startOf3MonthsAgo.setHours(0, 0, 0, 0);
            query.createdAt = { $gte: startOf3MonthsAgo };
        } else if (timeframe === "custom" && startDate && endDate) {
            query.createdAt = { 
                $gte: new Date(startDate), 
                $lte: new Date(endDate + 'T23:59:59.999Z') 
            };
        }

        const bookings = await Booking.find(query).sort({ createdAt: -1 });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /orders/:trackingId/track
router.get("/orders/:trackingId/track", partnerPortalAuth, async (req, res) => {
    try {
        const { trackingId } = req.params;
        const booking = await Booking.findOne({ 
            bookingId: trackingId,
            vendorId: req.partner.partnerId
        }).select('bookingId status trackingHistory receiverDetails createdAt');

        if (!booking) {
            return res.status(404).json({ message: "Booking not found or access denied." });
        }

        res.json({
            trackingId: booking.bookingId,
            currentStatus: booking.status || "Pending",
            receiver: booking.receiverDetails?.name,
            createdAt: booking.createdAt,
            history: booking.trackingHistory || []
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
