const mongoose = require("mongoose")

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    serviceType: {
      type: String,
      required: true,
      enum: ["courier", "shifting", "local", "international", "surface", "air", "express", "premium"],
    },
    senderDetails: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: String,
      address: { type: String, required: true },
      pincode: { type: String, required: true },
      city: String,
      state: String,
      landmark: String,
    },
    receiverDetails: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: String,
      address: { type: String, required: true },
      pincode: { type: String, required: true },
      city: String,
      state: String,
      landmark: String,
    },
    packageDetails: {
      weight: { type: Number, required: true },
      weightUnit: { type: String, enum: ["g", "kg"], default: "g" },
      volumetricWeight: { type: Number },
      chargeableWeight: { type: Number },
      dimensions: {
        length: { type: Number, required: false },
        width: { type: Number, required: false },
        height: { type: Number, required: false },
      },
      boxQuantity: { type: Number, default: 1 },
      description: { type: String, required: false },
      value: { type: Number, required: false },
      fragile: { type: Boolean, default: false },
    },
    pickupPincode: String,
    deliveryPincode: String,
    pickupDate: Date,
    pickupSlot: String,
    deliveryDate: Date,
    status: {
      type: String,
      enum: ["pending", "confirmed", "picked", "in-transit", "out-for-delivery", "delivered", "cancelled"],
      default: "pending",
    },

    estimatedDelivery: {
  type: String, // Can be "3-5 days", "7-10 days", or a date string
  default: null,
},

    // for admin booking
    trackingId: {
      type: String,
      unique: true,
      sparse: true, // Allow null unless manually added
    },
    adminCreated: {
      type: Boolean,
      default: false,
    },
    
    trackingHistory: [
      {
        status: { type: String, default: "No Status" },
        location: { type: String, default: "No Location" },
        description: { type: String, default: "N/A" },
        timestamp: { type: Date, default: Date.now },
      }, 
    ],

    parcelImage: String,
    couponCode: String,
    couponDiscount: { type: Number, default: 0 },
    insuranceRequired: { type: Boolean, default: false },
    pricing: {
      basePrice: Number,
      additionalCharges: Number,
      tax: Number,
      totalAmount: Number,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "online"], // ✅ Allow both
      required: true,
      default: "COD"
    },

    notes: String,
  },
  { timestamps: true },
)

// Generate booking ID
bookingSchema.pre("validate", async function (next) {
  if (!this.bookingId) {
    const count = await mongoose.model("Booking").countDocuments()
    this.bookingId = `EP${Date.now()}${String(count + 1).padStart(4, "0")}`
  }
  next()
})

module.exports = mongoose.model("Booking", bookingSchema)
