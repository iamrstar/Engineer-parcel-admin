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
      enum: ["courier", "shifting", "local", "international", "surface", "air", "express", "premium", "campus-parcel"],
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
      dimensions: [
        {
          length: { type: Number, default: 0 },
          width: { type: Number, default: 0 },
          height: { type: Number, default: 0 },
        },
      ],
      boxQuantity: { type: Number, default: 1 },
      description: { type: String, default: "N/A" },
      value: { type: Number, default: 0 },
      fragile: { type: Boolean, default: false },
      isEdl: { type: Boolean, default: false },
      edlItems: [mongoose.Schema.Types.Mixed],
      edlContents: [String],
      otherContentText: String,
    },
    pickupPincode: String,
    deliveryPincode: String,
    edl: { type: Number, default: 0 },
    km: { type: Number, default: 0 },
    pickupMethod: {
      type: String,
      enum: ["hub", "doorstep"],
      default: "hub",
    },
    pickupDate: Date,
    pickupSlot: String,
    boxDeliveryType: {
      type: String,
      enum: ["self", "delivered"],
      default: "self",
    },
    boxDeliveryDate: Date,
    boxDeliverySlot: String,
    deliveryDate: Date,
    status: {
      type: String,
      enum: ["pending", "confirmed", "picked", "in-transit", "reached", "out-for-delivery", "delivered", "cancelled"],
      default: "pending",
    },
    currentLocation: {
      type: String,
      default: "Hub",
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
      enum: ["COD", "online", "Online"], // ✅ Allow both casings
      required: true,
      default: "COD"
    },

    notes: String,
    assignedRider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedFor: {
      type: String,
      enum: ["pickup", "delivery", "both"],
    },
    isRejected: {
      type: Boolean,
      default: false,
    },
    rejectionReason: String,

    // Vendor Details
    vendorName: String,
    vendorTrackingId: String,
    isVendorBooking: { type: Boolean, default: false },
    vendorId: { type: String },
    paymentLink: String,

    // Vendor Financial Tracking (Phase 3)
    vendorPaidAmount: { type: Number, default: 0 },
    vendorPaymentMethod: { type: String },
    vendorReceivedBy: { type: String },
    vendorPaymentDate: { type: Date },
    vendorPaymentStatus: { 
      type: String, 
      enum: ["Pending", "Partially Paid", "Paid"],
      default: "Pending"
    },
    vendorPaymentHistory: [{
      amount: { type: Number, required: true },
      method: { type: String },
      receivedBy: { type: String },
      date: { type: Date, default: Date.now },
      notes: { type: String }
    }],
    estimatedDelivery: { type: String },
    isBoxDelivered: { type: Boolean, default: false },
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
