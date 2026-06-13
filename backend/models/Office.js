const mongoose = require("mongoose");

const officeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Please provide an office name"],
            unique: true,
        },
        code: {
            type: String,
            required: [true, "Please provide an office code"],
            unique: true,
        },
        address: {
            type: String,
        },
        contactNumber: {
            type: String,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        bookingPrefix: {
            type: String,
            default: "EP",
        },
        bookingIdStart: {
            type: Number,
            default: 4600,
        },
        adminUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        enableMailService: {
            type: Boolean,
            default: true,
        },
        enableDeliveryEmail: {
            type: Boolean,
            default: true,
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Office", officeSchema);
