const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: [true, "Please provide a username"],
            unique: true,
        },
        email: {
            type: String,
            unique: true,
            sparse: true,
        },
        phone: {
            type: String,
            unique: true,
            sparse: true,
        },
        password: {
            type: String,
            required: [true, "Please provide a password"],
        },
        role: {
            type: String,
            enum: ["admin", "agent", "rider", "staff", "office_admin"],
            default: "agent",
            required: true,
        },
        name: {
            type: String,
            required: [true, "Please provide a name"],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        plainPassword: {
            type: String,
        },
        permissions: [{
            type: String
        }],
        officeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Office"
        },
        designation: {
            type: String,
            default: "Operations Staff",
        },
        department: {
            type: String,
            default: "Operations",
        },
        joiningDate: {
            type: Date,
        },
        salaryDetails: {
            basicSalary: { type: Number, default: 0 },
            hra: { type: Number, default: 0 },
            conveyanceAllowance: { type: Number, default: 0 },
            specialAllowance: { type: Number, default: 0 },
            medicalAllowance: { type: Number, default: 0 },
            pfDeduction: { type: Number, default: 0 },
            tdsDeduction: { type: Number, default: 0 },
            professionalTax: { type: Number, default: 0 },
            otherDeductions: { type: Number, default: 0 },
        },
        bankDetails: {
            bankName: { type: String, default: "" },
            accountNumber: { type: String, default: "" },
            ifscCode: { type: String, default: "" },
            panNumber: { type: String, default: "" },
            uanNumber: { type: String, default: "" },
        },
    },
    { timestamps: true, collection: "intake_users" }
);

module.exports = mongoose.model("User", userSchema);
