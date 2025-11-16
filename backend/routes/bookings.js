const express = require("express");
const Booking = require("../models/Booking");
const authMiddleware = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const {
  sendBookingConfirmation,
  sendShipmentUpdate,
} = require("../services/emailTemplates");

const router = express.Router();

/* ----------------------------------
   📦 Create Booking (Admin Panel)
---------------------------------- */
router.post("/", async (req, res) => {
  console.log("📦 Admin booking payload received:", req.body);

  try {
    // ✅ Create booking
    const booking = new Booking(req.body);
    await booking.save();

    console.log("✅ Booking created successfully:", booking.bookingId);

    // ✅ Try sending confirmation emails
    try {
      const sender = {
        name: booking.senderDetails?.name,
        email: booking.senderDetails?.email,
      };
      const receiver = {
        name: booking.receiverDetails?.name,
        email: booking.receiverDetails?.email,
      };

      if (sender.email) await sendBookingConfirmation(booking, sender);
      if (receiver.email) await sendBookingConfirmation(booking, receiver);
    } catch (emailErr) {
      console.error("❌ Email send error:", emailErr.message);
    }

    // ✅ Send response
    return res.status(201).json({
      success: true,
      message: "Booking created successfully & confirmation email sent.",
      booking,
    });
  } catch (error) {
    console.error("❌ Booking creation error:", error);

    // ✅ Handle duplicate bookingId error (MongoDB)
    if (error.code === 11000 && error.keyValue?.bookingId) {
      console.warn(`⚠️ Duplicate Booking ID detected: ${error.keyValue.bookingId}`);
      return res.status(400).json({
        success: false,
        message: `Booking ID "${error.keyValue.bookingId}" already exists.`,
      });
    }

    // ✅ Catch validation or unknown errors
    return res.status(500).json({
      success: false,
      message: error.message || "An unexpected error occurred while creating the booking.",
      error: error.stack,
    });
  }
});

/* ----------------------------------
   🚚 Update Tracking (Admin)
---------------------------------- */
router.put("/:id/tracking", authMiddleware, async (req, res) => {
  try {
    const { status, location, description, timestamp } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    const newEntry = {
      status: status || "No Status",
      location: location || "No Location",
      description: description || "N/A",
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    };

    if (!Array.isArray(booking.trackingHistory))
      booking.trackingHistory = [];

    booking.trackingHistory.push(newEntry);
    booking.status = status || booking.status;
    const updated = await booking.save();

    // ✅ Send shipment update emails
    const trackingInfo = {
      trackingId: booking.bookingId || booking._id,
      status,
      estimatedDelivery: booking.estimatedDelivery || "N/A",
    };

    try {
      if (booking.senderDetails?.email) {
        await sendShipmentUpdate(booking.senderDetails, trackingInfo);
        console.log("📨 Shipment update email sent to sender.");
      }

      if (booking.receiverDetails?.email) {
        await sendShipmentUpdate(booking.receiverDetails, trackingInfo);
        console.log("📨 Shipment update email sent to receiver.");
      }
    } catch (emailErr) {
      console.error("❌ Shipment email error:", emailErr.message);
    }

    res.json({ success: true, booking: updated });
  } catch (error) {
    console.error("❌ Tracking update error:", error);
    res.status(500).json({ message: "Error updating tracking" });
  }
});

router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const bookingId = req.params.id;

    // Find and delete the booking by ID
    const booking = await Booking.findByIdAndDelete(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    console.log(`✅ Booking with ID ${bookingId} deleted successfully.`);

    // Send success response
    res.json({
      success: true,
      message: `Booking with ID ${bookingId} has been deleted.`,
    });
  } catch (error) {
    console.error("❌ Error deleting booking:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting the booking.",
    });
  }
});





module.exports = router;
