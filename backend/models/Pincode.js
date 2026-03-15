const mongoose = require("mongoose")

const pincodeSchema = new mongoose.Schema(
  {
    pincode: {
      type: String,
      required: true,
      unique: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    district: String,
    country: { type: String, default: 'India' },
    isServiceable: { type: Boolean, default: true },
    isActive: { // Keeping for backward compatibility if used elsewhere
      type: Boolean,
      default: true,
    },
    deliveryDays: { type: Number, default: 3 },
    serviceTypes: [{
      type: String,
      default: ["courier"]
    }],
    additionalCharges: { type: Number, default: 0 },
    restrictions: [String],
  },
  { timestamps: true },
)

module.exports = mongoose.model("Pincode", pincodeSchema)
