const express = require("express");
const router = express.Router();
const VendorPayment = require("../models/VendorPayment");
const Vendor = require("../models/Vendor");
const adminAuth = require("../middleware/adminAuth");

// GET all payments for a vendor
router.get("/:vendorId", adminAuth, async (req, res) => {
    try {
        const { month } = req.query;
        const query = { vendorId: req.params.vendorId };
        if (month) {
            query.month = month;
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
