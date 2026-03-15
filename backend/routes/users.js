const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const adminAuth = require("../middleware/adminAuth");
const userAuth = require("../middleware/userAuth");
const Booking = require("../models/Booking");

// @route   GET /api/users
// @desc    Get all users (with optional role filter)
// @access  Admin
router.get("/", adminAuth, async (req, res) => {
    try {
        const { roles } = req.query;
        let query = {};

        if (roles) {
            query.role = { $in: roles.split(",") };
        }

        const users = await User.find(query).select("-password").sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        console.error("Fetch users error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// @route   POST /api/users
// @desc    Create a new user
// @access  Admin
router.post("/", adminAuth, async (req, res) => {
    try {
        const { name, username, email, phone, password, role } = req.body;

        // Check if user already exists
        let user = await User.findOne({ $or: [{ username }, { phone }, { email }] });
        if (user) {
            return res.status(400).json({ message: "User already exists with this username, email or phone" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            name,
            username,
            email,
            phone,
            password: hashedPassword,
            role: role || "agent",
        });

        await user.save();

        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json(userResponse);
    } catch (error) {
        console.error("Create user error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// @route   PUT /api/users/:id
// @desc    Update a user
// @access  Admin
router.put("/:id", adminAuth, async (req, res) => {
    try {
        const { name, username, email, phone, password, role, isActive } = req.body;

        let user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (name) user.name = name;
        if (username) user.username = username;
        if (email) user.email = email;
        if (phone) user.phone = phone;
        if (role) user.role = role;
        if (typeof isActive !== "undefined") user.isActive = isActive;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();

        const userResponse = user.toObject();
        delete userResponse.password;

        res.json(userResponse);
    } catch (error) {
        console.error("Update user error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// @route   DELETE /api/users/:id
// @desc    Delete a user
// @access  Admin
router.delete("/:id", adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        await user.deleteOne();
        res.json({ message: "User removed" });
    } catch (error) {
        console.error("Delete user error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// @route   POST /api/users/login
// @desc    Login for users (Riders/Agents)
// @access  Public
router.post("/login", async (req, res) => {
    try {
        const { phone, password, username } = req.body;

        // Support login via phone or username
        const query = phone ? { phone } : { username };
        const user = await User.findOne(query);

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: "Account is deactivated" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || "your_super_secret_jwt_key_here",
            { expiresIn: "7d" }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                phone: user.phone,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("User login error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// @route   GET /api/users/tasks
// @desc    Get assigned tasks for the logged in user
// @access  User (Rider/Agent)
router.get("/tasks", userAuth, async (req, res) => {
    try {
        const tasks = await Booking.find({
            assignedRider: req.user._id,
            status: { $nin: ["delivered", "cancelled"] }
        }).sort({ createdAt: -1 });

        res.json(tasks);
    } catch (error) {
        console.error("Fetch tasks error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

/**
 * @route   PUT /api/users/tasks/:id/action
 * @desc    Update task status (picked, delivered, etc)
 * @access  User (Rider/Agent)
 */
router.put("/tasks/:id/action", userAuth, async (req, res) => {
    try {
        const { action, reason } = req.body;
        const booking = await Booking.findOne({
            _id: req.params.id,
            assignedRider: req.user._id
        });

        if (!booking) {
            return res.status(404).json({ message: "Task not found or not assigned to you" });
        }

        // Map actions to statuses
        if (action === "picked") {
            booking.status = "picked";
        } else if (action === "delivered") {
            booking.status = "delivered";
        } else if (action === "cancelled" || action === "rejected") {
            booking.status = "cancelled";
            booking.isRejected = true;
            booking.rejectionReason = reason || "No reason provided";
        }

        booking.trackingHistory.push({
            status: booking.status,
            location: "Active",
            timestamp: new Date(),
            description: `Task marked as ${booking.status} by ${req.user.name}${reason ? ': ' + reason : ''}`
        });

        await booking.save();
        res.json(booking);
    } catch (error) {
        console.error("Task action error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
