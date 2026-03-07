const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ⭐ Allowed frontend origins ONLY
const allowedOrigins = [
  "http://localhost:5173",
  "https://engineer-parcel-admin.netlify.app",
  "https://engineer-parcel-admin.vercel.app",
  "https://ep.engineersparcel.in"
];

// ⭐ CORS (final guaranteed working config)
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith(".engineersparcel.in")) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Content-Type, Authorization"
  })
);

// ⭐ Allow preflight OPTIONS requests (VERY IMPORTANT)
app.options("*", cors());

app.use(express.json());

// Debug → check incoming origin
app.use((req, res, next) => {
  //   console.log("Origin:", req.headers.origin);
  next();
});

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "Backend is running ✅" });
});

// MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const authRoutes = require("./routes/auth");
const bookingRoutes = require("./routes/bookings");
const pincodeRoutes = require("./routes/pincodes");
const couponRoutes = require("./routes/coupons");
const manualBookingRoute = require('./routes/manualBooking.js');
const emailRoutes = require("./routes/emailRoutes.js");

const intakeRoutes = require("./routes/intake");

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/pincodes", pincodeRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/manual-bookings", manualBookingRoute);
app.use("/api/email", emailRoutes);

app.use("/api/intake", intakeRoutes);

// Initialize Background Cron Jobs
require("./cron/trackingCron");

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
