const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Vendor = require("../models/Partner"); // We'll keep the variable Vendor for now so we don't have to rename everything in this file, but require Partner model
const Counter = require("../models/Counter");
const adminAuth = require("../middleware/adminAuth");
const Booking = require("../models/Booking");
const VendorPayment = require("../models/VendorPayment");

// Helper function to parse IST-aware date ranges (UTC+05:30)
function getFilterDateRange(query) {
    const { month, startDate, endDate, filterType } = query;
    if (filterType === 'all') {
        return null;
    }

    // Custom date range
    if (startDate && endDate) {
        const start = new Date(`${startDate}T00:00:00.000+05:30`);
        const end = new Date(`${endDate}T23:59:59.999+05:30`);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            return { start, end, type: 'custom', startDate, endDate };
        }
    } else if (startDate && !endDate) {
        const start = new Date(`${startDate}T00:00:00.000+05:30`);
        const end = new Date(`${startDate}T23:59:59.999+05:30`);
        if (!isNaN(start.getTime())) {
            return { start, end, type: 'custom', startDate, endDate: startDate };
        }
    }

    // Month filter (format: YYYY-MM)
    if (month && /^\d{4}-\d{2}$/.test(month)) {
        const [year, m] = month.split('-').map(Number);
        const start = new Date(`${month}-01T00:00:00.000+05:30`);
        const lastDay = new Date(year, m, 0).getDate();
        const lastDayStr = String(lastDay).padStart(2, '0');
        const end = new Date(`${month}-${lastDayStr}T23:59:59.999+05:30`);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            return { start, end, type: 'month', month };
        }
    }

    return null;
}

// GET all vendors
router.get("/", adminAuth, async (req, res) => {
    try {
        const vendors = await Vendor.find().sort({ createdAt: -1 });
        res.json(vendors);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET single vendor
router.get("/:id", adminAuth, async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) return res.status(404).json({ message: "Vendor not found" });
        res.json(vendor);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// SEARCH vendors - Empty query returns recent vendors
router.get("/search", adminAuth, async (req, res) => {
    try {
        const vendors = await Vendor.find().sort({ createdAt: -1 }).limit(20);
        res.json(vendors);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// SEARCH vendors by ID, Name, Phone, City, or Email
router.get("/search/:query", adminAuth, async (req, res) => {
    try {
        const query = req.params.query;
        const vendors = await Vendor.find({
            $or: [
                { name: { $regex: query, $options: "i" } },
                { partnerId: { $regex: query, $options: "i" } },
                { phone: { $regex: query, $options: "i" } },
                { city: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } },
                { gstNumber: { $regex: query, $options: "i" } },
            ],
        }).limit(20);
        res.json(vendors);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// CREATE vendor
router.post("/", adminAuth, async (req, res) => {
    try {
        const data = { ...req.body };
        
        if (data.password) {
            const salt = await bcrypt.genSalt(10);
            data.password = await bcrypt.hash(data.password, salt);
        }

        // Auto-generate API key if not provided
        if (!data.apiKey) {
            data.apiKey = "ep_live_" + require('crypto').randomBytes(16).toString('hex');
        }

        if (!data.partnerId) {
            // Find highest existing PAT ID to guarantee contiguous numbering without skipping
            const lastPartner = await Vendor.findOne({ partnerId: /^PAT\d+$/ })
                .sort({ partnerId: -1 })
                .collation({ locale: "en_US", numericOrdering: true });
                
            let maxSeq = 0;
            if (lastPartner && lastPartner.partnerId) {
                const lastIdStr = lastPartner.partnerId.replace('PAT', '');
                const lastIdNum = parseInt(lastIdStr, 10);
                if (!isNaN(lastIdNum)) {
                    maxSeq = lastIdNum;
                }
            }

            const nextSeq = maxSeq + 1;
            data.partnerId = `PAT${String(nextSeq).padStart(4, '0')}`;

            // Keep Counter synchronized
            await Counter.findOneAndUpdate(
                { id: "partnerId" },
                { $set: { seq: nextSeq } },
                { upsert: true }
            );
        }
        
        if (!data.vendorId && data.partnerId) {
            data.vendorId = data.partnerId;
        }

        const vendor = new Vendor(data);
        const newVendor = await vendor.save();
        res.status(201).json(newVendor);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// UPDATE vendor
router.put("/:id", adminAuth, async (req, res) => {
    try {
        let updateData = { ...req.body };
        let updateQuery = { $set: updateData };

        if (updateData.password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(updateData.password, salt);
        } else {
            // Remove password from update if it's empty to prevent un-setting it
            delete updateData.password;
        }

        if (updateData.apiKey === "") {
            delete updateData.apiKey;
            updateQuery.$unset = { apiKey: 1 };
        }

        const updatedVendor = await Vendor.findByIdAndUpdate(req.params.id, updateQuery, { new: true });
        res.json(updatedVendor);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE vendor
// GET all orders for a specific vendor
router.get("/:id/orders", adminAuth, async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) return res.status(404).json({ message: "Vendor not found" });

        const partnerIds = [vendor.partnerId, vendor.vendorId, String(vendor._id)].filter(Boolean);
        const query = {
            $or: [
                { partnerId: { $in: partnerIds } },
                { vendorId: { $in: partnerIds } }
            ]
        };

        const range = getFilterDateRange(req.query);
        if (range) {
            query.createdAt = {
                $gte: range.start,
                $lte: range.end
            };
        }

        const bookings = await Booking.find(query).sort({ createdAt: -1 });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// UPDATE payment details for a specific vendor order
router.put("/order/:orderId/payment", adminAuth, async (req, res) => {
    try {
        const { vendorPaidAmount, vendorPaymentMethod, vendorReceivedBy, vendorPaymentDate, totalAmount, newPaymentAmount } = req.body;
        
        const booking = await Booking.findById(req.params.orderId);
        if (!booking) return res.status(404).json({ message: "Order not found" });

        // Update amounts
        if (totalAmount !== undefined) {
            booking.pricing.totalAmount = totalAmount;
        }
        
        booking.vendorPaidAmount = vendorPaidAmount;
        booking.vendorPaymentMethod = vendorPaymentMethod;
        booking.vendorReceivedBy = vendorReceivedBy;
        booking.vendorPaymentDate = vendorPaymentDate || Date.now();
        
        // Determine status
        const due = (totalAmount || booking.pricing.totalAmount) - vendorPaidAmount;
        if (due <= 0) {
            booking.vendorPaymentStatus = "Paid";
        } else if (vendorPaidAmount > 0) {
            booking.vendorPaymentStatus = "Partially Paid";
        } else {
            booking.vendorPaymentStatus = "Pending";
        }

        // Log payment history if there is a new payment
        if (newPaymentAmount && Number(newPaymentAmount) > 0) {
            if (!booking.vendorPaymentHistory) {
                booking.vendorPaymentHistory = [];
            }
            booking.vendorPaymentHistory.push({
                amount: Number(newPaymentAmount),
                method: vendorPaymentMethod,
                receivedBy: vendorReceivedBy,
                date: vendorPaymentDate || Date.now(),
                notes: "Incremental Payment Added"
            });
        }

        await booking.save();
        res.json(booking);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// EDIT a specific payment history record for an order
router.put("/order/:orderId/history/:historyId", adminAuth, async (req, res) => {
    try {
        const { amount, method, receivedBy, date } = req.body;
        const booking = await Booking.findById(req.params.orderId);
        if (!booking) return res.status(404).json({ message: "Order not found" });

        const historyItem = booking.vendorPaymentHistory.id(req.params.historyId);
        if (!historyItem) return res.status(404).json({ message: "History record not found" });

        if (amount !== undefined) historyItem.amount = Number(amount);
        if (method !== undefined) historyItem.method = method;
        if (receivedBy !== undefined) historyItem.receivedBy = receivedBy;
        if (date !== undefined) historyItem.date = date;

        // Recalculate total vendorPaidAmount based on history
        booking.vendorPaidAmount = booking.vendorPaymentHistory.reduce((sum, item) => sum + item.amount, 0);

        // Update status
        const due = (booking.pricing.totalAmount || 0) - booking.vendorPaidAmount;
        if (due <= 0) {
            booking.vendorPaymentStatus = "Paid";
        } else if (booking.vendorPaidAmount > 0) {
            booking.vendorPaymentStatus = "Partially Paid";
        } else {
            booking.vendorPaymentStatus = "Pending";
        }

        await booking.save();
        res.json(booking);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE a specific payment history record for an order
router.delete("/order/:orderId/history/:historyId", adminAuth, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.orderId);
        if (!booking) return res.status(404).json({ message: "Order not found" });

        booking.vendorPaymentHistory.pull(req.params.historyId);

        // Recalculate total vendorPaidAmount based on history
        booking.vendorPaidAmount = booking.vendorPaymentHistory.reduce((sum, item) => sum + item.amount, 0);

        // Update status
        const due = (booking.pricing.totalAmount || 0) - booking.vendorPaidAmount;
        if (due <= 0) {
            booking.vendorPaymentStatus = "Paid";
        } else if (booking.vendorPaidAmount > 0) {
            booking.vendorPaymentStatus = "Partially Paid";
        } else {
            booking.vendorPaymentStatus = "Pending";
        }

        await booking.save();
        res.json(booking);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET financial summary for a vendor (Monthly/Custom/Total)
router.get("/:id/finances", adminAuth, async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) return res.status(404).json({ message: "Vendor not found" });

        const partnerIds = [vendor.partnerId, vendor.vendorId, String(vendor._id)].filter(Boolean);
        const bookingQuery = {
            $or: [
                { partnerId: { $in: partnerIds } },
                { vendorId: { $in: partnerIds } }
            ]
        };

        const paymentQuery = {
            $or: [
                { vendorId: { $in: partnerIds } },
                { partnerId: { $in: partnerIds } }
            ]
        };

        const range = getFilterDateRange(req.query);
        if (range) {
            bookingQuery.createdAt = {
                $gte: range.start,
                $lte: range.end
            };

            if (range.type === 'month') {
                paymentQuery.$or = [
                    { month: range.month },
                    { paymentDate: { $gte: range.start, $lte: range.end } }
                ];
            } else if (range.type === 'custom') {
                paymentQuery.paymentDate = {
                    $gte: range.start,
                    $lte: range.end
                };
            }
        }

        const bookings = await Booking.find(bookingQuery);
        const payments = await VendorPayment.find(paymentQuery);

        const totalDue = bookings.reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0);
        const totalPaidOnOrders = bookings.reduce((sum, b) => sum + (b.vendorPaidAmount || 0), 0);
        const totalBulkPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

        // All-Time Summary for reference
        const allTimeBookings = await Booking.find({
            $or: [
                { partnerId: { $in: partnerIds } },
                { vendorId: { $in: partnerIds } }
            ]
        });
        const allTimePayments = await VendorPayment.find({
            $or: [
                { vendorId: { $in: partnerIds } },
                { partnerId: { $in: partnerIds } }
            ]
        });

        const allTimeTotalDue = allTimeBookings.reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0);
        const allTimePaidOnOrders = allTimeBookings.reduce((sum, b) => sum + (b.vendorPaidAmount || 0), 0);
        const allTimeBulkPayments = allTimePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        res.json({
            totalDue,
            totalPaidOnOrders,
            totalBulkPayments,
            netBalance: totalDue - (totalPaidOnOrders + totalBulkPayments),
            bookingCount: bookings.length,
            filterRange: range ? {
                start: range.start,
                end: range.end,
                type: range.type,
                label: range.type === 'month' ? range.month : `${range.startDate} to ${range.endDate}`
            } : { type: 'all', label: 'All Time' },
            allTime: {
                totalDue: allTimeTotalDue,
                totalPaid: allTimePaidOnOrders + allTimeBulkPayments,
                netBalance: allTimeTotalDue - (allTimePaidOnOrders + allTimeBulkPayments),
                bookingCount: allTimeBookings.length
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete("/:id", adminAuth, async (req, res) => {
    try {
        await Vendor.findByIdAndDelete(req.params.id);
        res.json({ message: "Vendor deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
