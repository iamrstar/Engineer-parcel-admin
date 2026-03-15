const express = require("express")
const jwt = require("jsonwebtoken")
const Admin = require("../models/Admin")
const router = express.Router()

// Login route
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body

    // Check if admin exists
    let admin = await Admin.findOne({ username })

    // If admin doesn't exist, create default admin
    if (!admin && username === "admin@123") {
      admin = new Admin({
        username: "admin@123",
        password: "engineerparcel123",
      })
      await admin.save()
    }

    if (!admin) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    // Check password
    const isMatch = await admin.comparePassword(password)
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    // Create JWT token
    const token = jwt.sign(
      { id: admin._id },
      process.env.JWT_SECRET || "your_super_secret_jwt_key_here_make_it_long_and_complex",
      { expiresIn: "24h" },
    )

    res.json({
      token,
      admin: {
        id: admin._id,
        username: admin.username,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
