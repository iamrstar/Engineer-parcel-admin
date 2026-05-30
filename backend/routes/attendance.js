const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendance");
const Task = require("../models/Task");
const adminAuth = require("../middleware/adminAuth");
const userAuth = require("../middleware/userAuth");

// Helper to get local date string YYYY-MM-DD for uniqueness
const getTodayDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 1. User: Mark attendance
// This is called silently on frontend app load / login
router.post("/mark", userAuth, async (req, res) => {
  try {
    const todayStr = getTodayDateString();
    
    // Check if already marked today
    let attendance = await Attendance.findOne({ user: req.user._id, date: todayStr });
    
    if (attendance) {
      return res.status(200).json({ message: "Attendance already marked for today", attendance });
    }

    const now = new Date();
    // Check if late (after 9:30 AM local time)
    // Adjusting to local time logic - simplest is to check hours/minutes of current Date object.
    const isLate = (now.getHours() > 9) || (now.getHours() === 9 && now.getMinutes() > 30);

    attendance = new Attendance({
      user: req.user._id,
      date: todayStr,
      firstLoginAt: now,
      status: isLate ? "Late" : "Present"
    });

    await attendance.save();
    res.status(201).json({ message: "Attendance marked successfully", attendance });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error, already marked
      return res.status(200).json({ message: "Attendance already marked" });
    }
    console.error("Mark attendance error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 2. Admin: Get all attendance records (with optional date filter)
router.get("/", adminAuth, async (req, res) => {
  try {
    const dateFilter = req.query.date || getTodayDateString();
    
    const records = await Attendance.find({ date: dateFilter })
      .populate("user", "name username role")
      .sort({ firstLoginAt: 1 });

    res.json(records);
  } catch (error) {
    console.error("Get attendance error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 3. Admin: Get attendance & task report
router.get("/report", adminAuth, async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    
    // Parse dates to JS Dates for task querying
    const start = startDate ? new Date(startDate) : new Date(getTodayDateString());
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date(getTodayDateString());
    end.setHours(23, 59, 59, 999);

    // Get attendance records
    let attendanceQuery = {};
    if (startDate && endDate) {
      attendanceQuery.date = { $gte: startDate, $lte: endDate };
    } else {
       attendanceQuery.date = getTodayDateString();
    }
    
    if (userId) {
      attendanceQuery.user = userId;
    }

    const attendanceRecords = await Attendance.find(attendanceQuery).populate("user", "name username role");

    // Get completed tasks in this date range
    let taskQuery = {
      status: "completed",
      completedAt: { $gte: start, $lte: end }
    };
    if (userId) {
      taskQuery.assignedTo = userId;
    }
    
    const completedTasks = await Task.find(taskQuery).populate("assignedTo", "name username");

    let reportMap = {}; // key: "YYYY-MM-DD_userId"

    attendanceRecords.forEach(record => {
      const key = `${record.date}_${record.user._id}`;
      reportMap[key] = {
        date: record.date,
        user: record.user,
        attendanceStatus: record.status,
        firstLoginAt: record.firstLoginAt,
        tasksCompleted: 0,
        tasks: []
      };
    });

    completedTasks.forEach(task => {
      // get local date string of completion
      const compDate = new Date(task.completedAt);
      const dateStr = `${compDate.getFullYear()}-${String(compDate.getMonth() + 1).padStart(2, '0')}-${String(compDate.getDate()).padStart(2, '0')}`;
      const userIdStr = task.assignedTo._id.toString();
      const key = `${dateStr}_${userIdStr}`;
      
      if (!reportMap[key]) {
        reportMap[key] = {
          date: dateStr,
          user: task.assignedTo,
          attendanceStatus: "Not Marked",
          firstLoginAt: null,
          tasksCompleted: 0,
          tasks: []
        };
      }
      
      reportMap[key].tasksCompleted += 1;
      reportMap[key].tasks.push({
        title: task.title,
        completedAt: task.completedAt
      });
    });

    // Convert map to array
    const reportData = Object.values(reportMap).sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date); // descending date
        return a.user.name.localeCompare(b.user.name);
    });

    res.json(reportData);
  } catch (error) {
    console.error("Get report error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
