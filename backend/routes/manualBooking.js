require("dotenv").config();
const express = require("express");

// ❌ Invoice-related imports disabled for now
// const fs = require("fs");
// const path = require("path");
// const PDFDocument = require("pdfkit");

const Booking = require("../models/Booking");
const sendEmail = require("../utils/sendEmail");
const bookingConfirmationTemplate = require("../templates/bookingConfirmation");
// const authMiddleware = require("../middleware/auth"); // optional

const router = express.Router();

/**
 * 📦 Create Manual Booking (NO INVOICE – EMAIL ONLY)
 */
router.post("/", async (req, res) => {
  try {
    const {
      bookingId,
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
      pricing,
      estimatedDelivery,
      paymentStatus = "pending",
      paymentMethod = "COD",
      notes,
      bookingSource = "Manual",
    } = req.body;

    // ✅ Basic validation
    if (!serviceType || !senderDetails || !receiverDetails || !packageDetails) {
      return res.status(400).json({
        message: "Missing required booking fields.",
      });
    }

    // ✅ Create booking
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
        boxQuantity: packageDetails.boxQuantity,
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
      adminCreated: true,
    });

    await newBooking.save();
    console.log("✅ Manual Booking saved:", newBooking.bookingId);

    /* ❌ INVOICE GENERATION DISABLED FOR NOW
    ------------------------------------------------
    - PDF generation
    - Invoice storage
    - Invoice attachment in email
    ------------------------------------------------
    */

    // ✅ Send booking confirmation emails (WITHOUT invoice)
    const html = bookingConfirmationTemplate(newBooking);

    if (newBooking.senderDetails?.email) {
      await sendEmail({
        to: newBooking.senderDetails.email,
        subject: `Booking Confirmation - ${newBooking.bookingId}`,
        html,
        bookingId: newBooking.bookingId,
      });
      console.log("📩 Email sent to sender");
    }

    if (newBooking.receiverDetails?.email) {
      await sendEmail({
        to: newBooking.receiverDetails.email,
        subject: `Parcel on the way - ${newBooking.bookingId}`,
        html,
        bookingId: newBooking.bookingId,
      });
      console.log("📩 Email sent to receiver");
    }

    // ✅ Final response
    res.status(201).json({
      message: "Manual booking created successfully (Invoice disabled). 🚀",
      booking: newBooking,
    });

  } catch (error) {
    console.error("❌ Manual Booking Error:", error);
    res.status(500).json({
      message: "Error creating manual booking",
      error: error.message,
    });
  }
});

module.exports = router;
