const express = require("express");
const router = express.Router();
const exceljs = require("exceljs");
const Razorpay = require("razorpay");

const IntakeBooking = require("../models/IntakeBooking");
const Booking = require("../models/Booking");
const adminAuth = require("../middleware/adminAuth");
const sendEmail = require("../utils/sendEmail");

// Initialize Razorpay (Requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env)
let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
}

// -----------------------------------------
// GET /api/intake
// Fetch all intake bookings (Admin view)
// -----------------------------------------
router.get("/", adminAuth, async (req, res) => {
    try {
        const { date } = req.query;
        let query = {};

        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            // Be inclusive of timezone differences
            const safeStart = new Date(start);
            safeStart.setDate(safeStart.getDate() - 1);

            const end = new Date(date);
            end.setHours(23, 59, 59, 999);

            query.createdAt = { $gte: safeStart, $lte: end };
        }

        const bookings = await IntakeBooking.find(query).sort({ createdAt: -1 });
        res.json(bookings);
    } catch (error) {
        console.error("Error fetching intake bookings:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// -----------------------------------------
// POST /api/intake/verify
// Verify, update pricing, lock details, send payment link
// -----------------------------------------
router.post("/verify", adminAuth, async (req, res) => {
    try {
        const { bookingId, pricing, senderDetails, receiverDetails, packageDetails, serviceType, premiumItemType, trackingId } = req.body;

        if (!bookingId || !pricing) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const booking = await IntakeBooking.findOne({ bookingId });
        if (!booking) {
            return res.status(404).json({ message: "Intake Booking not found" });
        }

        if (senderDetails) booking.senderDetails = senderDetails;
        if (receiverDetails) booking.receiverDetails = receiverDetails;
        if (packageDetails) booking.packageDetails = packageDetails;
        if (serviceType) booking.serviceType = serviceType;
        if (premiumItemType) booking.premiumItemType = premiumItemType;
        if (trackingId) booking.trackingId = trackingId;

        booking.pricing = pricing;
        booking.status = "Verified - Payment Pending";
        booking.adminVerified = true;

        // Generate Payment Link
        if (pricing.totalAmount > 0 && razorpay) {
            try {
                const paymentLink = await razorpay.paymentLink.create({
                    amount: pricing.totalAmount * 100, // Paise
                    currency: "INR",
                    accept_partial: false,
                    description: `Payment for Shipment ${booking.trackingId}`,
                    customer: {
                        name: booking.senderDetails.name,
                        email: booking.senderDetails.email || "info@engineersparcel.com",
                        contact: booking.senderDetails.phone
                    },
                    notify: { sms: true, email: true },
                    reminder_enable: true,
                    notes: {
                        bookingId: booking.bookingId,
                        trackingId: booking.trackingId
                    }
                });

                if (paymentLink && booking.senderDetails?.email) {
                    // Send simpler manual payment request email logic
                    const emailHtml = `
            <h2>Payment Requested</h2>
            <p>Dear ${booking.senderDetails.name},</p>
            <p>Your booking <b>${booking.trackingId}</b> has been verified.</p>
            <p>Total Amount: ₹${pricing.totalAmount}</p>
            <p><a href="${paymentLink.short_url}" style="padding:10px 20px; background:#FF6600; color:#fff; text-decoration:none; border-radius:5px;">Pay Now</a></p>
          `;
                    await sendEmail({
                        to: booking.senderDetails.email,
                        subject: `Payment Request - ${booking.trackingId}`,
                        html: emailHtml
                    });
                }
            } catch (paymentErr) {
                console.error("Razorpay Link Error:", paymentErr);
            }
        }

        await booking.save();
        res.json({ message: "Booking verified successfully." });
    } catch (error) {
        console.error("Error verifying intake booking:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// -----------------------------------------
// POST /api/intake/seed
// Seed verified bookings to main system
// -----------------------------------------
router.post("/seed", adminAuth, async (req, res) => {
    try {
        const { date } = req.query;
        let query = { adminVerified: true, seededToMainDashboard: false };

        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const safeStart = new Date(start);
            safeStart.setDate(safeStart.getDate() - 1);

            const end = new Date(date);
            end.setHours(23, 59, 59, 999);

            query.createdAt = { $gte: safeStart, $lte: end };
        }

        const toSeed = await IntakeBooking.find(query);

        if (toSeed.length === 0) {
            return res.json({ message: "No new verified bookings to seed for this date.", count: 0 });
        }

        let count = 0;

        for (const doc of toSeed) {
            // Transform doc to match Main Dashboard Schema
            const payload = {
                bookingId: doc.trackingId,
                trackingId: doc.trackingId,
                serviceType: doc.serviceType.toLowerCase(),
                senderDetails: doc.senderDetails,
                receiverDetails: doc.receiverDetails,
                packageDetails: doc.packageDetails,
                pickupPincode: doc.senderDetails.pincode,
                deliveryPincode: doc.receiverDetails.pincode,
                pickupDate: doc.pickupDate || new Date(),
                pickupSlot: doc.pickupSlot || "Anytime",
                deliveryDate: doc.deliveryDate,
                estimatedDelivery: doc.estimatedDelivery,
                status: "confirmed",
                adminCreated: true,
                parcelImage: doc.parcelImage || "https://via.placeholder.com/150",
                couponCode: doc.couponCode || "",
                couponDiscount: doc.couponDiscount || 0,
                insuranceRequired: doc.insuranceRequired || false,
                pricing: doc.pricing,
                paymentStatus: doc.paymentStatus,
                paymentMethod: doc.paymentMethod,
                notes: doc.notes || "Imported from Agent Intake",
                trackingHistory: [{
                    status: "confirmed",
                    location: doc.senderDetails.city || "Hub",
                    timestamp: new Date(),
                    description: "Booking verified and seeded from Intake System"
                }],
            };

            try {
                await Booking.updateOne(
                    { bookingId: payload.bookingId },
                    { $set: payload },
                    { upsert: true }
                );

                // Mark as seeded in Intake
                doc.seededToMainDashboard = true;
                doc.seededAt = new Date();
                await doc.save();

                count++;
            } catch (e) {
                console.error("Failed to seed", payload.bookingId, e);
            }
        }

        res.json({ message: "Seeding complete", count });
    } catch (error) {
        console.error("Error seeding intake bookings:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// -----------------------------------------
// GET /api/intake/excel
// Download Excel Export
// -----------------------------------------
router.get("/excel", adminAuth, async (req, res) => {
    try {
        const { date } = req.query;
        let query = {};
        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            query = { createdAt: { $gte: start, $lte: end } };
        }

        const bookings = await IntakeBooking.find(query).sort({ createdAt: 1 });

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Bookings');

        worksheet.columns = [
            { header: 'Booking ID', key: 'bookingId', width: 15 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Service Type', key: 'serviceType', width: 15 },
            { header: 'Sender Name', key: 'senderName', width: 20 },
            { header: 'Sender Address', key: 'senderAddress', width: 30 },
            { header: 'Sender Pincode', key: 'senderPincode', width: 10 },
            { header: 'Receiver Name', key: 'receiverName', width: 20 },
            { header: 'Receiver Address', key: 'receiverAddress', width: 30 },
            { header: 'Receiver Pincode', key: 'receiverPincode', width: 10 },
            { header: 'Weight', key: 'weight', width: 10 },
            { header: 'Boxes', key: 'boxes', width: 8 },
            { header: 'Value', key: 'value', width: 12 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Admin Verified', key: 'verified', width: 12 },
            { header: 'Total Amount', key: 'amount', width: 12 },
            { header: 'Agent', key: 'agent', width: 15 },
            { header: 'Notes', key: 'notes', width: 20 },
        ];

        bookings.forEach((b) => {
            worksheet.addRow({
                bookingId: b.trackingId,
                date: b.createdAt.toISOString().split('T')[0],
                serviceType: b.serviceType,
                senderName: b.senderDetails?.name,
                senderAddress: b.senderDetails?.address1 || b.senderDetails?.address,
                senderPincode: b.senderDetails?.pincode,
                receiverName: b.receiverDetails?.name,
                receiverAddress: b.receiverDetails?.address1 || b.receiverDetails?.address,
                receiverPincode: b.receiverDetails?.pincode,
                weight: `${b.packageDetails?.weight} ${b.packageDetails?.weightUnit}`,
                boxes: b.packageDetails?.boxQuantity,
                value: b.packageDetails?.value,
                status: b.status,
                verified: b.adminVerified ? 'Yes' : 'No',
                amount: b.pricing?.totalAmount || 0,
                agent: b.agentUsername || 'Unknown',
                notes: b.notes,
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="bookings-${date || 'all'}.xlsx"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("Error exporting excel:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
