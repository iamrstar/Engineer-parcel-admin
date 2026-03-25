const mongoose = require("mongoose");

const vendorPaymentSchema = new mongoose.Schema({
    vendorId: { 
        type: String, 
        required: true,
        index: true 
    },
    amount: { 
        type: Number, 
        required: true 
    },
    paymentDate: { 
        type: Date, 
        default: Date.now 
    },
    paymentMethod: { 
        type: String, 
        required: true,
        enum: ["Cash", "UPI", "Bank Transfer", "Cheque", "Other"]
    },
    receivedBy: { 
        type: String, 
        required: true // Name or ID of admin who received the payment
    },
    month: { 
        type: String, // e.g. "2024-03" for grouping
        required: true
    },
    notes: { 
        type: String 
    }
}, { timestamps: true });

module.exports = mongoose.model("VendorPayment", vendorPaymentSchema);
