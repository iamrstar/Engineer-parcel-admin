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
            enum: ["admin", "agent", "rider", "staff"],
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
    },
    { timestamps: true, collection: "intake_users" }
);

module.exports = mongoose.model("User", userSchema);
