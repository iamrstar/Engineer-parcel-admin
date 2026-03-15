const express = require("express")
const jwt = require("jsonwebtoken")
const User = require("../models/User")
const authMiddleware = require("../middleware/auth")

const router = express.Router()

/** ------------------------
 * 🔐 User/Rider Login
 * ------------------------ */
router.post("/login", async (req, res) => {
    try {
        const { phone, password } = req.body

        if (!phone || !password) {
            return res.status(400).json({ message: "Phone and password are required" })
        }

        const user = await User.findOne({ phone, isActive: true })
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" })
        }

        const isMatch = await user.comparePassword(password)
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" })
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || "your_super_secret_jwt_key_here_make_it_long_and_complex",
            { expiresIn: "7d" }
        )

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role,
                designation: user.designation,
            },
        })
    } catch (error) {
        console.error("Login error:", error)
        res.status(500).json({ message: "Server error" })
    }
})

/** ------------------------
 * 📋 Get all users (with optional role filter)
 * ------------------------ */
router.get("/", authMiddleware, async (req, res) => {
    try {
        const { role, roles } = req.query
        const query = {}

        if (roles) {
            query.role = { $in: roles.split(",") }
        } else if (role && role !== "all") {
            query.role = role
        }

        const users = await User.find(query)
            .select("-password")
            .sort({ createdAt: -1 })

        res.json(users)
    } catch (error) {
        console.error("Error fetching users:", error)
        res.status(500).json({ message: "Server error" })
    }
})

/** ------------------------
 * 👤 Get user by ID
 * ------------------------ */
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password")
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        res.json(user)
    } catch (error) {
        console.error("Error fetching user:", error)
        res.status(500).json({ message: "Server error" })
    }
})

/** ------------------------
 * ➕ Create new user
 * ------------------------ */
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { name, email, phone, password, role, designation, username } = req.body

        if (!name || !phone || !password) {
            return res.status(400).json({ message: "Name, phone, and password are required" })
        }

        // Check if phone already exists
        const existingUser = await User.findOne({ phone })
        if (existingUser) {
            return res.status(400).json({ message: "A user with this phone number already exists" })
        }

        const user = new User({
            name,
            email,
            phone,
            password,
            plainPassword: password,
            role: role || "rider",
            designation: designation || "",
            username: username || "",
        })

        await user.save()

        // Return without password
        const userObj = user.toObject()
        delete userObj.password

        res.status(201).json(userObj)
    } catch (error) {
        console.error("Error creating user:", error)
        if (error.code === 11000) {
            return res.status(400).json({ message: "Duplicate key error: A user with this contact info or ID already exists" })
        }
        res.status(500).json({ message: `Server error: ${error.message}` })
    }
})

/** ------------------------
 * ✏️ Update user
 * ------------------------ */
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const { name, email, phone, role, designation, isActive, password, username } = req.body

        const user = await User.findById(req.params.id)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        if (name) user.name = name
        if (email !== undefined) user.email = email
        if (phone) user.phone = phone
        if (role) user.role = role
        if (designation !== undefined) user.designation = designation
        if (isActive !== undefined) user.isActive = isActive
        if (username !== undefined) user.username = username
        if (password) {
            user.password = password // Will be hashed by pre-save hook
            user.plainPassword = password
        }

        await user.save()

        const userObj = user.toObject()
        delete userObj.password

        res.json(userObj)
    } catch (error) {
        console.error("Error updating user:", error)
        res.status(500).json({ message: "Server error" })
    }
})

/** ------------------------
 * 🗑️ Delete user (permanent)
 * ------------------------ */
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id)

        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        res.json({ success: true, message: "User deleted successfully" })
    } catch (error) {
        console.error("Error deleting user:", error)
        res.status(500).json({ message: "Server error" })
    }
})

/** ------------------------
 * 🔑 View user credentials (admin master password gated)
 * ------------------------ */
router.post("/:id/credentials", authMiddleware, async (req, res) => {
    try {
        const { adminPassword } = req.body
        const MASTER_PASSWORD = "Engineers123@"

        if (adminPassword !== MASTER_PASSWORD) {
            return res.status(403).json({ message: "Incorrect admin password" })
        }

        const user = await User.findById(req.params.id)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        res.json({
            username: user.username || "—",
            plainPassword: user.plainPassword || "(Not stored — reset password to set)",
        })
    } catch (error) {
        console.error("Error fetching credentials:", error)
        res.status(500).json({ message: "Server error" })
    }
})

module.exports = router
