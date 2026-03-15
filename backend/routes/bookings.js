const express = require("express");
const Booking = require("../models/Booking");
const authMiddleware = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");

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

/** ------------------------
 * ⚡ Get recent rider activity (picked/delivered in last 2 mins)
 * ------------------------ */
router.get("/stats/recent-rider-activity", authMiddleware, async (req, res) => {
  try {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentActivity = await Booking.find({
      status: { $in: ["picked", "delivered"] },
      updatedAt: { $gte: twoMinutesAgo }
    })
      .populate("assignedRider", "name")
      .sort({ updatedAt: -1 })
      .limit(5);

    res.json(recentActivity);
  } catch (error) {
    console.error("Error fetching recent rider activity:", error);
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
 * 📦 Get booking by ID
 * ------------------------ */
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

    // Update top-level status if we edited the most recent tracking item
    if (trackIndex === booking.trackingHistory.length - 1 && status) {
      booking.status = status;
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
 * 🏍️ Assign rider to booking
 * ------------------------ */
router.put("/:id/assign", authMiddleware, async (req, res) => {
  try {
    const { riderId, assignedFor } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    booking.assignedRider = riderId || null;
    booking.assignedFor = assignedFor || "pickup";

    const updated = await booking.save();
    const populated = await Booking.findById(updated._id).populate("assignedRider", "name phone role");

    res.json(populated);
  } catch (error) {
    console.error("Error assigning rider:", error);
    res.status(500).json({ message: "Error assigning rider" });
  }
});

/** ------------------------
 * 📋 Get bookings assigned to a specific rider
 * ------------------------ */
router.get("/assigned/:riderId", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({
      assignedRider: req.params.riderId,
      status: { $nin: ["delivered", "cancelled"] },
    })
      .populate("assignedRider", "name phone role")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error("Error fetching assigned bookings:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/** ------------------------
 * 🔄 Reschedule cancelled booking
 * ------------------------ */
router.put("/:id/reschedule", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    booking.status = "pending";
    booking.assignedRider = null;
    booking.assignedFor = null;

    booking.trackingHistory.push({
      status: "PENDING",
      location: "System",
      description: "Order rescheduled by Admin. Ready for new rider assignment.",
      timestamp: new Date()
    });

    await booking.save();
    res.json(booking);
  } catch (error) {
    console.error("Reschedule error:", error);
    res.status(500).json({ message: "Server error during rescheduling" });
  }
});

/** ------------------------
 * 🚚 Rider action: Mark as Picked / Delivered + send email
 * ------------------------ */
router.put("/:id/rider-action", authMiddleware, async (req, res) => {
  try {
    const { action, riderId } = req.body; // action: "picked" or "delivered"

    if (!["picked", "delivered", "cancelled"].includes(action)) {
      return res.status(400).json({ message: "Invalid action. Use 'picked', 'delivered', or 'cancelled'." });
    }

    const booking = await Booking.findById(req.params.id).populate("assignedRider", "name phone");
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Update booking status
    booking.status = action;

    // Add tracking history entry
    const trackingEntry = {
      status: action,
      location: action === "picked" || action === "cancelled" ? "Pickup Location" : "Delivery Location",
      description: action === "picked" ? `Order picked up by rider ${booking.assignedRider?.name || "Unknown"}` :
        action === "cancelled" ? `Pickup rejected by rider ${booking.assignedRider?.name || "Unknown"}` :
          `Order delivered by rider ${booking.assignedRider?.name || "Unknown"}`,
      timestamp: new Date(),
    };

    if (!Array.isArray(booking.trackingHistory)) {
      booking.trackingHistory = [];
    }
    booking.trackingHistory.push(trackingEntry);

    const updated = await booking.save();

    // Send email notification to customer (sender)
    try {
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const customerEmail = booking.senderDetails?.email;
      if (customerEmail) {
        let statusText = "Updated";
        let subjectText = "Order Update";

        if (action === "picked") {
          statusText = "Picked Up";
          subjectText = "Order Picked Up Successfully";
        } else if (action === "cancelled") {
          statusText = "Pickup Rejected";
          subjectText = "Order Pickup Rejected";
        } else if (action === "delivered") {
          statusText = "Delivered";
          subjectText = "Order Delivered Successfully";
        }

        const mailOptions = {
          from: `"Engineers Parcel" <${process.env.EMAIL_USER}>`,
          to: customerEmail,
          subject: `Your Order ${booking.bookingId} - ${subjectText}!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
              <h2 style="color: ${action === 'cancelled' ? '#ef4444' : '#16a34a'}; border-bottom: 2px solid #f3f4f6; pb: 10px;">Engineers Parcel - ${statusText}</h2>
              <p>Dear ${booking.senderDetails?.name || "Customer"},</p>
              <p>Your order <strong>${booking.bookingId}</strong> status has been updated to <strong>${statusText}</strong>.</p>
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #f3f4f6;">
                <p style="margin: 5px 0;"><strong>Booking ID:</strong> ${booking.bookingId}</p>
                <p style="margin: 5px 0;"><strong>New Status:</strong> ${statusText}</p>
                <p style="margin: 5px 0;"><strong>Rider:</strong> ${booking.assignedRider?.name || "N/A"}</p>
                <p style="margin: 5px 0;"><strong>Timestamp:</strong> ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
              </div>
              ${action === 'cancelled' ? '<p style="color: #6b7280; font-size: 14px;">If you have any questions regarding this rejection, please contact our support.</p>' : ''}
              <p>Thank you for choosing Engineers Parcel!</p>
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #f3f4f6; font-size: 12px; color: #9ca3af; text-align: center;">
                &copy; 2026 Engineers Parcel Service
              </div>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`📧 Email sent to ${customerEmail} for ${action}`);
      }
    } catch (emailError) {
      console.error("Email sending failed (non-blocking):", emailError.message);
    }

    res.json(updated);
  } catch (error) {
    console.error("Rider action error:", error);
    res.status(500).json({ message: "Error processing rider action" });
  }
});

module.exports = router;

