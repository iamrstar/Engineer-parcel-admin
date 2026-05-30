const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    firstLoginAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Present", "Late"],
      default: "Present",
    },
  },
  { timestamps: true }
);

// Ensure a user only has one attendance record per day
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
