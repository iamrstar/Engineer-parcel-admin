const express = require("express");
const router = express.Router();
const VendorPayment = require("../models/VendorPayment");
const Vendor = require("../models/Partner"); // using Partner model
const adminAuth = require("../middleware/adminAuth");

// GET all payments for a vendor
router.get("/:vendorId", adminAuth, async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { month, startDate, endDate, filterType } = req.query;

        const query = {
            $or: [
                { vendorId: vendorId },
                { partnerId: vendorId }
            ]
        };

        if (filterType !== 'all') {
            if (startDate && endDate) {
                const start = new Date(`${startDate}T00:00:00.000+05:30`);
                const end = new Date(`${endDate}T23:59:59.999+05:30`);
                if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                    query.paymentDate = { $gte: start, $lte: end };
                }
            } else if (startDate && !endDate) {
                const start = new Date(`${startDate}T00:00:00.000+05:30`);
                const end = new Date(`${startDate}T23:59:59.999+05:30`);
                if (!isNaN(start.getTime())) {
                    query.paymentDate = { $gte: start, $lte: end };
                }
            } else if (month && /^\d{4}-\d{2}$/.test(month)) {
                const [year, m] = month.split('-').map(Number);
                const start = new Date(`${month}-01T00:00:00.000+05:30`);
                const lastDay = new Date(year, m, 0).getDate();
                const lastDayStr = String(lastDay).padStart(2, '0');
                const end = new Date(`${month}-${lastDayStr}T23:59:59.999+05:30`);

                query.$or = [
                    { month: month },
                    { paymentDate: { $gte: start, $lte: end } }
                ];
            }
        }

        const payments = await VendorPayment.find(query).sort({ paymentDate: -1 });
        res.json(payments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// CREATE a new vendor payment (Settlement)
router.post("/", adminAuth, async (req, res) => {
    try {
        const { vendorId, amount, paymentMethod, receivedBy, month, notes, paymentDate } = req.body;
        
        // Verify vendor exists
        const vendor = await Vendor.findOne({ vendorId: vendorId });
        if (!vendor) return res.status(404).json({ message: "Vendor not found" });

        const payment = new VendorPayment({
            vendorId,
            amount,
            paymentMethod,
            receivedBy,
            month: month || new Date().toISOString().substring(0, 7),
            notes,
            paymentDate: paymentDate || Date.now()
        });

        const newPayment = await payment.save();
        res.status(201).json(newPayment);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE a payment record
router.delete("/:id", adminAuth, async (req, res) => {
    try {
        await VendorPayment.findByIdAndDelete(req.params.id);
        res.json({ message: "Payment record deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
