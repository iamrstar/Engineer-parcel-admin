const express = require("express");
const Booking = require("../models/Booking");
const authMiddleware = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const Razorpay = require("razorpay");
const { generateReceiptPDF } = require("../utils/pdfReceipt");

// Initialize Razorpay
let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

const router = express.Router();

/** ------------------------
 * 📊 Dashboard & Test Routes
 * ------------------------ */
router.get("/stats/dashboard", authMiddleware, async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: "pending" });
    const deliveredBookings = await Booking.countDocuments({ status: "delivered" });
    const inTransitBookings = await Booking.countDocuments({ status: "in-transit" });

    const totalRevenue = await Booking.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$pricing.totalAmount" } } },
    ]);

    res.json({
      totalBookings,
      pendingBookings,
      deliveredBookings,
      inTransitBookings,
      totalRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/stats/pending-recent", authMiddleware, async (req, res) => {
  try {
    const recentPending = await Booking.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("bookingId senderDetails receiverDetails serviceType pricing createdAt");

    res.json(recentPending);
  } catch (error) {
    console.error("Error fetching recent pending:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/test-log", (req, res) => {
  console.log("✅ /api/bookings/test-log route hit");
  res.send("Test log working");
});

/** ------------------------
 * 📦 Get all bookings
 * ------------------------ */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, serviceType, search } = req.query;
    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (serviceType && serviceType !== "all") {
      query.serviceType = serviceType;
    }

    if (req.query.vendorNotAssigned === "true") {
      query.$or = [
        { vendorName: { $exists: false } },
        { vendorName: "" },
        { vendorName: null }
      ];
    }

    if (search) {
      query.$or = [
        { bookingId: { $regex: search, $options: "i" } },
        { "senderDetails.name": { $regex: search, $options: "i" } },
        { "receiverDetails.name": { $regex: search, $options: "i" } },
        { "senderDetails.phone": { $regex: search, $options: "i" } },
        { "receiverDetails.phone": { $regex: search, $options: "i" } },
      ];
    }

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(query);

    res.json({
      bookings,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

/** ------------------------
 * 🔔 Get E-Docket notification count
 * ------------------------ */
router.get("/edocket-count", adminAuth, async (req, res) => {
  try {
    // Count intake bookings that are not yet adminVerified
    const mongoose = require("mongoose");
    const IntakeBooking = mongoose.model("IntakeBooking");
    const count = await IntakeBooking.countDocuments({ adminVerified: false });
    res.json({ count });
  } catch (error) {
    console.error("Error fetching E-Docket count:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/** ------------------------
 * 🚲 Get Recent Rider Activity
 * ------------------------ */
router.get("/stats/recent-rider-activity", authMiddleware, async (req, res) => {
  try {
    // Find bookings that have recent tracking updates from riders
    // For simplicity, we'll get the 10 most recently updated bookings
    const recentUpdates = await Booking.find({
      assignedRider: { $ne: null },
      "trackingHistory.0": { $exists: true }
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate("assignedRider", "name phone");

    const activities = recentUpdates.map(booking => {
      const lastUpdate = booking.trackingHistory[booking.trackingHistory.length - 1];
      return {
        _id: lastUpdate?._id || booking._id,
        bookingId: booking.bookingId,
        status: booking.status,
        assignedRider: booking.assignedRider,
        timestamp: lastUpdate?.timestamp || booking.updatedAt
      };
    });

    res.json(activities);
  } catch (error) {
    console.error("Error fetching recent rider activity:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

/** ------------------------
 * 📄 Download Receipt PDF
 * ------------------------ */
router.get("/:id/receipt", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // On-the-fly Razorpay Link generation if missing but amount > 0
    if (booking.pricing?.totalAmount > 0 && !booking.paymentLink && razorpay) {
      try {
        const paymentLink = await razorpay.paymentLink.create({
          amount: booking.pricing.totalAmount * 100,
          currency: "INR",
          accept_partial: false,
          description: `Payment for Shipment ${booking.bookingId}`,
          customer: {
            name: booking.senderDetails.name,
            email: booking.senderDetails.email || "info@engineersparcel.com",
            contact: booking.senderDetails.phone
          },
          notify: { sms: false, email: false }, // Don't spam during download
          notes: { bookingId: booking.bookingId }
        });

        if (paymentLink) {
          booking.paymentLink = paymentLink.short_url;
          await booking.save();
        }
      } catch (razorpayErr) {
        console.error("Razorpay Link Error (Download):", razorpayErr);
      }
    }

    // Generate PDF
    const pdfBuffer = await generateReceiptPDF(booking);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=Receipt-${booking.bookingId || 'Booking'}.pdf`,
      "Content-Length": pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Receipt Download Error:", error);
    res.status(500).json({ message: "Failed to generate receipt" });
  }
});

/** ------------------------
 * ✏️ Update booking (general fields)
 * ------------------------ */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

/** ------------------------
 * 🗑️ Delete booking
 * ------------------------ */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json({ success: true, message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ message: "Server error deleting booking" });
  }
});

/** ------------------------
 * 🚚 Add tracking update
 * ------------------------ */
// ✅ Use this endpoint for tracking history updates
router.put("/:id/tracking", authMiddleware, async (req, res) => {
  try {
    const { status, location, description, timestamp } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const newEntry = {
      status: status || "No Status",
      location: location || "No Location",
      description: description || "N/A",
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    };

    if (!Array.isArray(booking.trackingHistory)) {
      booking.trackingHistory = [];
    }

    booking.trackingHistory.push(newEntry);
    booking.status = status || booking.status;
    if (location) {
      booking.currentLocation = location;
    }

    const updated = await booking.save();

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating tracking history" });
  }
});

/** ------------------------
 * ✏️ Edit specific tracking update
 * ------------------------ */
router.put("/:id/tracking/:trackingId", authMiddleware, async (req, res) => {
  try {
    const { status, location, description, timestamp } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const trackIndex = booking.trackingHistory.findIndex(
      (t) => t._id.toString() === req.params.trackingId
    );

    if (trackIndex === -1) {
      return res.status(404).json({ message: "Tracking update not found" });
    }

    // Update the fields
    if (status) booking.trackingHistory[trackIndex].status = status;
    if (location) booking.trackingHistory[trackIndex].location = location;
    if (description !== undefined) booking.trackingHistory[trackIndex].description = description;
    if (timestamp) booking.trackingHistory[trackIndex].timestamp = new Date(timestamp);

    // Update top-level status/location if we edited the most recent tracking item
    if (trackIndex === booking.trackingHistory.length - 1) {
      if (status) booking.status = status;
      if (location) booking.currentLocation = location;
    }

    const updated = await booking.save();
    res.json(updated);
  } catch (error) {
    console.error("Error editing tracking step:", error);
    res.status(500).json({ message: "Error editing tracking step" });
  }
});

/** ------------------------
 * 🗑️ Delete specific tracking update
 * ------------------------ */
router.delete("/:id/tracking/:trackingId", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const trackIndex = booking.trackingHistory.findIndex(
      (t) => t._id.toString() === req.params.trackingId
    );

    if (trackIndex === -1) {
      return res.status(404).json({ message: "Tracking update not found" });
    }

    booking.trackingHistory.splice(trackIndex, 1);

    // If we deleted the most recent one, try to rollback the overall status
    if (booking.trackingHistory.length > 0) {
      booking.status = booking.trackingHistory[booking.trackingHistory.length - 1].status;
    } else {
      booking.status = "pending"; // fallback
    }

    const updated = await booking.save();
    res.json(updated);
  } catch (error) {
    console.error("Error deleting tracking step:", error);
    res.status(500).json({ message: "Error deleting tracking step" });
  }
});

/** ------------------------
 * 🚲 Assign Rider to Booking
 * ------------------------ */
router.put("/:id/assign", adminAuth, async (req, res) => {
  try {
    const { riderId, assignedFor } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    booking.assignedRider = riderId || null;
    booking.assignedFor = assignedFor || "pickup";

    // Add to tracking history if a rider is assigned
    if (riderId) {
      const User = require("../models/User");
      const rider = await User.findById(riderId);
      if (rider) {
        booking.trackingHistory.push({
          status: booking.status,
          location: "Hub",
          timestamp: new Date(),
          description: `Rider ${rider.name} assigned for ${assignedFor || "pickup"}`
        });
      }
    }

    const updated = await booking.save();
    res.json(updated);
  } catch (error) {
    console.error("Error assigning rider:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/** ------------------------
 * 🔄 Reschedule/Recover Booking
 * ------------------------ */
router.put("/:id/reschedule", adminAuth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    booking.status = "pending";
    booking.isRejected = false;
    booking.rejectionReason = null;
    booking.assignedRider = null;

    booking.trackingHistory.push({
      status: "pending",
      location: "Hub",
      timestamp: new Date(),
      description: "Booking rescheduled by Admin. Ready for new assignment."
    });

    const updated = await booking.save();
    res.json(updated);
  } catch (error) {
    console.error("Error rescheduling booking:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
