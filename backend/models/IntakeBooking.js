const mongoose = require('mongoose');

// Details Schemas (Embedded)
const AddressSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    address1: { type: String, required: true }, // Street / Building
    address2: String, // Area / Colony (Optional)
    landmark: String,
    pincode: { type: String, required: true },
    city: String,
    state: String,
}, { _id: false });

const PackageSchema = new mongoose.Schema({
    weight: { type: Number, required: true },
    weightUnit: { type: String, enum: ['g', 'kg'], default: 'g' },
    volumetricWeight: Number,
    chargeableWeight: Number,
    dimensions: {
        length: Number,
        width: Number,
        height: Number
    },
    boxQuantity: { type: Number, default: 1 },
    description: String,
    value: Number,
    fragile: { type: Boolean, default: false }
}, { _id: false });

const PricingSchema = new mongoose.Schema({
    basePrice: Number,
    packagingCharge: Number,
    additionalCharges: Number,
    tax: Number,
    totalAmount: Number,
    pricingMode: { type: String, enum: ['MANUAL', 'AUTO_WEIGHT'] }
}, { _id: false });

const IntakeBookingSchema = new mongoose.Schema({
    // Identifiers
    bookingId: { type: String, unique: true },
    trackingId: { type: String, required: true },

    // Core Info
    serviceType: { type: String, required: true },
    premiumItemType: String,
    senderDetails: { type: AddressSchema, required: true },
    receiverDetails: { type: AddressSchema, required: true },
    packageDetails: { type: PackageSchema, required: true },

    // Logistics
    pickupPincode: String,
    deliveryPincode: String,
    pickupDate: Date,
    pickupSlot: String,
    deliveryDate: Date,

    // Status & Tracking
    status: { type: String, default: 'Pending Verification' },
    currentLocation: String,
    vendorName: String,
    vendorTrackingId: String,
    isVendorBooking: { type: Boolean, default: false },
    vendorId: { type: String },
    paymentLink: String,
    parcelImage: String,
    estimatedDelivery: String,

    // Meta
    couponCode: String,
    couponDiscount: { type: Number, default: 0 },
    insuranceRequired: { type: Boolean, default: false },
    notes: String,

    // Pricing (Admin only)
    pricing: PricingSchema,

    // Payment
    paymentStatus: { type: String, default: 'pending' },
    paymentMethod: { type: String, default: 'COD' },

    // System Fields
    bookingSource: { type: String, default: 'Agent' },
    adminCreated: { type: Boolean, default: false },

    // Intake System Specifics
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    agentUsername: String,
    adminVerified: { type: Boolean, default: false },
    seededToMainDashboard: { type: Boolean, default: false },
    seededAt: Date,

}, { timestamps: true, collection: 'intake_bookings' });

module.exports = mongoose.model('IntakeBooking', IntakeBookingSchema);
