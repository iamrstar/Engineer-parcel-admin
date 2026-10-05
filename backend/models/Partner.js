const mongoose = require("mongoose");

const partnerSchema = new mongoose.Schema({
    partnerId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    vendorId: {
        type: String,
        trim: true,
        sparse: true,
    },
    // API Authentication for E-commerce Partners
    apiKey: {
        type: String,
        unique: true,
        sparse: true, // Allows null if some partners don't use the API
    },
    apiSecretHash: {
        type: String,
    },
    password: {
        type: String,
        select: false, // Don't return by default
    },
    pricePerKg: {
        type: Number,
        default: 0,
    },
    webhookUrl: {
        type: String,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
    },
    gstNumber: {
        type: String,
        trim: true,
        uppercase: true,
    },
    address: {
        type: String,
        required: true,
    },
    address2: {
        type: String,
    },
    city: {
        type: String,
        required: true,
    },
    state: {
        type: String,
        required: true,
    },
    pincode: {
        type: String,
        required: true,
    },
    landmark: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("Partner", partnerSchema, "vendors"); // Keeping 'vendors' collection name to prevent data loss
