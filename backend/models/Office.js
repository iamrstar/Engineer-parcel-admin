const mongoose = require("mongoose");

const officeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Please provide an office name"],
            unique: true,
        },
        code: {
            type: String,
            required: [true, "Please provide an office code"],
            unique: true,
        },
        address: {
            type: String,
        },
        contactNumber: {
            type: String,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        bookingPrefix: {
            type: String,
            default: "EP",
        },
        bookingIdStart: {
            type: Number,
            default: 4600,
        },
        adminUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        enableMailService: {
            type: Boolean,
            default: true,
        },
        enableDeliveryEmail: {
            type: Boolean,
            default: true,
        },
        placeId: {
            type: String,
            default: "ChIJO9LYJiignysRoxbn5RCefB4",
        },
        latitude: {
            type: Number,
            default: 23.814343,
        },
        longitude: {
            type: Number,
            default: 86.441198,
        },
        radiusMeters: {
            type: Number,
            default: 500, // 500m geofence covering IIT ISM campus / I2H building
        },
        enforceGeofence: {
            type: Boolean,
            default: true,
        },
        geofenceAddress: {
            type: String,
            default: "4th Floor, I2H Building, IIT (ISM) Dhanbad, Jharkhand 826004",
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Office", officeSchema);
