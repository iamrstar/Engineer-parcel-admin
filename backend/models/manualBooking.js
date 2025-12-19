const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");

/**
 * 📦 Manual Booking Creation with Dynamic Pricing
 */
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
      status = "pending",
      currentLocation,
      parcelImage,
      couponCode,
      couponDiscount,
      insuranceRequired,
      estimatedDelivery,
      paymentStatus = "pending",
      paymentMethod = "COD",
      notes,
      bookingSource = "Manual",
    } = req.body;

    // ✅ Validate required fields
    if (!serviceType || !senderDetails || !receiverDetails || !packageDetails) {
      return res.status(400).json({ error: "Missing required booking fields." });
    }

    // ------------------- Pricing Logic -------------------
    let pricing = {};
    const PER_KG_PRICE = 100;
    const GST_RATE = 0.18;
    const PACKAGING_RATE = 0.08;

    // Case 2️⃣: Admin manually enters goods value
    if (packageDetails?.value && packageDetails.value > 0) {
      pricing = {
        basePrice: packageDetails.value,
        packagingCharge: 0,
        tax: 0,
        totalAmount: packageDetails.value,
        pricingMode: "MANUAL",
      };
    } 
    // Case 1️⃣: Auto calculation based on weight
    else if (packageDetails?.weight && packageDetails.weight > 0) {
      const weight = Number(packageDetails.weight);
      const basePrice = weight * PER_KG_PRICE;
      const packagingCharge = +(basePrice * PACKAGING_RATE).toFixed(2);;
      const subtotal = basePrice + packagingCharge;
      const tax = +(subtotal * GST_RATE).toFixed(2);;
      const totalAmount = +(subtotal + tax).toFixed(2);

      pricing = {
            basePrice: basePrice.toFixed(2),
        packagingCharge,
        tax,
        totalAmount,
        pricingMode: "AUTO_WEIGHT",
      };
    } 
    // Safety fallback
    else {
      return res.status(400).json({
        error: "Either package weight or goods amount must be provided",
      });
    }

    // ------------------- Create Booking -------------------
    const newBooking = new Booking({
      bookingId, // optional — auto-generated if not provided
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
      pricing, // ✅ use calculated pricing
      estimatedDelivery,
      paymentStatus,
      paymentMethod,
      notes,
      bookingSource,
      adminCreated: true,
    });

    await newBooking.save();

    res.status(201).json({
      message: "Manual booking created successfully.",
      booking: newBooking,
    });

  } catch (error) {
    console.error("❌ Manual booking error:", error);
    res.status(500).json({ error: "Failed to create manual booking." });
  }
});

module.exports = router;
