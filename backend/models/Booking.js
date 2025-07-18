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
  
bookingSource: {
  type: String,
  enum: ["user", "admin"],
  default: "admin",
} 
,
    packageDetails: {
      weight: { type: Number, required: true },
      weightUnit: { type: String, enum: ["g", "kg"], default: "g" },
      volumetricWeight: Number,
      dimensions: {
        length: Number,
        width: Number,
        height: Number,
      },
      description: String,
      value: Number,
      fragile: Boolean,
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
    trackingHistory: [
      {
        status: String,
        location: String,
        timestamp: { type: Date, default: Date.now },
        description: String,
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
    estimatedDelivery: { type: Date },
currentLocation: { type: String },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "Online"],
      default: "COD",
    },
    notes: String,
  },
  { timestamps: true },
)

// Generate booking ID
bookingSchema.pre("save", async function (next) {
  // Don't override if bookingId is already set
  if (this.isNew && (!this.bookingId || this.bookingId.trim() === "")) {
    let isUnique = false
    let newId = ""

    while (!isUnique) {
      const randomId = `AD${Math.floor(100000 + Math.random() * 900000)}`
      const existing = await mongoose.model("Booking").findOne({ bookingId: randomId })
      if (!existing) {
        newId = randomId
        isUnique = true
      }
    }

    this.bookingId = newId
  }
console.log("Before save, bookingId is:", this.bookingId)

  next()
})






module.exports = mongoose.model("Booking", bookingSchema)
