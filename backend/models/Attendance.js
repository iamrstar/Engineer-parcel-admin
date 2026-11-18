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
      enum: ["Present", "Late", "Outside Geofence"],
      default: "Present",
    },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      accuracy: { type: Number },
      distanceMeters: { type: Number },
      inGeofence: { type: Boolean, default: true },
      placeId: { type: String, default: "ChIJO9LYJiignysRoxbn5RCefB4" },
      officeName: { type: String, default: "Engineers Parcel Head Office (IIT ISM Dhanbad)" },
      verifiedAt: { type: Date, default: Date.now }
    },
  },
  { timestamps: true }
);

// Ensure a user only has one attendance record per day
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
