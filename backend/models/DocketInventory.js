const mongoose = require("mongoose");

const docketInventorySchema = new mongoose.Schema(
  {
    vendorName: {
      type: String,
      required: true,
      trim: true,
    },
    docketId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["available", "used"],
      default: "available",
    },
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },
    epId: {
      type: String, // Booking ID (e.g., EP04601)
    },
    usedAt: {
      type: Date,
    },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

// Index for faster FIFO fetching
docketInventorySchema.index({ vendorName: 1, status: 1, createdAt: 1 });

module.exports = mongoose.model("DocketInventory", docketInventorySchema);
