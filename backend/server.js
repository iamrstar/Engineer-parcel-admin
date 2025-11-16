const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();

// ⭐ Allowed frontend origins
const allowedOrigins = [
  "http://localhost:5173", 
  "https://engineer-parcel-admin.netlify.app",
  "https://engineer-parcel-admin.vercel.app",
  "https://ep.engineersparcel.in"
];

// ⭐ CORS Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // Allow Postman, curl

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("❌ Not allowed by CORS: " + origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json());

// Optional: Debug which origin is calling
app.use((req, res, next) => {
  console.log("Request Origin →", req.headers.origin);
  next();
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "Backend is running ✅" });
});

// MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
const authRoutes = require("./routes/auth");
const bookingRoutes = require("./routes/bookings");
const pincodeRoutes = require("./routes/pincodes");
const couponRoutes = require("./routes/coupons");
const manualBookingRoute = require("./routes/manualBooking.js");
const emailRoutes = require("./routes/emailRoutes.js");

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/pincodes", pincodeRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/manual-bookings", manualBookingRoute);
app.use("/api/email", emailRoutes);

// Start Server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
