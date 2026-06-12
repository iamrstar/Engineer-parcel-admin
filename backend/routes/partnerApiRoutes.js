const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const requireApiKey = require("../middleware/apiAuth");

// POST /api/v1/partners/orders - Create a new order
router.post("/orders", requireApiKey, async (req, res) => {
    try {
        const partner = req.partner;
        const { senderDetails, receiverDetails, packageDetails, serviceType } = req.body;

        if (!senderDetails || !receiverDetails) {
            return res.status(400).json({ error: "senderDetails and receiverDetails are required" });
        }

        // Create booking
        const booking = new Booking({
            serviceType: serviceType || "express",
            senderDetails,
            receiverDetails,
            packageDetails: packageDetails || { weight: 0 },
            isVendorBooking: true, // Reusing existing system
            vendorId: partner.partnerId,
            vendorName: partner.name,
            paymentMethod: "online", // Or COD based on payload
        });

        const newBooking = await booking.save();
        
        res.status(201).json({
            success: true,
            trackingId: newBooking.bookingId, // Uses EPXXXXX booking ID
            status: newBooking.status,
            message: "Order created successfully"
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/v1/partners/orders/:trackingId/track - Track an order
router.get("/orders/:trackingId/track", requireApiKey, async (req, res) => {
    try {
        const partner = req.partner;
        const trackingId = req.params.trackingId;

        // Ensure partner can only track their own orders
        const booking = await Booking.findOne({ 
            bookingId: trackingId,
            vendorId: partner.partnerId 
        });

        if (!booking) {
            return res.status(404).json({ error: "Order not found or you don't have permission to track it" });
        }

        res.json({
            success: true,
            trackingId: booking.bookingId,
            status: booking.status,
            currentLocation: booking.currentLocation,
            trackingHistory: booking.trackingHistory,
            estimatedDelivery: booking.estimatedDelivery
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
