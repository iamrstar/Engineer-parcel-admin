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

    if (!serviceType || !senderDetails || !receiverDetails || !packageDetails) {
      return res.status(400).json({ error: "Missing required booking fields." });
    }

    const newBooking = new Booking({
      bookingId, // optional — will be auto-generated if not provided
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
