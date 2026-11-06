const mongoose = require("mongoose");

const salarySlipSchema = new mongoose.Schema(
    {
        slipNumber: {
            type: String,
            required: true,
            unique: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        employeeName: { type: String, required: true },
        employeeEmail: { type: String },
        employeePhone: { type: String },
        designation: { type: String, default: "Operations Staff" },
        department: { type: String, default: "Operations" },
        joiningDate: { type: Date },

        month: { type: String, required: true }, // Format: "YYYY-MM", e.g. "2026-10"
        payPeriod: { type: String, required: true }, // e.g. "October 2026"
        payDate: { type: Date, default: Date.now },

        workingDays: { type: Number, default: 30 },
        paidDays: { type: Number, default: 30 },
        lossOfPayDays: { type: Number, default: 0 },

        earnings: [
            {
                name: { type: String, required: true },
                amount: { type: Number, required: true, default: 0 },
            }
        ],
        deductions: [
            {
                name: { type: String, required: true },
                amount: { type: Number, required: true, default: 0 },
            }
        ],

        grossEarnings: { type: Number, required: true, default: 0 },
        totalDeductions: { type: Number, required: true, default: 0 },
        netPay: { type: Number, required: true, default: 0 },
        netPayInWords: { type: String },

        bankDetails: {
            bankName: { type: String, default: "" },
            accountNumber: { type: String, default: "" },
            ifscCode: { type: String, default: "" },
            panNumber: { type: String, default: "" },
            uanNumber: { type: String, default: "" },
        },

        status: {
            type: String,
            enum: ["Draft", "Released", "Emailed"],
            default: "Released",
        },
        emailSent: { type: Boolean, default: false },
        emailedAt: { type: Date },
        notes: { type: String },
        releasedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("SalarySlip", salarySlipSchema);

