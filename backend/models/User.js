const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema(
    {
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
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ["admin", "agent", "rider", "staff"],
            default: "rider",
            required: true,
        },
        designation: {
            type: String,
            default: "",
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        id: {
            type: Number,
            unique: true,
            sparse: true,
        },
        username: {
            type: String,
            unique: true,
            sparse: true,
        },
        plainPassword: {
            type: String,
        },
    },
    { timestamps: true, collection: 'intake_users' }
)

// Hash password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next()
    this.password = await bcrypt.hash(this.password, 10)
    next()
})

// Compare password method
userSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password)
}

module.exports = mongoose.model("User", userSchema)
