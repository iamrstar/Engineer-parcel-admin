const express = require("express");
const Booking = require("../models/Booking");
const Pincode = require("../models/Pincode");
const { protect, admin } = require("../middleware/auth");
const { calculatePrice } = require("../utils/helpers");

// ✅ Import email sender
const { sendBookingConfirmation } = require("../services/emailTemplates");

const router = express.Router();

// ✅ POST: Create Booking
router.post("/", async (req, res) => {
  console.log("Received booking payload:", req.body);

  try {
    const {
      senderDetails,
      receiverDetails,
      serviceType,
      packageDetails,
      pickupDate,
      pickupSlot,
      notes,
      paymentMethod
    } = req.body;

    // Validate pincodes
    const pickupPincode = await Pincode.findOne({ pincode: senderDetails.pincode, isServiceable: true });
    const deliveryPincode = await Pincode.findOne({ pincode: receiverDetails.pincode, isServiceable: true });

    if (!pickupPincode) return res.status(400).json({ success: false, message: `Pickup location ${senderDetails.pincode} is not serviceable` });
    if (!deliveryPincode) return res.status(400).json({ success: false, message: `Delivery location ${receiverDetails.pincode} is not serviceable` });

    const distance = Math.abs(pickupPincode.deliveryDays - deliveryPincode.deliveryDays);

    // Calculate pricing
    // Calculate pricing
    const pricing = calculatePrice({
      serviceType,
      distance,
      weight: packageDetails.weight || 1,
      weightUnit: packageDetails.weightUnit || "kg", // <-- Gram / kg handled
      length: packageDetails.dimensions?.length || 0,
      width: packageDetails.dimensions?.width || 0,
      height: packageDetails.dimensions?.height || 0,
      fragile: packageDetails.fragile || false,
      value: packageDetails.value || 0,
    });


    // Create booking
    const booking = new Booking({
      userId: req.user ? req.user.id : null,
      serviceType,
      senderDetails,
      receiverDetails,
      packageDetails,
      pickupDate,
      pickupSlot,
      pricing,
      notes,
      paymentMethod,
      trackingHistory: [
        { status: "pending", location: senderDetails.address, description: "Booking created successfully" },
      ],
    });

    await booking.save();

    // ✅ Send emails asynchronously
    try {
      const sender = { name: booking.senderDetails.name, email: booking.senderDetails.email };
      const receiver = { name: booking.receiverDetails.name, email: booking.receiverDetails.email };
      sendBookingConfirmation(booking, sender).catch(console.error);
      sendBookingConfirmation(booking, receiver).catch(console.error);
    } catch (err) {
      console.error("Error sending booking confirmation emails:", err);
    }

    res.status(201).json({ success: true, message: "Booking created successfully", data: booking });

  } catch (err) {
    console.error("Booking validation error:", err);
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(", ") });
    }
    res.status(500).json({ success: false, message: err.message || "unknown error" });
  }
});

// GET booking by bookingId
router.get("/:bookingId", async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.bookingId }).populate("userId", "name email phone");
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    res.json({ success: true, data: booking });
  } catch (error) {
    console.error("Get booking error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET all bookings (admin)
router.get("/", protect, admin, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error("Get all bookings error:", error);
    res.status(500).json({ success: false, message: "Server error while fetching bookings" });
  }
});

// Confirm booking after online payment
router.post("/confirm-booking", async (req, res) => {
  try {
    const { bookingData } = req.body;

    const booking = new Booking({
      ...bookingData,
      paymentMethod: "Online",
      paymentStatus: "paid",
      trackingHistory: [
        { status: "pending", location: bookingData.senderDetails.address, description: "Booking created after successful payment" }
      ]
    });

    await booking.save();

    // ✅ Send emails asynchronously
    try {
      const sender = { name: booking.senderDetails.name, email: booking.senderDetails.email };
      const receiver = { name: booking.receiverDetails.name, email: booking.receiverDetails.email };
      sendBookingConfirmation(booking, sender).catch(console.error);
      sendBookingConfirmation(booking, receiver).catch(console.error);
    } catch (err) {
      console.error("Error sending booking confirmation emails:", err);
    }

    res.status(201).json({ success: true, booking });

  } catch (err) {
    console.error("Error creating booking after payment:", err);
    res.status(500).json({ success: false, message: "Failed to create booking" });
  }
});

module.exports = router;
