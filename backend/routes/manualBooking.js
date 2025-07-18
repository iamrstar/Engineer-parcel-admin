const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");

router.post("/", async (req, res) => {
  try {
    const {
      bookingId, // optional
      serviceType,
      senderDetails,
      receiverDetails,
      packageDetails,
      pickupPincode,
      deliveryPincode,
      pickupDate,
      pickupSlot,
      deliveryDate,
      status,
      currentLocation,
      parcelImage,
      couponCode,
      couponDiscount,
      insuranceRequired,
      pricing,
      estimatedDelivery,
      paymentStatus,
      paymentMethod,
      notes,
      bookingSource = "Manual",
    } = req.body;

    // Basic validation
    if (!serviceType || !senderDetails || !receiverDetails || !packageDetails) {
      return res.status(400).json({ error: "Missing required booking fields." });
    }

    // Check for duplicate bookingId if it was provided manually
    if (bookingId) {
      const existingBooking = await Booking.findOne({ bookingId });
      if (existingBooking) {
        return res.status(400).json({
          error: "This booking ID is already assigned to another order.",
        });
      }
    }

    // Create new booking
    const newBooking = new Booking({
      bookingId, // Will be auto-generated in pre-save if not provided
      serviceType,
      senderDetails,
      receiverDetails,
      packageDetails,
      pickupPincode,
      deliveryPincode,
      pickupDate,
      pickupSlot,
      deliveryDate,
      status,
      currentLocation,
      parcelImage,
      couponCode,
      couponDiscount,
      insuranceRequired,
      pricing,
      estimatedDelivery,
      paymentStatus,
      paymentMethod,
      notes,
      bookingSource,
    });

    await newBooking.save();

    res.status(201).json({
      message: "Manual booking created successfully.",
      booking: newBooking,
    });
  } catch (error) {
    console.error("Manual booking error:", error);
    res.status(500).json({ error: "Failed to create manual booking." });
  }
});

module.exports = router;
