const express = require("express");
const router = express.Router();
const Query = require("../models/Query");
const adminAuth = require("../middleware/adminAuth");
const userAuth = require("../middleware/userAuth");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Admin = require("../models/Admin");

// Helper middleware to allow either admin or user
const anyAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ message: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_super_secret_jwt_key_here");
    
    // Check if it's admin
    const admin = await Admin.findById(decoded.id);
    if (admin) {
      req.admin = admin;
      return next();
    }

    // Check if it's user
    const user = await User.findById(decoded.id);
    if (user && user.isActive) {
      req.user = user;
      return next();
    }

    return res.status(401).json({ message: "Not authorized" });
  } catch (err) {
    res.status(401).json({ message: "Token invalid" });
  }
};

// 1. Staff creates a new query
router.post("/", anyAuth, async (req, res) => {
  try {
    if (!req.user) {
       return res.status(403).json({ message: "Only staff can create queries" });
    }

    const { type, subject, description } = req.body;
    if (!type || !subject || !description) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newQuery = new Query({
      user: req.user._id,
      type,
      subject,
      description
    });

    await newQuery.save();
    res.status(201).json({ message: "Query submitted successfully", query: newQuery });
  } catch (error) {
    console.error("Create query error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 2. Get queries (Admin sees all, Staff sees their own)
router.get("/", anyAuth, async (req, res) => {
  try {
    let queries = [];
    if (req.admin) {
       // Admin fetches all queries
       queries = await Query.find().populate("user", "name username email role").sort({ createdAt: -1 });
    } else if (req.user) {
       // Staff fetches own queries
       queries = await Query.find({ user: req.user._id }).sort({ createdAt: -1 });
    }
    res.json(queries);
  } catch (error) {
    console.error("Get queries error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 3. Admin updates query status/reply
router.put("/:id", adminAuth, async (req, res) => {
  try {
    const { status, adminReply } = req.body;
    const query = await Query.findById(req.params.id);
    
    if (!query) return res.status(404).json({ message: "Query not found" });

    if (status) query.status = status;
    if (adminReply) query.adminReply = adminReply;

    await query.save();
    res.json({ message: "Query updated", query });
  } catch (error) {
    console.error("Update query error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
