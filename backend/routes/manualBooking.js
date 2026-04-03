const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Razorpay = require("razorpay");
const { generateReceiptPDF } = require("../utils/pdfReceipt");
const sendEmail = require("../utils/sendEmail");

// Initialize Razorpay
let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

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
      isVendorBooking = false,
      vendorId = null,
      bookingSource = "Manual",
    } = req.body;

    // Required fields check
    if (!serviceType || !senderDetails || !receiverDetails || !packageDetails) {
      return res.status(400).json({ error: "Missing required booking fields." });
    }

    // Look up EDL and KM for the delivery pincode
    let edl = 0;
    let km = 0;
    try {
      const Pincode = require("../models/Pincode");
      const pinData = await Pincode.findOne({ pincode: deliveryPincode || receiverDetails.pincode });
      if (pinData) {
        edl = pinData.edl || 0;
        km = pinData.km || 0;
      }
    } catch (pinErr) {
      console.error("Error fetching pincode data for manual booking:", pinErr);
    }

    // Manual Booking create karo
    const newBooking = new Booking({
      bookingId,
      serviceType,
      senderDetails,
      receiverDetails,
      edl,
      km,
      packageDetails: {
        weight: packageDetails.weight,
        weightUnit: packageDetails.weightUnit,
        volumetricWeight: packageDetails.volumetricWeight,
        dimensions: packageDetails.dimensions || [],
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
      isVendorBooking,
      vendorId,
      bookingSource,
    });

    await newBooking.save();

    // Generate Razorpay Payment Link if amount > 0
    if (newBooking.pricing?.totalAmount > 0 && razorpay) {
      try {
        const paymentLink = await razorpay.paymentLink.create({
          amount: newBooking.pricing.totalAmount * 100, // Paise
          currency: "INR",
          accept_partial: false,
          description: `Payment for Shipment ${newBooking.bookingId}`,
          customer: {
            name: newBooking.senderDetails.name,
            email: newBooking.senderDetails.email || "info@engineersparcel.com",
            contact: newBooking.senderDetails.phone
          },
          notify: { sms: true, email: true },
          reminder_enable: true,
          notes: {
            bookingId: newBooking.bookingId,
          }
        });

        if (paymentLink) {
          newBooking.paymentLink = paymentLink.short_url;
          await newBooking.save();
        }
      } catch (razorpayErr) {
        console.error("Razorpay Link Error (Manual):", razorpayErr);
      }
    }

    // Automated Email Receipt with PDF Attachment
    if (newBooking.senderDetails.email) {
      try {
        const amount = newBooking.pricing?.totalAmount || 0;
        const pricing = newBooking.pricing || {};

        // Generate PDF Buffer
        let pdfBuffer = null;
        try {
          pdfBuffer = await generateReceiptPDF(newBooking);
        } catch (pdfErr) {
          console.error("PDF Generation Error (Manual):", pdfErr);
        }

        const emailHtml = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <div style="background-color: #f97316; color: white; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">Order Confirmed!</h1>
            </div>
            <div style="padding: 30px; line-height: 1.6;">
              <p style="font-size: 16px;">Dear <strong>${newBooking.senderDetails.name}</strong>,</p>
              <p style="font-size: 16px; color: #475569;">We are pleased to inform you that <strong>your order is confirmed with us</strong>.</p>
              
              <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #f1f5f9;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Tracking Information</p>
                <p style="margin: 0; font-size: 18px; color: #1e293b;">Tracking ID: <span style="font-family: monospace; font-weight: bold; color: #ea580c;">${newBooking.bookingId}</span></p>
              </div>

              <div style="text-align: center; margin: 35px 0;">
                <p style="color: #64748b; margin-bottom: 5px; font-size: 14px;">Total Payable Amount</p>
                <h1 style="color: #ea580c; font-size: 36px; margin: 0;">₹${amount}</h1>
              </div>

              ${newBooking.paymentLink ? `
              <div style="background: #fff7ed; border: 1px solid #fed7aa; padding: 25px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
                <p style="margin: 0 0 15px 0; color: #9a3412; font-weight: 500;">Complete your payment securely via Razorpay</p>
                <a href="${newBooking.paymentLink}" style="background-color: #f97316; color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 10px rgba(249, 115, 22, 0.2);">PAY NOW</a>
                <p style="margin: 15px 0 0 0; font-size: 12px; color: #9a3412; opacity: 0.8;">Supports UPI, Debit/Credit Cards, and Netbanking</p>
              </div>
              ` : ''}

              <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #475569;">Price Breakdown:</p>
                <table style="width: 100%; font-size: 14px; color: #64748b;">
                  <tr><td>Base Price</td><td style="text-align: right;">₹${pricing.basePrice || 0}</td></tr>
                  <tr><td>Additional Charges</td><td style="text-align: right;">₹${pricing.additionalCharges || 0}</td></tr>
                  <tr><td>Tax (GST)</td><td style="text-align: right;">₹${pricing.tax || 0}</td></tr>
                  <tr style="color: #1e293b; font-weight: bold; font-size: 16px;">
                    <td style="padding-top: 10px;">Total</td>
                    <td style="text-align: right; padding-top: 10px; color: #ea580c;">₹${amount}</td>
                  </tr>
                </table>
              </div>
              
              <p style="font-size: 13px; color: #94a3b8; margin-top: 30px; font-style: italic; text-align: center;">
                Please find your formal e-receipt attached as a PDF for your records.
              </p>
            </div>
            <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
              <p style="margin: 0 0 5px 0;"><strong>Engineers Parcel & Haul Pvt Ltd</strong></p>
              <p style="margin: 0;">www.engineersparcel.in | info@engineersparcel.in</p>
              <p style="margin: 10px 0 0 0; opacity: 0.7;">&copy; 2026 Engineers Parcel. All rights reserved.</p>
            </div>
          </div>
        `;

        await sendEmail({
          to: newBooking.senderDetails.email,
          subject: `Booking Confirmation - ${newBooking.bookingId}`,
          html: emailHtml,
          invoicePath: pdfBuffer, // Pass buffer here
          bookingId: newBooking.bookingId
        });
      } catch (emailErr) {
        console.error("Manual Booking Email Error:", emailErr);
      }
    }

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
