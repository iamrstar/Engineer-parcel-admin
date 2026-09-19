const mongoose = require("mongoose")
const Counter = require("./Counter");

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
    billingDetails: {
      billTo: { type: String, enum: ["Sender", "Receiver", "Other"], default: "Sender" },
      name: String,
      phone: String,
      address: String,
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
          actualWeight: { type: Number, default: 0 },
          chargeableWeight: { type: Number, default: 0 },
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
    shiftingDetails: {
      vehicleType: String,
      itemsDescription: String,
      senderFloor: String,
      receiverFloor: String,
      liftAvailable: { type: Boolean, default: false },
      laborRequired: { type: Boolean, default: false },
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
      enum: ["pending", "confirmed", "picked", "in-transit", "reached", "out-for-delivery", "delivered", "cancelled", "empty_box_delivered", "filled_box_picked"],
      default: "pending",
    },
    emptyBoxDelivered: { type: Boolean, default: false },
    emptyBoxDeliveredAt: Date,
    boxPicked: { type: Boolean, default: false },
    boxPickedAt: Date,
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
      enum: ["pending", "paid", "partial", "failed", "refunded"],
      default: "pending",
    },
    amountReceived: {
      type: Number,
      default: 0,
    },
    paymentProof: {
      type: String, // URL/path to the image
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
    pickupRider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    deliveryRider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    salesAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    handlingAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    packagingAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    trackingAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    internalRolesDescription: String,
    roleChangesHistory: [
      {
        action: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        timestamp: { type: Date, default: Date.now },
        details: String
      }
    ],
    assignedFor: {
      type: String,
      enum: ["pickup", "delivery", "both"],
    },
    isRejected: {
      type: Boolean,
      default: false,
    },
    rejectionReason: String,

    // Corporate Partner Details (B2B Business Clients: Anand Cure, Hancore, etc.)
    partnerId: { type: String }, // e.g., "PAT0001"
    partnerName: { type: String }, // e.g., "ANAND CURE & CARE"
    isVendorBooking: { type: Boolean, default: false },
    vendorId: { type: String }, // Backward compatibility alias for partnerId

    // Shipping Courier Details (Logistics Services: DTDC, Delhivery, BlueDart, etc.)
    courierName: { type: String }, // e.g., "DTDC (Hirak)", "Delhivery", "BlueDart"
    vendorName: { type: String }, // Backward compatibility alias
    vendorTrackingId: { type: String }, // Courier Docket / AWB tracking ID
    paymentLink: String,

    // Status Verification / Last Checked Tracking
    lastCheckedAt: { type: Date },
    lastCheckedBy: { type: String },
    lastCheckedByName: { type: String },
    lastCheckedNotes: { type: String },

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

    // Direct Shipment Costs / Expenses (for Net Profit calculation per order)
    expenses: {
      courierCost: { type: Number, default: 0 },
      packagingCost: { type: Number, default: 0 },
      riderCost: { type: Number, default: 0 },
      otherCost: { type: Number, default: 0 },
      totalExpenses: { type: Number, default: 0 },
      notes: { type: String, default: "" },
      updatedAt: { type: Date },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      updatedByName: { type: String, default: "" }
    },

    estimatedDelivery: { type: String },
    isBoxDelivered: { type: Boolean, default: false },
    officeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Office"
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    bookingSource: {
      type: String,
      default: "admin"
    },
    bookedByAgent: {
      type: String
    },
    agentUsername: {
      type: String
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    verifiedByName: {
      type: String
    },
    verifiedAt: {
      type: Date
    },
    seededBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    seededByName: {
      type: String
    },
    seededAt: {
      type: Date
    },
  },
  { timestamps: true },
)

// Generate booking ID
bookingSchema.pre("validate", async function (next) {
  if (!this.bookingId) {
    try {
      const Booking = this.constructor;
      let IntakeBooking;
      try {
        IntakeBooking = mongoose.model("IntakeBooking");
      } catch (e) {
        IntakeBooking = require("./IntakeBooking");
      }

      let prefix = "EP";
      let counterKey = "trackingId";
      let startSeq = 4601;

      if (this.officeId) {
        let Office;
        try {
          Office = mongoose.model("Office");
        } catch (e) {
          Office = require("./Office");
        }
        const office = await Office.findById(this.officeId);
        if (office) {
          if (office.bookingPrefix) prefix = office.bookingPrefix;
          if (office.bookingIdStart) startSeq = office.bookingIdStart;
        }
      }

      if (prefix !== "EP") {
        counterKey = `bookingId_${prefix}`;
      }

      // Ensure counter exists and starts at least at startSeq
      const existingCounter = await Counter.findOne({ id: counterKey });
      if (!existingCounter) {
        await Counter.create({ id: counterKey, seq: Math.max(startSeq - 1, 0) });
      } else if (existingCounter.seq < startSeq - 1) {
        await Counter.updateOne({ id: counterKey }, { $set: { seq: startSeq - 1 } });
      }

      let isUnique = false;
      let assignedId = "";

      while (!isUnique) {
        const updatedCounter = await Counter.findOneAndUpdate(
          { id: counterKey },
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );

        const seqNum = updatedCounter.seq;
        const proposedId = `${prefix}${String(seqNum).padStart(5, "0")}`;

        const existingMain = await Booking.findOne({ bookingId: proposedId }).lean();
        const existingIntake = await IntakeBooking.findOne({ trackingId: proposedId }).lean();

        if (!existingMain && !existingIntake) {
          assignedId = proposedId;
          isUnique = true;
        }
      }

      this.bookingId = assignedId;
      if (!this.trackingId) {
        this.trackingId = assignedId;
      }
    } catch (err) {
      console.error("Error generating sequential bookingId:", err);
      // Fallback to timestamp to prevent saving error
      this.bookingId = `EP${Date.now()}`;
    }
  } else {
    // If a manual bookingId is provided, also set trackingId if not present
    if (!this.trackingId) {
      this.trackingId = this.bookingId;
    }
  }
  next();
});

// Performance compound indexes for reports, dashboards, and listings
bookingSchema.index({ createdAt: -1, status: 1 });
bookingSchema.index({ officeId: 1, createdAt: -1 });

module.exports = mongoose.model("Booking", bookingSchema);
