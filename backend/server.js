const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
require("dotenv").config()

const app = express()

// ✅ CORS: Allow only trusted origins
const allowedOrigins = [
  "http://localhost:5173", // local dev
  "https://engineer-parcel-admin.netlify.app",
  "https://engineer-parcel-admin.vercel.app",
   "https://ep.engineersparcel.in",
   "https://admin-api.engineersparcel.in"

]

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g. curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error("Not allowed by CORS"))
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
)

app.use(express.json())

// ✅ Optional Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "Backend is running ✅" })
})

// ✅ MongoDB Connection
mongoose
  .connect(
    process.env.MONGODB_URI ||
      "mongodb+srv://rajchatterji20:jaR5QNAU3n587zDb@cluster0.uzthk7v.mongodb.net/engineersparcel?retryWrites=true&w=majority&appName=Cluster0"
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err))

// ✅ Routes
const authRoutes = require("./routes/auth")
const bookingRoutes = require("./routes/bookings")
const pincodeRoutes = require("./routes/pincodes")
const couponRoutes = require("./routes/coupons")
const manualBookingRoute = require('./routes/manualBooking.js');
const emailRoutes = require ("./routes/emailRoutes.js");

app.use("/api/auth", authRoutes)
app.use("/api/bookings", bookingRoutes)
app.use("/api/pincodes", pincodeRoutes)
app.use("/api/coupons", couponRoutes)
app.use("/api/manual-bookings", manualBookingRoute); 
app.use("/api/email", emailRoutes);

// ✅ Start Server
const PORT = process.env.PORT || 8000
app.listen(PORT, () => {   
  console.log(`Server running on port ${PORT}`)
})  
