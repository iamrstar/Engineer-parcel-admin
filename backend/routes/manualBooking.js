const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");

// Create Manual Booking
router.post("/", async (req, res) => {
  try {
    const {
      bookingId, // optional
      serviceType,
      senderDetails,
      receiverDetails,
      packageDetails, // full object aa raha frontend se
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

    // Required fields check
    if (!serviceType || !senderDetails || !receiverDetails || !packageDetails) {
      return res.status(400).json({ error: "Missing required booking fields." });
    }

    // Manual Booking create karo
    const newBooking = new Booking({
      bookingId,
      serviceType,
      senderDetails,
      receiverDetails,
      packageDetails: {
        weight: packageDetails.weight,
        weightUnit: packageDetails.weightUnit,
        volumetricWeight: packageDetails.volumetricWeight,
        dimensions: {
          length: packageDetails.dimensions?.length,
          width: packageDetails.dimensions?.width,
          height: packageDetails.dimensions?.height,
        },
        description: packageDetails.description,
        value: packageDetails.value,
        fragile: packageDetails.fragile,
      },
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
