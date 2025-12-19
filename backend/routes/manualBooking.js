const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const sendEmail = require("../utils/sendEmail");
const bookingTemplate = require("../templates/bookingConfirmation");

router.post("/", async (req, res) => {
  try {
    const pkg = req.body.packageDetails || {};

    const weight = Number(pkg.weight) || 0;

    // ✅ Detect valid goods value
    const hasGoodsValue =
      pkg.value !== undefined &&
      pkg.value !== null &&
      pkg.value !== "" &&
      Number(pkg.value) > 0;

    const goodsValue = hasGoodsValue ? Number(pkg.value) : null;

    if (!weight && !hasGoodsValue) {
      return res.status(400).json({
        message: "Either weight or goods value must be provided",
      });
    }

    // ---------------- PRICING RULES ----------------
    const PER_KG_PRICE = 100;
    const PACKAGING_RATE = 0.08;
    const GST_RATE = 0.18;

    let pricing = {};

    // ✅ GOODS VALUE OVERRIDES AUTO PRICING
    if (hasGoodsValue) {
      pricing = {
        basePrice: goodsValue,
        packagingCharge: 0,
        tax: 0,
        totalAmount: goodsValue,
        pricingMode: "MANUAL",
      };
    }
    // ✅ AUTO WEIGHT CALCULATION (ROUNDED UP)
    else {
      const chargeableWeight = Math.ceil(weight); // 🔥 KEY FIX

      const basePrice = chargeableWeight * PER_KG_PRICE;
      const packagingCharge = +(basePrice * PACKAGING_RATE).toFixed(2);
      const subtotal = basePrice + packagingCharge;
      const tax = +(subtotal * GST_RATE).toFixed(2);
      const totalAmount = +(subtotal + tax).toFixed(2);

      pricing = {
        actualWeight: weight,        // record purpose
        chargeableWeight,            // courier weight
        basePrice: +basePrice.toFixed(2),
        packagingCharge,
        tax,
        totalAmount,
        pricingMode: "AUTO_WEIGHT",
      };
    }

    // ---------------- SAVE BOOKING ----------------
    const booking = new Booking({
      ...req.body,
      pricing, // ✅ single source of truth
      adminCreated: true,
    });

    const savedBooking = await booking.save();

    // ---------------- EMAIL ----------------
    const html = bookingTemplate(savedBooking);

    if (savedBooking.senderDetails?.email) {
      await sendEmail({
        to: savedBooking.senderDetails.email,
        subject: `Booking Confirmation - ${savedBooking.bookingId}`,
        html,
      });
    }

    if (
      savedBooking.receiverDetails?.email &&
      savedBooking.receiverDetails.email !==
        savedBooking.senderDetails?.email
    ) {
      await sendEmail({
        to: savedBooking.receiverDetails.email,
        subject: `Parcel Booked - ${savedBooking.bookingId}`,
        html,
      });
    }

    return res.status(201).json({
      message: "Manual booking created successfully",
      booking: savedBooking,
    });
  } catch (err) {
    console.error("❌ Manual booking error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
