const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const Booking = require("../models/Booking");
const adminAuth = require("../middleware/adminAuth");
const userAuth = require("../middleware/userAuth");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Admin = require("../models/Admin");
const multer = require("multer");
const path = require("path");
const { scheduleTask } = require("../cronJobs");

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

// 1. Admin: Create a new task
router.post("/", adminAuth, async (req, res) => {
  try {
    const { title, description, type, priority, dueDate, assignedTo, bookings, isRecurring, cronExpression } = req.body;

    if (!assignedTo || !title) {
      return res.status(400).json({ message: "Missing required fields: title or assignedTo" });
    }

    if (type === "tracking" && (!bookings || bookings.length === 0)) {
       return res.status(400).json({ message: "Tracking tasks require at least one booking" });
    }

    if (isRecurring) {
      if (!cronExpression) return res.status(400).json({ message: "Cron expression is required for recurring tasks" });
      const RecurringTask = require("../models/RecurringTask");
      const newRecTask = new RecurringTask({
        title, description, type: type || "general", priority, assignedTo, assignedBy: req.admin._id, cronExpression
      });
      await newRecTask.save();
      scheduleTask(newRecTask);
      return res.status(201).json({ message: "Recurring task created successfully", task: newRecTask });
    }

    const newTask = new Task({
      title,
      description,
      type: type || "general",
      priority: priority || "medium",
      dueDate: dueDate || null,
      assignedTo,
      assignedBy: req.admin._id,
      bookings: bookings || []
    });

    await newTask.save();
    res.status(201).json({ message: "Task created successfully", task: newTask });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 2. Both: Get tasks
// If admin, get all tasks or filter by user/date.
// If user, get only their tasks.
router.get("/", anyAuth, async (req, res) => {
  try {
    const query = {};
    if (req.user && req.user.role !== 'admin') {
      query.assignedTo = req.user._id;
    } else if ((req.admin || (req.user && req.user.role === 'admin')) && req.query.userId) {
      query.assignedTo = req.query.userId;
    }

    const tasks = await Task.find(query)
      .populate("assignedTo", "name username role")
      .populate("assignedBy", "username")
      .populate("bookings", "bookingId serviceType status trackingId senderDetails receiverDetails createdAt")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 3. User: Update task status (e.g. mark completed)
router.put("/:id/complete", anyAuth, upload.single("completionImage"), async (req, res) => {
  try {
    const { completionNote } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Authorization check
    if (req.user && task.assignedTo.toString() !== req.user._id.toString() && !req.admin) {
      return res.status(403).json({ message: "Not authorized to update this task" });
    }

    task.status = "completed";
    task.completedAt = new Date();
    if (completionNote) task.completionNote = completionNote;
    if (req.file) task.completionImage = `/uploads/tasks/${req.file.filename}`;

    await task.save();
    res.json({ message: "Task completed", task });
  } catch (error) {
    console.error("Complete task error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update generic status (e.g. in-progress)
router.put("/:id/status", anyAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (req.user && task.assignedTo.toString() !== req.user._id.toString() && !req.admin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    task.status = status;
    if (status !== "completed") task.completedAt = null;

    await task.save();
    res.json({ message: "Status updated", task });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Add comment
router.post("/:id/comments", anyAuth, async (req, res) => {
  try {
    const { message } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const isUser = !!req.user;
    const isAdminRole = isUser && req.user.role === 'admin';
    const isSystemAdmin = !!req.admin;
    
    task.comments.push({
      userId: isSystemAdmin ? req.admin._id : req.user._id,
      userModel: (isSystemAdmin || isAdminRole) ? 'Admin' : 'User',
      name: isSystemAdmin ? req.admin.username : req.user.name,
      message
    });

    await task.save();
    res.json({ message: "Comment added", task });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Reassign task (Admin only)
router.put("/:id/reassign", adminAuth, async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.assignedTo = assignedTo;
    await task.save();
    res.json({ message: "Task reassigned", task });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// 4. Admin: Get user performance (Tasks completed today/monthly/all)
router.get("/performance", adminAuth, async (req, res) => {
  try {
    const { timeframe } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    if (timeframe === 'monthly') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { $gte: startOfMonth };
    } else if (timeframe === 'all') {
      dateFilter = { $exists: true };
    } else {
      // default to today
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateFilter = { $gte: startOfToday };
    }

    const performance = await Task.aggregate([
      {
        $match: {
          status: "completed",
          completedAt: dateFilter
        }
      },
      {
        $group: {
          _id: "$assignedTo",
          tasksCompleted: { $sum: 1 },
          bookingsProcessed: { $sum: { $size: "$bookings" } }
        }
      },
      {
        $lookup: {
          from: "intake_users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $unwind: "$user"
      },
      {
        $project: {
          _id: 1,
          tasksCompleted: 1,
          bookingsProcessed: 1,
          "user.name": 1,
          "user.username": 1
        }
      }
    ]);

    res.json(performance);
  } catch (error) {
    console.error("Performance stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 5. Admin: Get unassigned bookings to assign (filter by status or search)
router.get("/unassigned-bookings", adminAuth, async (req, res) => {
    try {
      const { status, search } = req.query;
      
      let query = {};
      
      // Default to "in-transit" if no search or status provided
      if (status) {
        if (status !== "all") query.status = status;
      } else if (!search) {
        query.status = "in-transit";
      }

      if (search) {
        query.bookingId = { $regex: search, $options: "i" };
      }

      // Find bookings based on query
      const bookings = await Booking.find(query)
        .select("bookingId trackingId serviceType status senderDetails receiverDetails createdAt")
        .limit(200); // Limit to prevent massive payload if 'all' is selected
  
      // Find all bookings currently assigned in pending/in-progress tasks
      const activeTasks = await Task.find({ status: { $ne: "completed" } });
      let assignedBookingIds = new Set();
      activeTasks.forEach(task => {
        task.bookings.forEach(id => assignedBookingIds.add(id.toString()));
      });
  
      // Filter out assigned bookings
      const unassigned = bookings.filter(b => !assignedBookingIds.has(b._id.toString()));
  
      res.json(unassigned);
    } catch (error) {
      console.error("Get unassigned bookings error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

module.exports = router;
