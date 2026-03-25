const express = require("express");
const router = express.Router();
const Vendor = require("../models/Vendor");
const adminAuth = require("../middleware/adminAuth");
const Booking = require("../models/Booking");
const VendorPayment = require("../models/VendorPayment");

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

// SEARCH vendors by ID or Name
router.get("/search/:query", adminAuth, async (req, res) => {
    try {
        const query = req.params.query;
        const vendors = await Vendor.find({
            $or: [
                { name: { $regex: query, $options: "i" } },
                { vendorId: { $regex: query, $options: "i" } },
            ],
        }).limit(10);
        res.json(vendors);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// CREATE vendor
router.post("/", adminAuth, async (req, res) => {
    const vendor = new Vendor(req.body);
    try {
        const newVendor = await vendor.save();
        res.status(201).json(newVendor);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// UPDATE vendor
router.put("/:id", adminAuth, async (req, res) => {
    try {
        const updatedVendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true });
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

        const { month } = req.query; // Format: YYYY-MM
        const query = { 
            vendorId: vendor.vendorId,
            isVendorBooking: true 
        };

        if (month) {
            const startDate = new Date(`${month}-01T00:00:00.000Z`);
            // Create a date for the 1st of the next month
            const year = parseInt(month.split('-')[0]);
            const nextMonth = parseInt(month.split('-')[1]) === 12 ? 1 : parseInt(month.split('-')[1]) + 1;
            const nextYear = parseInt(month.split('-')[1]) === 12 ? year + 1 : year;
            const endDate = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00.000Z`);
            
            query.createdAt = {
                $gte: startDate,
                $lt: endDate
            };
        }

        // Find bookings where vendorId matches the vendor's vendorId (VEND001 etc)
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

// GET financial summary for a vendor (Monthly/Total)
router.get("/:id/finances", adminAuth, async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.params.id);
        if (!vendor) return res.status(404).json({ message: "Vendor not found" });

        const { month } = req.query; // Format: YYYY-MM

        const bookingQuery = { vendorId: vendor.vendorId, isVendorBooking: true };
        const paymentQuery = { vendorId: vendor.vendorId };

        if (month) {
            const startDate = new Date(`${month}-01T00:00:00.000Z`);
            const year = parseInt(month.split('-')[0]);
            const nextMonth = parseInt(month.split('-')[1]) === 12 ? 1 : parseInt(month.split('-')[1]) + 1;
            const nextYear = parseInt(month.split('-')[1]) === 12 ? year + 1 : year;
            const endDate = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00.000Z`);
            
            bookingQuery.createdAt = {
                $gte: startDate,
                $lt: endDate
            };
            
            // For VendorPayment, we already store a exact "month" string e.g. "2026-03"
            paymentQuery.month = month;
        }

        const bookings = await Booking.find(bookingQuery);
        const payments = await VendorPayment.find(paymentQuery);

        const totalDue = bookings.reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0);
        const totalPaidOnOrders = bookings.reduce((sum, b) => sum + (b.vendorPaidAmount || 0), 0);
        const totalBulkPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

        res.json({
            totalDue,
            totalPaidOnOrders,
            totalBulkPayments,
            netBalance: totalDue - (totalPaidOnOrders + totalBulkPayments),
            bookingCount: bookings.length
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
