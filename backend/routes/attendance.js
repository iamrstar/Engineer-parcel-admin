const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendance");
const Task = require("../models/Task");
const Office = require("../models/Office");
const GeofenceSetting = require("../models/GeofenceSetting");
const adminAuth = require("../middleware/adminAuth");
const userAuth = require("../middleware/userAuth");

// Haversine formula to compute distance in meters between two GPS coordinates
function calculateDistanceInMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
  const R = 6371e3; // Earth radius in metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Helper to get local date string YYYY-MM-DD for uniqueness
const getTodayDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 1. User: Mark attendance with Multi-Office & Task Geofence verification
router.post("/mark", userAuth, async (req, res) => {
  try {
    const todayStr = getTodayDateString();
    const { latitude, longitude, accuracy } = req.body || {};

    // Get active multi-office geofence settings
    const setting = (await GeofenceSetting.findOne()) || {
      globalMode: "offices_only",
      enforceGeofence: true,
      authorizedLocations: [
        {
          id: "office_1",
          name: "Engineers Parcel Head Office (IIT ISM Dhanbad)",
          placeId: "ChIJO9LYJiignysRoxbn5RCefB4",
          latitude: 23.814343,
          longitude: 86.441198,
          radiusMeters: 1500,
          isActive: true
        },
        {
          id: "office_2",
          name: "Engineers Parcel Second Office",
          placeId: "ChIJO6nl04679jkR9J18NwQUqVo",
          latitude: 23.812500,
          longitude: 86.440000,
          radiusMeters: 1000,
          isActive: true
        }
      ]
    };

    let inGeofence = false;
    let distanceMeters = 0;
    let verifiedOfficeName = "Outside Authorized Area";
    let verifiedPlaceId = "ChIJO9LYJiignysRoxbn5RCefB4";

    const userRole = req.user.role;
    const userLocationMode = req.user.locationAccessMode || "offices_only";

    // 1. Admin exemption - Admins can work from anywhere worldwide, login & logout from anywhere
    if (userRole === "admin" || userRole === "office_admin" || (req.user.permissions && req.user.permissions.includes("ALL"))) {
      inGeofence = true;
      verifiedOfficeName = "Admin Unrestricted (Worldwide)";
    }
    // 2. User assigned Global Access or System Global Mode
    else if (userLocationMode === "global" || setting.globalMode === "global" || !setting.enforceGeofence) {
      inGeofence = true;
      verifiedOfficeName = "Global Remote Access";
    }
    // 3. User assigned Pan-India Access or System Pan-India Mode
    else if (userLocationMode === "pan_india" || setting.globalMode === "pan_india") {
      const isWithinIndia = latitude >= 6.5 && latitude <= 37.5 && longitude >= 68.0 && longitude <= 97.5;
      inGeofence = isWithinIndia || !latitude;
      verifiedOfficeName = inGeofence ? "Pan-India Access" : "Outside India";
    }
    // 4. Check if staff has an active task with field / remote permissions
    else {
      const activeRemoteTask = await Task.findOne({
        assignedTo: req.user._id,
        status: { $in: ["pending", "in-progress"] },
        locationScope: { $in: ["pan_india", "global", "task_location"] }
      });

      if (activeRemoteTask) {
        if (activeRemoteTask.locationScope === "global" || activeRemoteTask.locationScope === "pan_india") {
          inGeofence = true;
          verifiedOfficeName = `Task Authorized (${activeRemoteTask.title})`;
        } else if (activeRemoteTask.locationScope === "task_location" && activeRemoteTask.locationDetails?.latitude) {
          const taskDist = calculateDistanceInMeters(
            Number(latitude),
            Number(longitude),
            activeRemoteTask.locationDetails.latitude,
            activeRemoteTask.locationDetails.longitude
          );
          if (taskDist <= (activeRemoteTask.locationDetails.radiusMeters || 500)) {
            inGeofence = true;
            distanceMeters = taskDist;
            verifiedOfficeName = `Task Location (${activeRemoteTask.title})`;
            verifiedPlaceId = activeRemoteTask.locationDetails.placeId || "";
          }
        }
      }

      // 5. Check against all active authorized office locations (Office 1, Office 2, etc.)
      if (!inGeofence && latitude && longitude) {
        const activeOffices = (setting.authorizedLocations || []).filter(l => l.isActive);
        let minDistance = 999999999;
        let closestOffice = null;

        for (const loc of activeOffices) {
          const dist = calculateDistanceInMeters(
            Number(latitude),
            Number(longitude),
            loc.latitude,
            loc.longitude
          );
          if (dist < minDistance) {
            minDistance = dist;
            closestOffice = loc;
          }
            const effectiveRadius = (loc.radiusMeters || 1500) + Math.min(Number(accuracy) || 0, 300);
            if (dist <= effectiveRadius) {
              inGeofence = true;
              distanceMeters = dist;
              verifiedOfficeName = loc.name;
              verifiedPlaceId = loc.placeId;
              break;
            }
          }

          if (!inGeofence && closestOffice) {
            distanceMeters = minDistance;
            verifiedPlaceId = closestOffice.placeId;
            verifiedOfficeName = `Outside (${closestOffice.name})`;
          }
        }
      }

      // Check if already marked today
      let attendance = await Attendance.findOne({ user: req.user._id, date: todayStr });

      if (attendance) {
        if (!attendance.location?.latitude && latitude && longitude) {
          attendance.location = {
            latitude: Number(latitude),
            longitude: Number(longitude),
            accuracy: Number(accuracy) || 0,
            distanceMeters,
            inGeofence,
            placeId: verifiedPlaceId,
            officeName: verifiedOfficeName,
            verifiedAt: new Date()
          };
          await attendance.save();
        }
        return res.status(200).json({
          message: "Attendance already marked for today",
          attendance,
          inGeofence,
          distanceMeters,
          officeName: verifiedOfficeName
        });
      }

      const now = new Date();
      const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

      const isLate = (istTime.getHours() > 10) || (istTime.getHours() === 10 && istTime.getMinutes() > 30);

      let status = isLate ? "Late" : "Present";
      if (!inGeofence && userRole !== "admin" && userRole !== "office_admin") {
        status = "Outside Geofence";
      }

      attendance = new Attendance({
        user: req.user._id,
        date: todayStr,
        firstLoginAt: now,
        status,
        location: {
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          accuracy: accuracy ? Number(accuracy) : null,
          distanceMeters,
          inGeofence,
          placeId: verifiedPlaceId,
          officeName: verifiedOfficeName,
          verifiedAt: now
        }
      });

      await attendance.save();
      res.status(201).json({
        message: inGeofence ? `Attendance verified at ${verifiedOfficeName}` : "Attendance recorded outside authorized workplace",
        attendance,
        inGeofence,
        distanceMeters,
        officeName: verifiedOfficeName
      });
    } catch (error) {
      if (error.code === 11000) {
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
        location: record.location,
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
