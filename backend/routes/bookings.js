const express = require("express");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const Booking = require("../models/Booking");
const authMiddleware = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const sendEmail = require("../utils/sendEmail");
const bookingConfirmationTemplate = require("../templates/bookingConfirmation");

const router = express.Router();

/** ------------------------
 * 📦 Create New Booking (with automatic invoice & email)
 * ------------------------ */
router.post("/",  async (req, res) => {
  try {
    const bookingData = req.body;

    // 1️⃣ Save booking to DB
    const newBooking = await Booking.create(bookingData);
    console.log("📌 Booking saved:", newBooking.bookingId);

    // 2️⃣ Invoice Generate
    // 2️⃣ Generate Professional Invoice PDF
const invoicesDir = path.join(__dirname, "../invoices");
if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });

const invoicePath = path.join(invoicesDir, `Invoice-${newBooking.bookingId}.pdf`);
const doc = new PDFDocument({ margin: 40 });

doc.pipe(fs.createWriteStream(invoicePath));

// -------- Header --------
doc
  .fontSize(26)
  .fillColor("#FF6600")
  .text("Engineers Parcel", { align: "center" })
  .moveDown(0.5);

doc
  .fontSize(12)
  .fillColor("#333333")
  .text("Invoice", { align: "center" })
  .moveDown(1);

// Line Separator
doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke("#FF6600").moveDown(1);

// Booking Details
doc
  .fontSize(14)
  .fillColor("#000000")
  .text(`Invoice Date: ${new Date().toLocaleDateString()}`)
  .text(`Booking ID: ${newBooking.bookingId}`)
  .moveDown(1);

// -------- Sender & Receiver Section --------
doc
  .fontSize(16)
  .fillColor("#FF6600")
  .text("Sender Information")
  .moveDown(0.3);

doc
  .fontSize(12)
  .fillColor("#000000")
  .text(`Name: ${newBooking.senderDetails.name}`)
  .text(`Phone: ${newBooking.senderDetails.phone}`)
  .text(`Email: ${newBooking.senderDetails.email}`)
  .text(`Address: ${newBooking.senderDetails.address}, ${newBooking.senderDetails.city}, ${newBooking.senderDetails.state} - ${newBooking.senderDetails.pincode}`)
  .moveDown(1);

doc
  .fontSize(16)
  .fillColor("#FF6600")
  .text("Receiver Information")
  .moveDown(0.3);

doc
  .fontSize(12)
  .fillColor("#000000")
  .text(`Name: ${newBooking.receiverDetails.name}`)
  .text(`Phone: ${newBooking.receiverDetails.phone}`)
  .text(`Email: ${newBooking.receiverDetails.email}`)
  .text(`Address: ${newBooking.receiverDetails.address}, ${newBooking.receiverDetails.city}, ${newBooking.receiverDetails.state} - ${newBooking.receiverDetails.pincode}`)
  .moveDown(1);

// -------- Pricing Table --------
doc
  .fontSize(16)
  .fillColor("#FF6600")
  .text("Pricing Summary")
  .moveDown(0.5);

// Table Header
doc
  .rect(40, doc.y, 515, 20)
  .fill("#FFE6CC")
  .stroke("#FF6600");

doc
  .fillColor("#000000")
  .fontSize(12)
  .text("Description", 50, doc.y + 5)
  .text("Amount (₹)", 450, doc.y + 5);

doc.moveDown(1);

// Table Rows
const priceY = doc.y;
doc
  .text("Base Price", 50, priceY)
  .text(`${newBooking.pricing.basePrice}`, 450, priceY);

doc.moveDown(0.7);

doc
  .text("GST (18%)", 50, doc.y)
  .text(`${newBooking.pricing.tax}`, 450, doc.y);

doc.moveDown(0.7);

// Line before total
doc.moveTo(40, doc.y + 10).lineTo(550, doc.y + 10).stroke("#FF6600").moveDown(1);

// Total
doc
  .fontSize(14)
  .fillColor("#000000")
  .text("Grand Total:", 50, doc.y)
  .text(`₹${newBooking.pricing.totalAmount}`, 450, doc.y)
  .moveDown(2);

// Footer Note
doc
  .fontSize(10)
  .fillColor("#555555")
  .text("Thank you for choosing Engineers Parcel!", { align: "center" })
  .text("For any query contact: support@engineersparcel.com", { align: "center" });

doc.end();

console.log("📝 Invoice generated");

    newBooking.invoicePath = invoicePath;
    await newBooking.save();

    // 3️⃣ Send emails
    const html = bookingConfirmationTemplate(newBooking);

    if (newBooking.senderDetails?.email) {
      await sendEmail({
        to: newBooking.senderDetails.email,
        subject: `Booking Confirmation - ${newBooking.bookingId}`,
        html,
        invoicePath,
        bookingId: newBooking.bookingId,
      });
      console.log("📩 Sent to sender");
    }

    if (newBooking.receiverDetails?.email) {
      await sendEmail({
        to: newBooking.receiverDetails.email,
        subject: `Parcel on the way - ${newBooking.bookingId}`,
        html,
        invoicePath,
        bookingId: newBooking.bookingId,
      });
      console.log("📩 Sent to receiver");
    }

    // 4️⃣ Final API response
    res.status(201).json({
      message: "Booking created & emails sent! 🚀",
      booking: newBooking,
    });

  } catch (error) {
    console.error("❌ Booking route error:", error.message);
    res.status(500).json({ message: "Error creating booking or sending email", error });
  }
});


/** ------------------------
 * 📊 Dashboard stats
 * ------------------------ */
router.get("/stats/dashboard", authMiddleware, async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: "pending" });
    const deliveredBookings = await Booking.countDocuments({
      status: "delivered",
    });
    const inTransitBookings = await Booking.countDocuments({
      status: "in-transit",
    });

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

/** ------------------------
 * 📦 Get all bookings
 * ------------------------ */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const query = {};

    if (status && status !== "all") query.status = status;
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
 * 📦 Get booking by ID
 * ------------------------ */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

/** ------------------------
 * ✏️ Update booking
 * ------------------------ */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update ETD
router.put("/:id/etd", authMiddleware, async (req, res) => {
  try {
    const { etd } = req.body;
    if (!etd) return res.status(400).json({ message: "ETD is required" });

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { estimatedDelivery: etd },
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    res.json({ message: "Estimated Delivery updated successfully", booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

/** ------------------------
 * 🚚 Add tracking update
 * ------------------------ */
router.put("/:id/tracking", authMiddleware, async (req, res) => {
  try {
    const { status, location, description, timestamp } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const newEntry = {
      status: status || "No Status",
      location: location || "No Location",
      description: description || "N/A",
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    };

    if (!Array.isArray(booking.trackingHistory)) booking.trackingHistory = [];
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
 * 🗑️ Delete booking (admin only)
 * ------------------------ */
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Delete booking error:", error);
    res.status(500).json({ message: "Server error deleting booking" });
  }
});

/** ------------------------
 * 📧 Manual send booking email
 * ------------------------ */
router.post("/send-booking-email", async (req, res) => {
  try {
    const { email, bookingId } = req.body;
    if (!email || !bookingId)
      return res.status(400).json({ message: "email & bookingId required" });

    const booking = await Booking.findOne({ bookingId });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const html = bookingConfirmationTemplate(booking);

    await sendEmail({
      to: email,
      subject: `Booking Confirmation - ${booking.bookingId}`,
      html,
      invoicePath: booking.invoicePath,
      bookingId: booking.bookingId,
    });

    res.json({ message: "Email sent successfully!" });
  } catch (error) {
    console.error("Email route error:", error);
    res.status(500).json({ message: "Error sending email", error });
  }
});

module.exports = router;
