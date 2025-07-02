const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
require("dotenv").config()

const app = express()

// Middleware
const allowedOrigins = [
  "http://localhost:5173", // for local dev
  "https://engineer-parcel-admin.netlify.app/", 
  "https://engineer-parcel-admin.vercel.app/"    
]

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}))

app.use(express.json())

// MongoDB Connection
mongoose
  .connect(
    process.env.MONGODB_URI ||
      "mongodb+srv://rajchatterji20:jaR5QNAU3n587zDb@cluster0.uzthk7v.mongodb.net/engineersparcel?retryWrites=true&w=majority&appName=Cluster0",
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err))

// Import routes
const authRoutes = require("./routes/auth")
const bookingRoutes = require("./routes/bookings")
const pincodeRoutes = require("./routes/pincodes")
const couponRoutes = require("./routes/coupons")

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/bookings", bookingRoutes)
app.use("/api/pincodes", pincodeRoutes)
app.use("/api/coupons", couponRoutes)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
