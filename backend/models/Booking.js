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
      weight: { type: Number, required: true, default: 0 },
      weightUnit: { type: String, enum: ["g", "kg"], default: "g" },
      volumetricWeight: { type: Number },
      chargeableWeight: { type: Number },
      chargeableWeightUnit: { type: String, enum: ["g", "kg"], default: "kg" },
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
    premiumItemType: String,
    otherPremiumItem: String,

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
      packagingCharge: Number,
      tax: Number,
      discount: Number,
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
    try {
      const Booking = mongoose.model("Booking");
      // Also need to check intake_bookings for cross-continuity
      const IntakeBooking = mongoose.model("IntakeBooking");

      const lastMain = await Booking.findOne({ bookingId: /^EP\d{5}$/ }).sort({ bookingId: -1 });
      const lastIntake = await IntakeBooking.findOne({ trackingId: /^EP\d{5}$/ }).sort({ trackingId: -1 });

      let maxNum = 4600; // Starting Floor

      if (lastMain && lastMain.bookingId) {
        const num = parseInt(lastMain.bookingId.replace("EP", ""));
        if (!isNaN(num)) maxNum = Math.max(maxNum, num);
      }
      if (lastIntake && lastIntake.trackingId) {
        const num = parseInt(lastIntake.trackingId.replace("EP", ""));
        if (!isNaN(num)) maxNum = Math.max(maxNum, num);
      }

      this.bookingId = `EP${String(maxNum + 1).padStart(5, "0")}`;
    } catch (err) {
      console.error("Error generating sequential bookingId:", err);
      // Fallback to timestamp to prevent saving error, but should not happen
      this.bookingId = `EP${Date.now()}`;
    }
  }
  next();
});

module.exports = mongoose.model("Booking", bookingSchema)
