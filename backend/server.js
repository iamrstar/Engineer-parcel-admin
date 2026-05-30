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
app.use(express.static('public'));
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
const userRoutes = require("./routes/users");
const vendorRoutes = require("./routes/vendors");
const vendorPaymentRoutes = require("./routes/vendorPayments");
const analyticsRoutes = require("./routes/analytics");
const docketRoutes = require("./routes/dockets");
const taskRoutes = require("./routes/tasks");
const attendanceRoutes = require("./routes/attendance");
const queryRoutes = require("./routes/queries");

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/pincodes", pincodeRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/manual-bookings", manualBookingRoute);
app.use("/api/email", emailRoutes);
app.use("/api/users", userRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/vendor-payments", vendorPaymentRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/dockets", docketRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/queries", queryRoutes);

app.use("/api/intake", intakeRoutes);

// Initialize Background Cron Jobs
require("./cron/trackingCron");
require("./cronJobs"); // Initialize recurring task cron jobs

// Start server
const PORT = process.env.PORT || 8000;
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true
  }
});

// Pass socket.io to express app
app.set("socketio", io);

io.on("connection", (socket) => {
  console.log("🟢 Admin Connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Admin Disconnected:", socket.id);
  });
});

// Real-time Database Watchers (Change Streams)
const IntakeBooking = require("./models/IntakeBooking");
const Booking = require("./models/Booking");

// 1. Watch for New Agent E-Dockets (Intake)
IntakeBooking.watch().on('change', (change) => {
  if (change.operationType === 'insert') {
    const doc = change.fullDocument;
    io.emit("new_booking", {
      bookingId: doc.trackingId || doc.bookingId,
      senderName: doc.agentUsername || doc.senderDetails?.name || "Agent",
      serviceType: doc.serviceType,
      totalAmount: doc.pricing?.totalAmount || 0,
      createdAt: doc.createdAt,
      bookingSource: "Agent",
      bookingMongoId: doc._id
    });
  }
});

// 2. Watch for New Online Orders (Main Website)
Booking.watch().on('change', (change) => {
  if (change.operationType === 'insert') {
    const doc = change.fullDocument;

    // Only alert if it's NOT a manual booking
    // Website orders usually have status 'pending'
    if (doc.bookingSource !== 'Manual' || doc.status === 'pending') {
      io.emit("new_booking", {
        bookingId: doc.bookingId,
        senderName: doc.senderDetails?.name || "Customer",
        serviceType: doc.serviceType,
        totalAmount: doc.pricing?.totalAmount || 0,
        createdAt: doc.createdAt,
        bookingSource: doc.bookingSource === 'Manual' ? "Website" : doc.bookingSource,
        bookingMongoId: doc._id
      });
    }
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
