const express = require("express");
const router = express.Router();
const exceljs = require("exceljs");
const { generateReceiptPDF } = require("../utils/pdfReceipt");
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
        const { date, vendorNotAssigned } = req.query;
        let query = {};

        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }

        if (vendorNotAssigned === "true") {
            query.$or = [
                { vendorName: { $exists: false } },
                { vendorName: "" },
                { vendorName: null }
            ];
        }

        const bookings = await IntakeBooking.find(query).sort({ createdAt: -1 }).lean();

        // Check which of these are already in the main Booking collection
        const trackingIds = bookings.map(b => b.trackingId).filter(Boolean);
        const existingTrackings = await Booking.find({ trackingId: { $in: trackingIds } }, { trackingId: 1 }).lean();
        const existingSet = new Set(existingTrackings.map(b => b.trackingId));

        const enrichedBookings = bookings.map(b => ({
            ...b,
            presentInMainDashboard: existingSet.has(b.trackingId)
        }));

        res.json(enrichedBookings);
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
        const { 
            bookingId, pricing, senderDetails, receiverDetails, packageDetails, 
            serviceType, premiumItemType, trackingId, vendorName, 
            vendorTrackingId, estimatedDelivery, insuranceRequired, notes 
        } = req.body;

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
        if (vendorName) booking.vendorName = vendorName;
        if (vendorTrackingId) booking.vendorTrackingId = vendorTrackingId;
        if (typeof insuranceRequired !== 'undefined') booking.insuranceRequired = insuranceRequired;
        if (typeof notes !== 'undefined') booking.notes = notes;

        booking.pricing = pricing;
        booking.status = "Verified - Payment Pending";
        if (estimatedDelivery) booking.estimatedDelivery = estimatedDelivery;
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
                        contact: /^(\d)\1{9}$/.test(booking.senderDetails.phone) ? "" : (booking.senderDetails.phone || "")
                    },
                    notify: { sms: true, email: true },
                    reminder_enable: true,
                    notes: {
                        bookingId: booking.bookingId,
                        trackingId: booking.trackingId
                    }
                });

                if (paymentLink) {
                    booking.paymentLink = paymentLink.short_url;
                }

                if (paymentLink && booking.senderDetails?.email) {
                    const amount = pricing.totalAmount || 0;
                    const emailHtml = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #166534; color: white; padding: 20px; text-align: center;">
                        <h2 style="margin:0;">Order Verified & Ready</h2>
                    </div>
                    <div style="padding: 20px;">
                        <p>Hi ${booking.senderDetails.name},</p>
                        <p>Your shipment <strong>${booking.trackingId}</strong> has been verified and priced.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <h1 style="color: #166534; font-size: 2.5em; margin: 0;">₹${amount}</h1>
                            <p style="color: #64748b; margin-top: 5px;">Total Payable Amount</p>
                        </div>

                        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 6px; text-align: center;">
                            <p style="margin-bottom: 15px;">Pay securely via <strong>Razorpay</strong> (UPI, Cards, Netbanking)</p>
                            
                            <a href="${paymentLink.short_url}" style="background-color: #166534; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">PAY NOW</a>
                            <p style="font-size: 0.8em; margin-top: 10px; color: #64748b;">Or check your portal.</p>
                        </div>

                        <div style="margin-top: 20px; font-size: 0.9em; border-top: 1px solid #eee; padding-top: 15px;">
                            ${booking.estimatedDelivery ? `<p style="color: #166534; font-weight: bold; margin-bottom: 15px;">📅 Estimated Delivery: ${booking.estimatedDelivery}</p>` : ''}
                            <p><strong>Breakdown:</strong></p>
                            <ul style="list-style: none; padding: 0;">
                                <li style="margin-bottom: 5px;">Base Price: ₹${pricing.basePrice}</li>
                                <li style="margin-bottom: 5px;">Packaging/Extras: ₹${pricing.packagingCharge}</li>
                                <li style="margin-bottom: 5px;">Tax: ₹${pricing.tax}</li>
                                <li style="margin-top: 10px; border-top: 1px solid #eee; padding-top: 5px;"><strong>Total: ₹${amount}</strong></li>
                            </ul>
                        </div>
                    </div>
                     <div style="background-color: #f1f5f9; padding: 10px; text-align: center; font-size: 0.8em; color: #64748b;">
                        &copy; 2026 Engineers Parcel. All rights reserved.
                    </div>
                </div>
                    `;
                    await sendEmail({
                        to: booking.senderDetails.email,
                        subject: `Invoice & Payment - ${booking.trackingId}`,
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
        const { ids } = req.body;

        let query = { adminVerified: true };

        if (ids && Array.isArray(ids) && ids.length > 0) {
            query.bookingId = { $in: ids };
        } else if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const safeStart = new Date(start);
            safeStart.setDate(safeStart.getDate() - 1);

            const end = new Date(date);
            end.setHours(23, 59, 59, 999);

            query.createdAt = { $gte: safeStart, $lte: end };
        } else {
            return res.status(400).json({ message: "No selection or date provided for sync." });
        }

        const candidates = await IntakeBooking.find(query);
        
        // Filter out candidates that are already present in the main Booking collection
        const candTrackingIds = candidates.map(c => c.trackingId).filter(Boolean);
        const existingTrackings = await Booking.find({ trackingId: { $in: candTrackingIds } }, { trackingId: 1 }).lean();
        const existingSet = new Set(existingTrackings.map(b => b.trackingId));

        const toSeed = candidates.filter(c => !existingSet.has(c.trackingId));

        if (toSeed.length === 0) {
            return res.json({ message: "No new or missing verified bookings to sync.", count: 0 });
        }

        let count = 0;

        for (const doc of toSeed) {
            // Transform doc to match Main Dashboard Schema
            const senderAddr = doc.senderDetails.address || [doc.senderDetails.address1, doc.senderDetails.address2].filter(Boolean).join(", ");
            const receiverAddr = doc.receiverDetails.address || [doc.receiverDetails.address1, doc.receiverDetails.address2].filter(Boolean).join(", ");

            // Look up EDL and KM for the delivery pincode
            let edl = 0;
            let km = 0;
            try {
                const Pincode = require("../models/Pincode");
                const pinData = await Pincode.findOne({ pincode: doc.receiverDetails.pincode });
                if (pinData) {
                    edl = pinData.edl || 0;
                    km = pinData.km || 0;
                }
            } catch (pinErr) {
                console.error("Error fetching pincode data during seeding:", pinErr);
            }

            const payload = {
                bookingId: doc.trackingId,
                trackingId: doc.trackingId,
                serviceType: doc.serviceType.toLowerCase(),
                edl,
                km,
                senderDetails: {
                    name: doc.senderDetails.name,
                    phone: doc.senderDetails.phone,
                    email: doc.senderDetails.email,
                    address: senderAddr || "N/A",
                    pincode: doc.senderDetails.pincode,
                    city: doc.senderDetails.city,
                    state: doc.senderDetails.state,
                    landmark: doc.senderDetails.landmark,
                },
                receiverDetails: {
                    name: doc.receiverDetails.name,
                    phone: doc.receiverDetails.phone,
                    email: doc.receiverDetails.email,
                    address: receiverAddr || "N/A",
                    pincode: doc.receiverDetails.pincode,
                    city: doc.receiverDetails.city,
                    state: doc.receiverDetails.state,
                    landmark: doc.receiverDetails.landmark,
                },
                packageDetails: {
                    weight: doc.packageDetails.weight,
                    weightUnit: doc.packageDetails.weightUnit,
                    volumetricWeight: doc.packageDetails.volumetricWeight,
                    chargeableWeight: doc.packageDetails.chargeableWeight,
                    dimensions: doc.packageDetails.dimensions,
                    boxQuantity: doc.packageDetails.boxQuantity,
                    description: doc.packageDetails.description || "N/A",
                    value: doc.packageDetails.value || 0,
                    fragile: doc.packageDetails.fragile,
                    isEdl: doc.packageDetails.isEdl,
                    edlItems: doc.packageDetails.edlItems,
                    edlContents: doc.packageDetails.edlContents,
                    otherContentText: doc.packageDetails.otherContentText,
                },
                pickupPincode: doc.senderDetails.pincode,
                deliveryPincode: doc.receiverDetails.pincode,
                pickupMethod: doc.pickupMethod || "hub",
                pickupDate: doc.pickupDate || new Date(),
                pickupSlot: doc.pickupSlot || "Anytime",
                boxDeliveryType: doc.boxDeliveryType || "self",
                boxDeliveryDate: doc.boxDeliveryDate,
                boxDeliverySlot: doc.boxDeliverySlot,
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
                currentLocation: `${doc.senderDetails.address1 || doc.senderDetails.address || "Hub"}${doc.senderDetails.landmark ? ', ' + doc.senderDetails.landmark : ''}`,
                trackingHistory: [{
                    status: "confirmed",
                    location: `${doc.senderDetails.address1 || doc.senderDetails.address || "Hub"}${doc.senderDetails.landmark ? ', ' + doc.senderDetails.landmark : ''}`,
                    timestamp: new Date(),
                    description: "Booking Verified and Shipment Booked Successfully"
                }],
            };

            try {
                await Booking.updateOne(
                    { bookingId: payload.bookingId },
                    { $set: payload },
                    { upsert: true }
                );

                // Increment Coupon Usage Count if code exists
                if (payload.couponCode) {
                    try {
                        const Coupon = require("../models/Coupon");
                        await Coupon.updateOne(
                            { code: payload.couponCode.toUpperCase() },
                            { $inc: { usedCount: 1 } }
                        );
                        console.log(`✅ Coupon ${payload.couponCode} usage incremented`);
                    } catch (couponErr) {
                        console.error("Failed to increment coupon count:", couponErr);
                    }
                }

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

// -----------------------------------------
// GET /api/intake/receipt
// Generate PDF receipt for a verified intake booking
// -----------------------------------------
router.get("/receipt", adminAuth, async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) return res.status(400).json({ message: "Tracking ID is required" });

        // Search in IntakeBooking first, then Booking (checking both trackingId and bookingId fields)
        let booking = await IntakeBooking.findOne({
            $or: [{ trackingId: id }, { bookingId: id }]
        });
        if (!booking) {
            booking = await Booking.findOne({
                $or: [{ trackingId: id }, { bookingId: id }]
            });
        }

        if (!booking) return res.status(404).json({ message: "Booking not found" });

        // Ensure paymentLink exists for QR code if it's pending (case-insensitive check)
        const status = (booking.status || "").toLowerCase();
        if (!booking.paymentLink && (status.includes("pending") || status.includes("verified"))) {
            const amount = booking.pricing?.totalAmount || 0;
            if (amount > 0 && razorpay) {
                try {
                    const idToUse = booking.trackingId || booking.bookingId;
                    const paymentLink = await razorpay.paymentLink.create({
                        amount: Math.round(amount * 100), // paise
                        currency: "INR",
                        accept_partial: false,
                        description: `Payment for Shipment ${idToUse}`,
                        customer: {
                            name: booking.senderDetails?.name || "Customer",
                            email: booking.senderDetails?.email || "info@engineersparcel.com",
                            contact: /^(\d)\1{9}$/.test(booking.senderDetails?.phone) ? "" : (booking.senderDetails?.phone || "")
                        },
                        notify: { sms: false, email: false }, // Don't spam them again if just downloading receipt
                        reminder_enable: true,
                        notes: {
                            bookingId: idToUse
                        }
                    });
                    if (paymentLink) {
                        await booking.constructor.findByIdAndUpdate(booking._id, { $set: { paymentLink: paymentLink.short_url } }, { runValidators: false });
                    }
                } catch (linkErr) {
                    console.error("Delayed Link Gen Error:", linkErr);
                }
            }
        }

        const { receipt, label, declaration } = req.query;
        const { generateCombinedPDF } = require("../utils/pdfReceipt");
        const pdfBuffer = await generateCombinedPDF(booking, { receipt, label, declaration });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Booking_${id}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error("Failed to generate receipt:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
