require("dotenv").config(); // Load .env
const express = require("express");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const Booking = require("../models/Booking");
const sendEmail = require("../utils/sendEmail");
const bookingConfirmationTemplate = require("../templates/bookingConfirmation");
const authMiddleware = require("../middleware/auth"); // optional

const router = express.Router();

/** ------------------------
 * 📦 Create Manual Booking (with full fields + invoice + email)
 * ------------------------ */
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

    // Validate required fields
    if (!serviceType || !senderDetails || !receiverDetails || !packageDetails) {
      return res.status(400).json({ error: "Missing required booking fields." });
    }

    // Create manual booking object
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
    console.log("📌 Manual Booking saved:", newBooking.bookingId);

    // ------------------- Generate Professional Invoice -------------------
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

    // Save invoice path
    newBooking.invoicePath = invoicePath;
    await newBooking.save();

    // ------------------- Send Emails -------------------
    const html = bookingConfirmationTemplate(newBooking);

    if (newBooking.senderDetails?.email) {
      await sendEmail({
        to: newBooking.senderDetails.email,
        subject: `Booking Confirmation - ${newBooking.bookingId}`,
        html,
        invoicePath,
        bookingId: newBooking.bookingId,
      });
      console.log("📩 Email sent to sender");
    }

    if (newBooking.receiverDetails?.email) {
      await sendEmail({
        to: newBooking.receiverDetails.email,
        subject: `Parcel on the way - ${newBooking.bookingId}`,
        html,
        invoicePath,
        bookingId: newBooking.bookingId,
      });
      console.log("📩 Email sent to receiver");
    }

    // Response
    res.status(201).json({
      message: "Manual booking created, invoice generated & emails sent! 🚀",
      booking: newBooking,
    });

  } catch (error) {
    console.error("❌ Manual Booking Error:", error);
    res.status(500).json({ message: "Error creating manual booking or sending email", error });
  }
});

module.exports = router;
