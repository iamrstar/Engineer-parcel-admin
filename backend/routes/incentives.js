const express = require("express");
const router = express.Router();
const IncentiveTask = require("../models/IncentiveTask");
const adminAuth = require("../middleware/adminAuth");
const anyAuth = require("../middleware/userAuth"); // using anyAuth pattern if needed, but userAuth is fine for riders
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Admin = require("../models/Admin");
const multer = require("multer");
const path = require("path");

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/tasks/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// Helper middleware to allow either admin or user
const multiAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ message: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_super_secret_jwt_key_here");
    
    const admin = await Admin.findById(decoded.id);
    if (admin) {
      req.admin = admin;
      return next();
    }

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

// 1. Admin: Create a new incentive task
router.post("/", adminAuth, async (req, res) => {
  try {
    const { title, description, incentiveType, incentiveValue, taskType, deadline } = req.body;

    if (!title || !description || !incentiveValue || !deadline) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newTask = new IncentiveTask({
      title,
      description,
      incentiveType: incentiveType || "fixed",
      incentiveValue,
      taskType: taskType || "group",
      deadline,
      createdBy: req.admin._id
    });

    await newTask.save();
    
    // Emit socket event to notify staff
    const io = req.app.get("socketio");
    if (io) {
      io.emit("new_incentive_task", newTask);
    }

    res.status(201).json({ message: "Incentive task created", task: newTask });
  } catch (error) {
    console.error("Create incentive task error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 2. Both: Get incentive tasks
router.get("/", multiAuth, async (req, res) => {
  try {
    // If user, get active or tasks they've completed/accepted
    // Admin gets all
    const query = {};
    if (req.user && req.user.role !== 'admin') {
      // staff can see active tasks or tasks they are involved in
      query.$or = [
        { status: "active" },
        { "acceptedBy": req.user._id },
        { "completions.userId": req.user._id }
      ];
    }

    const tasks = await IncentiveTask.find(query)
      .populate("createdBy", "username")
      .populate("acceptedBy", "name username")
      .populate("completions.userId", "name username")
      .populate("completions.bookingId") // If we link booking
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error("Get incentive tasks error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 1.5 Get unaccepted active incentive count
router.get("/unaccepted-count", multiAuth, async (req, res) => {
  try {
    const count = await IncentiveTask.countDocuments({
      status: 'active',
      deadline: { $gt: new Date() },
      $expr: { $eq: [{ $size: "$acceptedBy" }, 0] }
    });
    res.json({ count });
  } catch (error) {
    console.error("Fetch unaccepted count error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 3. User: Accept a task (for individual tasks, or explicitly accepting group tasks)
router.post("/:id/accept", multiAuth, async (req, res) => {
  try {
    const task = await IncentiveTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (!req.user) return res.status(403).json({ message: "Only staff can accept tasks" });

    if (task.status !== "active") {
      return res.status(400).json({ message: "Task is no longer active" });
    }

    if (new Date() > new Date(task.deadline)) {
      return res.status(400).json({ message: "Deadline has passed" });
    }

    const isAlreadyAccepted = task.acceptedBy.includes(req.user._id);
    if (isAlreadyAccepted) {
      return res.status(400).json({ message: "You already accepted this task" });
    }

    if (task.taskType === "individual" && task.acceptedBy.length > 0) {
      return res.status(400).json({ message: "This individual task has already been accepted by someone else" });
    }

    task.acceptedBy.push(req.user._id);
    await task.save();

    res.json({ message: "Task accepted", task });
  } catch (error) {
    console.error("Accept task error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 4. User: Submit Proof
router.post("/:id/submit-proof", multiAuth, upload.single("proofImage"), async (req, res) => {
  try {
    const task = await IncentiveTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (!req.user) return res.status(403).json({ message: "Only staff can submit proof" });
    if (!req.file) return res.status(400).json({ message: "Proof image is required" });

    if (task.status === "expired") {
        return res.status(400).json({ message: "Task is expired" });
    }

    // Check if they already have an approved or pending completion
    const existingCompletion = task.completions.find(c => c.userId.toString() === req.user._id.toString());
    if (existingCompletion && (existingCompletion.status === 'approved' || existingCompletion.status === 'pending_approval')) {
        return res.status(400).json({ message: "You have already submitted proof for this task" });
    }

    task.completions.push({
      userId: req.user._id,
      proofImage: `/uploads/tasks/${req.file.filename}`,
      proofNote: req.body.completionNote || "",
      status: "pending_approval",
      submittedAt: new Date()
    });

    await task.save();

    // Alert Admin via Socket
    const io = req.app.get("socketio");
    if (io) {
      io.emit("status_update", { type: "incentive_proof", taskId: task._id, user: req.user.name });
    }

    res.json({ message: "Proof submitted successfully", task });
  } catch (error) {
    console.error("Submit proof error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 5. Admin: Approve/Reject Proof
router.put("/:id/approve/:completionId", adminAuth, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const task = await IncentiveTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const completion = task.completions.id(req.params.completionId);
    if (!completion) return res.status(404).json({ message: "Completion record not found" });

    if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
    }

    completion.status = status;
    completion.adminNote = adminNote;
    if (status === "approved") {
        completion.approvedAt = new Date();
        
        // If individual, task is complete.
        if (task.taskType === "individual") {
            task.status = "completed";
        }
    }

    await task.save();
    res.json({ message: `Proof ${status}`, task });
  } catch (error) {
    console.error("Approve proof error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 6. Admin: Delete an incentive task
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const task = await IncentiveTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.acceptedBy && task.acceptedBy.length > 0) {
        return res.status(400).json({ message: "Cannot delete task that has already been accepted by staff" });
    }

    await task.deleteOne();
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add comment to incentive task
router.post("/:id/comments", multiAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: "Comment cannot be empty" });

    const task = await IncentiveTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const newComment = {
      message,
      name: req.admin ? req.admin.username : req.user.name,
      userModel: req.admin ? 'Admin' : 'User'
    };

    if (req.admin) {
      newComment.adminId = req.admin._id;
    } else {
      newComment.userId = req.user._id;
    }

    task.comments.push(newComment);
    await task.save();

    res.json({ message: "Comment added", task });
  } catch (error) {
    console.error("Add incentive comment error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
