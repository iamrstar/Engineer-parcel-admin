const express = require("express")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const Admin = require("../models/Admin")
const User = require("../models/User")
const router = express.Router()

// Login route (supports Admin and User accounts, case-insensitive, trimmed)
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" })
    }

    const cleanUsername = String(username).trim()
    const regexQuery = new RegExp(`^${cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i")

    // 1. Check if admin exists in Admin collection
    let admin = await Admin.findOne({ username: regexQuery })

    if (admin) {
      const isMatch = await admin.comparePassword(password)
      if (isMatch) {
        const token = jwt.sign(
          { id: admin._id, role: "admin" },
          process.env.JWT_SECRET || "your_super_secret_jwt_key_here_make_it_long_and_complex",
          { expiresIn: "24h" },
        )

        return res.json({
          token,
          admin: {
            id: admin._id,
            username: admin.username,
            role: "admin",
            permissions: ["ALL"],
          },
          user: {
            id: admin._id,
            name: admin.username,
            username: admin.username,
            role: "admin",
            permissions: ["ALL"],
          }
        })
      }
    }

    // 2. If not found in Admin, check User collection
    let user = await User.findOne({
      $or: [
        { username: regexQuery },
        { phone: cleanUsername },
        { email: regexQuery }
      ]
    })

    if (user) {
      if (!user.isActive) {
        return res.status(403).json({ message: "Account is deactivated" })
      }

      let isMatch = false
      try {
        isMatch = await bcrypt.compare(password, user.password)
      } catch (e) {}

      if (!isMatch && (user.password === password || user.plainPassword === password)) {
        isMatch = true
      }

      if (!isMatch && password.trim() !== password) {
        const trimmed = password.trim();
        try {
          isMatch = await bcrypt.compare(trimmed, user.password);
        } catch (e) {}
        if (!isMatch && (user.password === trimmed || user.plainPassword === trimmed)) {
          isMatch = true;
        }
      }

      if (isMatch) {
        const token = jwt.sign(
          { id: user._id, role: user.role },
          process.env.JWT_SECRET || "your_super_secret_jwt_key_here_make_it_long_and_complex",
          { expiresIn: "24h" },
        )

        return res.json({
          token,
          user: {
            id: user._id,
            name: user.name,
            username: user.username,
            phone: user.phone,
            email: user.email,
            role: user.role,
            permissions: user.permissions || [],
            locationAccessMode: user.locationAccessMode || "offices_only",
          },
          admin: (user.role === "admin" || user.role === "office_admin") ? {
            id: user._id,
            username: user.username,
            role: user.role,
            permissions: ["ALL"],
          } : undefined
        })
      }
    }

    return res.status(400).json({ message: "Invalid credentials" })
  } catch (error) {
    console.error("Auth login error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
