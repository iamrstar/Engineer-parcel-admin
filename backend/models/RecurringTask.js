const mongoose = require("mongoose");

const recurringTaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    type: {
      type: String,
      enum: ["tracking", "general"],
      default: "general"
    },
    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium"
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    cronExpression: {
      type: String,
      required: true, // e.g. "0 10 * * *" for every day at 10 AM
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastGeneratedAt: {
      type: Date,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("RecurringTask", recurringTaskSchema);
