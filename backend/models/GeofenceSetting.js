const mongoose = require("mongoose");

const geofenceSettingSchema = new mongoose.Schema(
  {
    globalMode: {
      type: String,
      enum: ["offices_only", "pan_india", "global"],
      default: "offices_only", // "offices_only": Must be at active office, "pan_india": Anywhere in India, "global": Worldwide
    },
    enforceGeofence: {
      type: Boolean,
      default: true,
    },
    authorizedLocations: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        placeId: { type: String, required: true },
        address: { type: String, default: "" },
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        radiusMeters: { type: Number, default: 500 },
        isActive: { type: Boolean, default: true },
        isHeadOffice: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("GeofenceSetting", geofenceSettingSchema);
