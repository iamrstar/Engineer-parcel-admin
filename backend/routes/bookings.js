const express = require("express");
const Booking = require("../models/Booking");
const DocketInventory = require("../models/DocketInventory");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const Razorpay = require("razorpay");
const { generateReceiptPDF, generateOfficeLabelPDF } = require("../utils/pdfService");
const sendEmail = require("../utils/sendEmail");
const Partner = require("../models/Partner");
const Attendance = require("../models/Attendance");
const PerformanceMark = require("../models/PerformanceMark");
const User = require("../models/User");

// Initialize Razorpay
let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../uploads/payments");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer for payment proofs
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "payment-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const uploadPaymentProof = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 }, // 100KB limit
});

/** ------------------------
 * 🛠️ Regex & Courier Matching Helpers
 * ------------------------ */
const escapeRegex = (str) => {
  if (!str || typeof str !== "string") return "";
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const getCourierRegex = (filterVal) => {
  if (!filterVal) return null;
  const val = filterVal.trim().toLowerCase();
  if (val.includes("hirak")) return /hirak/i;
  if (val.includes("sanjay")) return /sanjay/i;
  if (val.includes("safe") || val.includes("safex")) return /safe\s*express|safex/i;
  if (val.includes("india post")) return /india\s*post/i;
  if (val.includes("i carry") || val.includes("icarry") || val === "icl") return /i\s*carry|icl/i;
  return new RegExp(escapeRegex(filterVal.trim()), "i");
};

/** ------------------------
 * 📧 Helper: Send Delivery Email
 * ------------------------ */
const sendDeliveryEmail = async (booking) => {
  try {
    // Check if office has delivery emails enabled
    if (booking.officeId) {
      try {
        const Office = require("../models/Office");
        const office = await Office.findById(booking.officeId);
        if (office && office.enableDeliveryEmail === false) {
          return; // Skip delivery email for this office
        }
      } catch (err) { }
    }
    const sendEmail = require("../utils/sendEmail");
    const reviewLink = "https://search.google.com/local/writereview?placeid=ChIJO9LYJiignysRoxbn5RCefB4";

    const emailHtml = `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 20px;">
           <h1 style="color: #059669; margin: 0;">Delivered! 📦</h1>
           <p style="color: #666; margin-top: 5px;">Shipment ${booking.bookingId}</p>
        </div>
        <p>Hello,</p>
        <p>Good news! Your shipment <strong>${booking.bookingId}</strong> has been successfully delivered.</p>
        <p>We hope you are satisfied with our service. It was a pleasure serving you!</p>
        
        <div style="margin: 30px 0; padding: 25px; border-radius: 16px; background: #f0fdf4; border: 1px solid #bcf0da; text-align: center;">
          <h3 style="margin-top: 0; color: #065f46;">Rate Your Experience</h3>
          <p style="font-size: 14px; color: #047857;">Could you spare 1 minute to rate us on Google? Your feedback helps us serve you better!</p>
          <a href="${reviewLink}" style="display: inline-block; margin-top: 10px; padding: 14px 28px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">Write a Review</a>
        </div>

        <p style="margin-bottom: 0;">Thank you for choosing <strong>Engineers Parcel</strong>!</p>
        <p style="color: #666; font-size: 14px;">Team Engineers Parcel</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">This is an automated notification. Please do not reply to this email.</p>
      </div>
    `;

    const recipients = [booking.senderDetails?.email, booking.receiverDetails?.email].filter(Boolean);

    if (recipients.length > 0) {
      await sendEmail({
        to: recipients.join(","),
        subject: `Delivered: Shipment ${booking.bookingId} - Engineers Parcel`,
        html: emailHtml
      });
      console.log(`✅ Delivery email sent for ${booking.bookingId} to ${recipients.length} recipients`);
    }
  } catch (error) {
    console.error(`❌ Delivery email failed for ${booking.bookingId}:`, error);
  }
};

/** ------------------------
 * 📊 Performance Leaderboard
 * ------------------------ */
router.get("/stats/performance-leaderboard", adminAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Date filter for bookings and marks
    let dateFilterQuery = {};
    // Date string filter for attendance (YYYY-MM-DD)
    let attendanceDateQuery = {};

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      dateFilterQuery = {
        $gte: start,
        $lte: end
      };

      const startStr = new Date(startDate).toISOString().split('T')[0];
      const endStr = new Date(endDate).toISOString().split('T')[0];
      attendanceDateQuery = {
        $gte: startStr,
        $lte: endStr
      };
    }

    // 1. Fetch Bookings
    const bookingQuery = dateFilterQuery.$gte ? { createdAt: dateFilterQuery } : {};
    const bookings = await Booking.find(bookingQuery)
      .populate('salesAgent', 'name username role phone')
      .populate('handlingAgent', 'name username role phone')
      .populate('packagingAgent', 'name username role phone')
      .lean();

    // 2. Fetch Attendance
    const attendanceQuery = attendanceDateQuery.$gte ? { date: attendanceDateQuery } : {};
    const attendances = await Attendance.find(attendanceQuery).populate('user', 'name username role phone').lean();

    // 3. Fetch Marks
    const markQuery = dateFilterQuery.$gte ? { createdAt: dateFilterQuery } : {};
    const marks = await PerformanceMark.find(markQuery).populate('user', 'name username role phone').lean();

    const performanceMap = {};

    const initUser = (user) => {
      if (!user || !user._id) return;
      const id = user._id.toString();
      if (!performanceMap[id]) {
        performanceMap[id] = {
          _id: id,
          userId: id,
          name: user.name || user.username || "Unknown User",
          username: user.username || "",
          phone: user.phone || "",
          role: user.role || "staff",
          attendancePoints: 0,
          orderPoints: 0,
          adminPoints: 0,
          totalPoints: 0,
          salesCount: 0,
          handlingCount: 0,
          packagingCount: 0,
          salesOrders: [],
          handlingOrders: [],
          packagingOrders: [],
          presentCount: 0,
          lateCount: 0,
        };
      } else {
        if (!performanceMap[id].username && user.username) {
          performanceMap[id].username = user.username;
        }
        if (!performanceMap[id].phone && user.phone) {
          performanceMap[id].phone = user.phone;
        }
        if ((!performanceMap[id].name || performanceMap[id].name === "Unknown User") && user.name) {
          performanceMap[id].name = user.name;
        }
      }
    };

    // Calculate Attendance Points
    attendances.forEach(att => {
      if (att.user) {
        initUser(att.user);

        let isLate = false;
        if (att.firstLoginAt) {
          const istTime = new Date(att.firstLoginAt.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
          isLate = (istTime.getHours() > 10) || (istTime.getHours() === 10 && istTime.getMinutes() > 30);
        } else {
          isLate = att.status === 'Late';
        }

        // They showed up, so they are Present
        performanceMap[att.user._id.toString()].attendancePoints += 10;
        performanceMap[att.user._id.toString()].presentCount += 1;

        // If they were late, apply the late deduction
        if (isLate) {
          performanceMap[att.user._id.toString()].attendancePoints -= 5;
          performanceMap[att.user._id.toString()].lateCount += 1;
        }
      }
    });

    // Calculate Order Points
    bookings.forEach(booking => {
      // Only partner vendor bookings (PARTxxx) are vendor orders.
      // Courier partners (DTDC, BlueDart, etc.) assigned to normal bookings are NOT vendor bookings.
      const isVendorOrder = Boolean(
        booking.isVendorBooking ||
        (booking.vendorId && booking.vendorId.trim() !== "")
      );

      const orderItem = {
        _id: booking._id,
        bookingId: booking.bookingId || `EP-${booking._id.toString().slice(-6).toUpperCase()}`,
        customerName: booking.senderDetails?.name || "N/A",
        serviceType: booking.serviceType || "Standard",
        status: booking.status || "Booked",
        createdAt: booking.createdAt,
      };

      if (booking.salesAgent) {
        initUser(booking.salesAgent);
        const sId = booking.salesAgent._id.toString();
        performanceMap[sId].orderPoints += 2;
        performanceMap[sId].salesCount += 1;
        performanceMap[sId].salesOrders.push({
          ...orderItem,
          roleType: 'sales',
          points: 2
        });
      }
      if (booking.handlingAgent) {
        initUser(booking.handlingAgent);
        const hId = booking.handlingAgent._id.toString();
        performanceMap[hId].orderPoints += 1;
        performanceMap[hId].handlingCount += 1;
        performanceMap[hId].handlingOrders.push({
          ...orderItem,
          roleType: 'handling',
          points: 1
        });
      }

      if (booking.packagingAgent) {
        initUser(booking.packagingAgent);
        const pId = booking.packagingAgent._id.toString();
        performanceMap[pId].orderPoints += 1;
        performanceMap[pId].packagingCount += 1;
        performanceMap[pId].packagingOrders.push({
          ...orderItem,
          roleType: 'packaging',
          points: 1
        });
      }
    });

    // Calculate Admin Marks
    marks.forEach(mark => {
      if (mark.user) {
        initUser(mark.user);
        performanceMap[mark.user._id.toString()].adminPoints += mark.points;
      }
    });

    const requesterRole = (req.admin?.role || "admin").toLowerCase();
    const isRequesterAdmin = ['admin', 'main_admin', 'office_admin'].includes(requesterRole);

    // Initialize all active staff in performanceMap so all staff members appear on the leaderboard
    const allActiveStaff = await User.find({ isActive: true }).select('name username role phone');
    allActiveStaff.forEach(u => {
      initUser(u);
    });

    // Calculate Total, rank and sort
    const leaderboard = Object.values(performanceMap)
      .filter(user => {
        const role = (user.role || "staff").toLowerCase();
        return role !== "admin" && role !== "main_admin";
      })
      .map(user => {
        user.totalPoints = user.attendancePoints + user.orderPoints + user.adminPoints;
        return user;
      })
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((user, index) => {
        user.rank = index + 1;
        return user;
      });

    res.json(leaderboard);
  } catch (error) {
    console.error('Performance Leaderboard Error:', error);
    res.status(500).json({ error: 'Failed to fetch performance leaderboard' });
  }
});

/** ------------------------
 * 📊 Incentive Detailed Report
 * ------------------------ */
router.get("/stats/incentive-report", adminAuth, async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;

    let dateFilterQuery = {};

    if (startDate && endDate) {
      dateFilterQuery = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const bookingQuery = dateFilterQuery.$gte ? { createdAt: dateFilterQuery } : {};

    // Only fetch bookings where handlingAgent or packagingAgent exists
    bookingQuery.$or = [
      { handlingAgent: { $exists: true, $ne: null } },
      { packagingAgent: { $exists: true, $ne: null } }
    ];

    const bookings = await Booking.find(bookingQuery)
      .populate('handlingAgent', 'name role')
      .populate('packagingAgent', 'name role')
      .select('bookingId createdAt pricing handlingAgent packagingAgent isVendorBooking vendorId vendorName')
      .lean();

    const incentiveEvents = [];

    bookings.forEach(booking => {
      const isVendorOrder = Boolean(
        booking.isVendorBooking ||
        (booking.vendorId && booking.vendorId.trim() !== "")
      );

      const totalAmount = booking.pricing?.totalAmount || 0;
      const maxIncentive = Math.min(500, totalAmount * 0.05); // 5% max 500
      const splitIncentive = maxIncentive / 2; // 2.5% max 250

      if (splitIncentive <= 0) return;

      // Check Handling Agent (Blocked for vendor-assigned orders)
      if (booking.handlingAgent && !isVendorOrder) {
        if (!userId || userId === 'all' || booking.handlingAgent._id.toString() === userId) {
          incentiveEvents.push({
            bookingId: booking.bookingId,
            date: booking.createdAt,
            staffId: booking.handlingAgent._id,
            staffName: booking.handlingAgent.name,
            role: 'Handled by',
            orderValue: totalAmount,
            incentiveEarned: splitIncentive
          });
        }
      }

      // Check Packaging Agent (Dispatch by - Allowed for vendor orders)
      if (booking.packagingAgent) {
        if (!userId || userId === 'all' || booking.packagingAgent._id.toString() === userId) {
          incentiveEvents.push({
            bookingId: booking.bookingId,
            date: booking.createdAt,
            staffId: booking.packagingAgent._id,
            staffName: booking.packagingAgent.name,
            role: 'Dispatch by',
            orderValue: totalAmount,
            incentiveEarned: splitIncentive
          });
        }
      }
    });

    // Sort by date descending
    incentiveEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(incentiveEvents);
  } catch (error) {
    console.error('Incentive Report Error:', error);
    res.status(500).json({ error: 'Failed to fetch incentive report' });
  }
});

router.post("/stats/performance-marks", adminAuth, async (req, res) => {
  try {
    const { userId, points, reason } = req.body;

    if (!userId || points === undefined || !reason) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const d = new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const mark = new PerformanceMark({
      user: userId,
      points: Number(points),
      reason,
      date: dateStr,
      awardedBy: req.admin.id
    });

    await mark.save();
    res.status(201).json({ message: "Performance mark awarded successfully", mark });
  } catch (error) {
    console.error('Add Performance Mark Error:', error);
    res.status(500).json({ message: 'Failed to add performance mark' });
  }
});

router.get("/stats/performance-marks/:userId", adminAuth, async (req, res) => {
  try {
    const marks = await PerformanceMark.find({ user: req.params.userId })
      .populate('awardedBy', 'username')
      .sort({ createdAt: -1 });
    res.json(marks);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch performance marks' });
  }
});

/** ------------------------
 * 📊 Dashboard & Test Routes
 * ------------------------ */
router.get("/stats/dashboard", authMiddleware, async (req, res) => {
  try {
    const query = {};
    if (req.user && req.user.officeId) {
      query.officeId = req.user.officeId;
    } else if (req.query.officeId && req.query.officeId !== "all") {
      query.officeId = req.query.officeId;
    }

    const { paymentStatus, serviceType, bookingStatus, startDate, endDate } = req.query;

    if (paymentStatus && paymentStatus !== "all") {
      if (paymentStatus === "unpaid") {
        query.paymentStatus = { $ne: "paid" };
      } else {
        query.paymentStatus = paymentStatus;
      }
    }

    if (serviceType && serviceType !== "all") {
      query.serviceType = serviceType;
    }

    if (bookingStatus && bookingStatus !== "all") {
      if (bookingStatus === "active") {
        query.status = { $ne: "cancelled" };
      } else if (bookingStatus === "cancelled") {
        query.status = "cancelled";
      }
    }

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      const end = endDate ? new Date(endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);

      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          {
            isVendorBooking: true,
            pickupDate: {
              ...(start && { $gte: start }),
              ...(end && { $lte: end })
            }
          },
          {
            $or: [
              { isVendorBooking: false },
              { isVendorBooking: { $exists: false } },
              { isVendorBooking: null }
            ],
            createdAt: {
              ...(start && { $gte: start }),
              ...(end && { $lte: end })
            }
          }
        ]
      });
    }

    const totalBookings = await Booking.countDocuments(query);
    const pendingBookings = await Booking.countDocuments({ ...query, status: "pending" });
    const deliveredBookings = await Booking.countDocuments({ ...query, status: "delivered" });
    const inTransitBookings = await Booking.countDocuments({ ...query, status: "in-transit" });

    // Use query for totalRevenue match, but if bookingStatus wasn't provided, default to active for revenue only (to match original behavior, or let user explicitly ask for all)
    const revenueQuery = { ...query };
    if (!bookingStatus || bookingStatus === "active") {
      revenueQuery.status = { $ne: "cancelled" };
    }

    const totalRevenue = await Booking.aggregate([
      { $match: revenueQuery },
      { $group: { _id: null, total: { $sum: { $convert: { input: "$pricing.totalAmount", to: "double", onError: 0, onNull: 0 } } } } },
    ]);

    res.json({
      totalBookings,
      pendingBookings,
      deliveredBookings,
      inTransitBookings,
      totalRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/stats/pending-recent", authMiddleware, async (req, res) => {
  try {
    const query = { status: "pending" };
    if (req.user && req.user.officeId) {
      query.officeId = req.user.officeId;
    } else if (req.query.officeId && req.query.officeId !== "all") {
      query.officeId = req.query.officeId;
    }

    const recentPending = await Booking.find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .select("bookingId senderDetails receiverDetails serviceType pricing createdAt");

    res.json(recentPending);
  } catch (error) {
    console.error("Error fetching recent pending:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/test-log", (req, res) => {
  console.log("✅ /api/bookings/test-log route hit");
  res.send("Test log working");
});

/** ------------------------
 * 📊 Sales Report Route
 * ------------------------ */
router.get("/sales/report", adminAuth, async (req, res) => {
  try {
    const { startDate, endDate, serviceType, paymentStatus, bookingStatus } = req.query;
    // Base match: default to non-cancelled unless specified
    const match = {};
    if (bookingStatus === "all") {
      // no status filter
    } else if (bookingStatus === "cancelled") {
      match.status = "cancelled";
    } else {
      match.status = { $ne: "cancelled" };
    }

    // Separate match for cancelled bookings tracking (same date/service filters but status=cancelled)
    const cancelledMatch = { status: "cancelled" };

    // Date filtering: vendor bookings use pickupDate, non-vendor use createdAt
    const dateFilter = {};
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      const end = endDate ? new Date(endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);

      dateFilter.$or = [
        {
          isVendorBooking: true,
          pickupDate: {
            ...(start && { $gte: start }),
            ...(end && { $lte: end })
          }
        },
        {
          $or: [
            { isVendorBooking: false },
            { isVendorBooking: { $exists: false } },
            { isVendorBooking: null }
          ],
          createdAt: {
            ...(start && { $gte: start }),
            ...(end && { $lte: end })
          }
        }
      ];
      match.$or = dateFilter.$or;
      cancelledMatch.$or = dateFilter.$or;
    }

    if (serviceType && serviceType !== "all") {
      match.serviceType = serviceType;
      cancelledMatch.serviceType = serviceType;
    }

    if (paymentStatus && paymentStatus !== "all") {
      if (paymentStatus === "due") {
        match.paymentStatus = { $ne: "paid" };
        cancelledMatch.paymentStatus = { $ne: "paid" };
      } else {
        match.paymentStatus = paymentStatus;
        cancelledMatch.paymentStatus = paymentStatus;
      }
    }

    if (req.admin && req.admin.officeId) {
      match.officeId = req.admin.officeId;
      cancelledMatch.officeId = req.admin.officeId;
    } else if (req.query.officeId && req.query.officeId !== "all") {
      match.officeId = req.query.officeId;
      cancelledMatch.officeId = req.query.officeId;
    }

    // Shared $addFields for effectiveDate
    const effectiveDateStage = {
      $addFields: {
        effectiveDate: {
          $cond: {
            if: { $and: [{ $eq: ["$isVendorBooking", true] }, { $ne: ["$pickupDate", null] }] },
            then: "$pickupDate",
            else: "$createdAt"
          }
        }
      }
    };

    // Determine grouping format: daily if date range is given, otherwise monthly
    const dateFormat = (startDate && endDate) ? "%Y-%m-%d" : "%Y-%m";

    // 1️⃣ Monthly/Daily report data (existing)
    const reportData = await Booking.aggregate([
      { $match: match },
      effectiveDateStage,
      { $match: { effectiveDate: { $ne: null } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$effectiveDate", timezone: "Asia/Kolkata" } },
          totalAmount: {
            $sum: { $convert: { input: "$pricing.totalAmount", to: "double", onError: 0, onNull: 0 } }
          },
          collectedAmount: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "paid"] }, { $convert: { input: "$pricing.totalAmount", to: "double", onError: 0, onNull: 0 } }, 0]
            }
          },
          totalBookings: { $sum: 1 },
          dueOrders: {
            $sum: {
              $cond: [
                { $lte: [{ $convert: { input: "$pricing.totalAmount", to: "double", onError: 0, onNull: 0 } }, 0] },
                1, 0
              ]
            }
          },
          paidOrders: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0]
            }
          },
          // COD vs Online split
          codAmount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$paymentStatus", "paid"] }, { $eq: ["$paymentMethod", "COD"] }] },
                { $convert: { input: "$pricing.totalAmount", to: "double", onError: 0, onNull: 0 } }, 0
              ]
            }
          },
          codOrders: {
            $sum: {
              $cond: [{ $eq: ["$paymentMethod", "COD"] }, 1, 0]
            }
          },
          onlineAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$paymentStatus", "paid"] },
                    { $in: ["$paymentMethod", ["online", "Online"]] }
                  ]
                },
                { $convert: { input: "$pricing.totalAmount", to: "double", onError: 0, onNull: 0 } }, 0
              ]
            }
          },
          onlineOrders: {
            $sum: {
              $cond: [{ $in: ["$paymentMethod", ["online", "Online"]] }, 1, 0]
            }
          }
        }
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { _id: -1 } },
      {
        $project: {
          _id: 0,
          month: "$_id",
          totalAmount: 1,
          collectedAmount: 1,
          totalBookings: 1,
          dueOrders: 1,
          paidOrders: 1,
          codAmount: 1,
          codOrders: 1,
          onlineAmount: 1,
          onlineOrders: 1
        }
      }
    ]);

    // 2️⃣ Service-wise breakdown
    const serviceBreakdown = await Booking.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$serviceType",
          totalBookings: { $sum: 1 },
          totalRevenue: {
            $sum: { $convert: { input: "$pricing.totalAmount", to: "double", onError: 0, onNull: 0 } }
          },
          collectedRevenue: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "paid"] }, { $convert: { input: "$pricing.totalAmount", to: "double", onError: 0, onNull: 0 } }, 0]
            }
          },
          paidOrders: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0]
            }
          }
        }
      },
      { $sort: { totalRevenue: -1 } },
      {
        $project: {
          _id: 0,
          serviceType: "$_id",
          totalBookings: 1,
          totalRevenue: 1,
          collectedRevenue: 1,
          paidOrders: 1
        }
      }
    ]);

    // 3️⃣ Cancelled orders by month
    const cancelledData = await Booking.aggregate([
      { $match: cancelledMatch },
      effectiveDateStage,
      { $match: { effectiveDate: { $ne: null } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$effectiveDate", timezone: "Asia/Kolkata" } },
          cancelledCount: { $sum: 1 },
          cancelledAmount: { $sum: { $ifNull: ["$pricing.totalAmount", 0] } }
        }
      },
      { $sort: { _id: -1 } },
      {
        $project: {
          _id: 0,
          month: "$_id",
          cancelledCount: 1,
          cancelledAmount: 1
        }
      }
    ]);

    res.json({ success: true, reportData, serviceBreakdown, cancelledData });
  } catch (error) {
    console.error("Sales Report Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/** ------------------------
 * 📦 Get all bookings
 * ------------------------ */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, serviceType, search, startDate, endDate, createdBy } = req.query;
    const query = {};

    if (createdBy && createdBy !== "all") {
      query.createdBy = createdBy;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (serviceType && serviceType !== "all") {
      query.serviceType = serviceType;
    }

    if (req.user && req.user.officeId) {
      // If regular user/office admin, restrict to their office
      query.officeId = req.user.officeId;
    } else if (req.query.officeId && req.query.officeId !== "all") {
      // If main admin, allow filtering by officeId
      if (req.query.officeId === "main") {
        query.officeId = { $in: [null, undefined] };
      } else {
        query.officeId = req.query.officeId;
      }
    }

    // Courier (Shipping Carrier) Filtering: DTDC, Delhivery, BlueDart, etc.
    const courierFilterValue = req.query.courierFilter || req.query.vendorFilter;
    if (courierFilterValue && courierFilterValue !== "all") {
      query.$and = query.$and || [];
      if (courierFilterValue === "none") {
        query.$and.push({
          $or: [
            { courierName: { $exists: false } },
            { courierName: "" },
            { courierName: null }
          ]
        });
      } else if (courierFilterValue === "other") {
        query.$and.push({
          courierName: {
            $exists: true,
            $nin: [null, ""],
            $not: /hirak|sanjay|dtdc|bluedart|delhivery|safe\s*express|safex|india\s*post|i\s*carry|icl/i
          }
        });
      } else {
        const courierRegex = getCourierRegex(courierFilterValue);
        query.$and.push({
          $or: [
            { courierName: courierRegex },
            { vendorName: courierRegex }
          ]
        });
      }
    } else if (req.query.vendorNotAssigned === "true") {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { courierName: { $exists: false } },
          { courierName: "" },
          { courierName: null }
        ]
      });
    }

    // Corporate Partner (B2B Client) Filtering: Anand Cure, Hancore, Direct Customers, etc.
    if (req.query.partnerFilter && req.query.partnerFilter !== "all") {
      query.$and = query.$and || [];
      if (req.query.partnerFilter === "none") {
        // Direct Customers (not a partner booking)
        query.$and.push({
          $or: [
            { isVendorBooking: { $ne: true } },
            { partnerId: { $exists: false } },
            { partnerId: "" },
            { partnerId: null }
          ]
        });
      } else {
        const partnerRegex = new RegExp(escapeRegex(req.query.partnerFilter.trim()), "i");
        query.$and.push({
          $or: [
            { partnerId: req.query.partnerFilter },
            { partnerName: partnerRegex },
            { vendorId: req.query.partnerFilter }
          ]
        });
      }
    }

    // Date Filtering
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      const end = endDate ? new Date(endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);

      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          {
            isVendorBooking: true,
            pickupDate: {
              $exists: true,
              $ne: null,
              ...(start && { $gte: start }),
              ...(end && { $lte: end })
            }
          },
          {
            $or: [
              { isVendorBooking: { $ne: true } },
              { pickupDate: { $in: [null, undefined] } }
            ],
            createdAt: {
              ...(start && { $gte: start }),
              ...(end && { $lte: end })
            }
          }
        ]
      });
    }

    if (search && search.trim()) {
      const cleanSearch = escapeRegex(search.trim());
      const searchOr = [
        { bookingId: { $regex: cleanSearch, $options: "i" } },
        { trackingId: { $regex: cleanSearch, $options: "i" } },
        { vendorTrackingId: { $regex: cleanSearch, $options: "i" } },
        { "senderDetails.name": { $regex: cleanSearch, $options: "i" } },
        { "receiverDetails.name": { $regex: cleanSearch, $options: "i" } },
        { "senderDetails.phone": { $regex: cleanSearch, $options: "i" } },
        { "receiverDetails.phone": { $regex: cleanSearch, $options: "i" } },
      ];
      query.$and = query.$and || [];
      query.$and.push({ $or: searchOr });
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);

    // Snapshot of filter criteria before attention status or payment status is applied
    const verificationStatsMatch = { ...query };
    if (query.$and) verificationStatsMatch.$and = [...query.$and];
    if (query.$or) verificationStatsMatch.$or = [...query.$or];

    // Status Verification and Tracking Update expressions (strictly real courier/tracking updates, ignoring any sync/seed logs)
    const cleanHistoryExpr = {
      $filter: {
        input: { $cond: [{ $isArray: "$trackingHistory" }, "$trackingHistory", []] },
        as: "t",
        cond: {
          $and: [
            { $ne: ["$$t", null] },
            { $not: { $regexMatch: { input: { $ifNull: ["$$t.description", ""] }, regex: /seed|sync to main|verified and seeded|booking verified by/i } } }
          ]
        }
      }
    };

    const effectiveDateExpr = {
      $let: {
        vars: {
          cleanHistory: cleanHistoryExpr
        },
        in: {
          $let: {
            vars: {
              lastTrackElem: {
                $cond: [
                  { $gt: [{ $size: "$$cleanHistory" }, 0] },
                  { $arrayElemAt: ["$$cleanHistory.timestamp", -1] },
                  null
                ]
              }
            },
            in: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$lastCheckedAt", null] },
                    {
                      $or: [
                        { $eq: ["$$lastTrackElem", null] },
                        { $gte: ["$lastCheckedAt", "$$lastTrackElem"] }
                      ]
                    }
                  ]
                },
                "$lastCheckedAt",
                { $ifNull: ["$$lastTrackElem", { $ifNull: ["$createdAt", "$$NOW"] }] }
              ]
            }
          }
        }
      }
    };

    const isCheckedValidExpr = {
      $let: {
        vars: {
          cleanHistory: cleanHistoryExpr
        },
        in: {
          $let: {
            vars: {
              lastTrackElem: {
                $cond: [
                  { $gt: [{ $size: "$$cleanHistory" }, 0] },
                  { $arrayElemAt: ["$$cleanHistory.timestamp", -1] },
                  null
                ]
              }
            },
            in: {
              $and: [
                { $ne: ["$lastCheckedAt", null] },
                {
                  $or: [
                    { $eq: ["$$lastTrackElem", null] },
                    { $gte: ["$lastCheckedAt", "$$lastTrackElem"] }
                  ]
                }
              ]
            }
          }
        }
      }
    };

    // Verification / Attention Status Filtering (Unchecked for 1 day, 2 days, 3+ days)
    const attentionFilter = req.query.attentionFilter;
    if (attentionFilter && attentionFilter !== "all") {
      const activeStatusCondition = { status: { $not: /^\s*(delivered|cancelled)\s*$/i } };
      query.$and = query.$and || [];

      if (attentionFilter === "day3_plus") {
        query.$and.push(activeStatusCondition);
        query.$and.push({
          $expr: { $lt: [effectiveDateExpr, threeDaysAgo] }
        });
      } else if (attentionFilter === "day2") {
        query.$and.push(activeStatusCondition);
        query.$and.push({
          $expr: {
            $and: [
              { $lt: [effectiveDateExpr, twoDaysAgo] },
              { $gte: [effectiveDateExpr, threeDaysAgo] }
            ]
          }
        });
      } else if (attentionFilter === "day1") {
        query.$and.push(activeStatusCondition);
        query.$and.push({
          $expr: {
            $and: [
              { $lt: [effectiveDateExpr, oneDayAgo] },
              { $gte: [effectiveDateExpr, twoDaysAgo] }
            ]
          }
        });
      } else if (attentionFilter === "attention_needed") {
        query.$and.push(activeStatusCondition);
        query.$and.push({
          $expr: { $lt: [effectiveDateExpr, oneDayAgo] }
        });
      } else if (attentionFilter === "checked") {
        query.$and.push({
          $expr: {
            $and: [
              isCheckedValidExpr,
              { $gte: [effectiveDateExpr, oneDayAgo] }
            ]
          }
        });
      }
    }

    // Calculate aggregate payment summary for current filter criteria (prior to applying paymentStatus filter)
    const statsMatch = { ...query };
    if (query.$and) statsMatch.$and = [...query.$and];
    if (query.$or) statsMatch.$or = [...query.$or];

    const paymentStatsPromise = Booking.aggregate([
      { $match: statsMatch },
      {
        $group: {
          _id: null,
          totalPaidAmount: {
            $sum: {
              $cond: [
                { $eq: ["$paymentStatus", "paid"] },
                { $convert: { input: "$pricing.totalAmount", to: "double", onError: 0, onNull: 0 } },
                {
                  $cond: [
                    { $eq: ["$paymentStatus", "partial"] },
                    { $convert: { input: "$amountReceived", to: "double", onError: 0, onNull: 0 } },
                    0
                  ]
                }
              ]
            }
          },
          totalPendingAmount: {
            $sum: {
              $cond: [
                { $eq: ["$paymentStatus", "paid"] },
                0,
                {
                  $cond: [
                    { $eq: ["$paymentStatus", "partial"] },
                    {
                      $max: [
                        0,
                        {
                          $subtract: [
                            { $convert: { input: "$pricing.totalAmount", to: "double", onError: 0, onNull: 0 } },
                            { $convert: { input: "$amountReceived", to: "double", onError: 0, onNull: 0 } }
                          ]
                        }
                      ]
                    },
                    { $convert: { input: "$pricing.totalAmount", to: "double", onError: 0, onNull: 0 } }
                  ]
                }
              ]
            }
          },
          totalAmount: {
            $sum: { $convert: { input: "$pricing.totalAmount", to: "double", onError: 0, onNull: 0 } }
          },
          paidCount: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] }
          },
          pendingCount: {
            $sum: {
              $cond: [
                { $ne: ["$paymentStatus", "paid"] },
                1, 0
              ]
            }
          },
          partialCount: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "partial"] }, 1, 0] }
          },
          totalCount: { $sum: 1 }
        }
      }
    ]);

    const verificationStatsPromise = Booking.aggregate([
      { $match: verificationStatsMatch },
      {
        $project: {
          status: 1,
          isFinished: {
            $in: [
              { $trim: { input: { $toLower: { $ifNull: ["$status", ""] } } } },
              ["delivered", "cancelled"]
            ]
          },
          effectiveDate: effectiveDateExpr,
          isCheckedValid: isCheckedValidExpr
        }
      },
      {
        $group: {
          _id: null,
          checkedCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$isCheckedValid", true] },
                    { $gte: ["$effectiveDate", oneDayAgo] }
                  ]
                },
                1,
                0
              ]
            }
          },
          day1Count: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$isFinished", false] },
                    { $lt: ["$effectiveDate", oneDayAgo] },
                    { $gte: ["$effectiveDate", twoDaysAgo] }
                  ]
                },
                1,
                0
              ]
            }
          },
          day2Count: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$isFinished", false] },
                    { $lt: ["$effectiveDate", twoDaysAgo] },
                    { $gte: ["$effectiveDate", threeDaysAgo] }
                  ]
                },
                1,
                0
              ]
            }
          },
          day3Count: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$isFinished", false] },
                    { $lt: ["$effectiveDate", threeDaysAgo] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Apply paymentStatus filter if specified
    const { paymentStatus } = req.query;
    if (paymentStatus && paymentStatus !== "all") {
      const lowerPayment = paymentStatus.toLowerCase();
      if (lowerPayment === "pending") {
        const pendingCondition = {
          $or: [
            { paymentStatus: "pending" },
            { paymentStatus: "partial" },
            { paymentStatus: { $exists: false } },
            { paymentStatus: null },
            { paymentStatus: "" }
          ]
        };
        if (query.$and) {
          query.$and.push(pendingCondition);
        } else {
          query.$and = [pendingCondition];
        }
      } else if (lowerPayment === "paid") {
        query.paymentStatus = "paid";
      } else if (lowerPayment === "partial") {
        query.paymentStatus = "partial";
      } else {
        query.paymentStatus = lowerPayment;
      }
    }

    const [bookingsRaw, total, paymentStats, verificationStats] = await Promise.all([
      Booking.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean(),
      Booking.countDocuments(query),
      paymentStatsPromise,
      verificationStatsPromise
    ]);

    // Manual population for createdBy and agentId to handle both Admin and User models
    const Admin = require("../models/Admin");
    const User = require("../models/User");
    const createdByIds = [...new Set(bookingsRaw.map(b => b.createdBy).filter(Boolean))];
    const agentIds = [...new Set(bookingsRaw.map(b => b.agentId).filter(Boolean))];
    const allUserIds = [...new Set([...createdByIds, ...agentIds])];

    const [users, admins] = await Promise.all([
      User.find({ _id: { $in: allUserIds } }, "name username role").lean(),
      Admin.find({ _id: { $in: createdByIds } }, "username").lean()
    ]);

    const creatorMap = {};
    users.forEach(u => creatorMap[u._id.toString()] = { name: u.name, username: u.username, role: u.role });
    admins.forEach(a => creatorMap[a._id.toString()] = { name: a.username, username: a.username, role: 'admin' });

    // Look up EDL/KM for items that don't have it (older bookings) - Optimized Bulk Lookup
    const Pincode = require("../models/Pincode");
    const uniquePincodes = [...new Set(bookingsRaw.map(b => b.receiverDetails?.pincode).filter(Boolean))];
    const pinInfo = await Pincode.find({ pincode: { $in: uniquePincodes } }).lean();
    const pinMap = Object.fromEntries(pinInfo.map(p => [p.pincode, p]));

    const bookings = bookingsRaw.map((b) => {
      let createdBy = null;
      if (b.createdBy && creatorMap[b.createdBy.toString()]) {
        createdBy = creatorMap[b.createdBy.toString()];
      } else if (b.agentId && creatorMap[b.agentId.toString()]) {
        createdBy = creatorMap[b.agentId.toString()];
      }

      // Check if this booking came from E-Docket / Agent Intake
      const isFromIntake = b.bookingSource === 'Agent' ||
        b.bookingSource === 'E-Docket' ||
        Boolean(b.bookedByAgent) ||
        Boolean(b.agentUsername) ||
        Boolean(b.seededBy) ||
        Boolean(b.notes && b.notes.toLowerCase().includes('intake')) ||
        Boolean(b.notes && b.notes.toLowerCase().includes('e-docket'));

      let bookedByAgent = b.bookedByAgent || b.agentUsername || null;
      let agentUsername = b.agentUsername || b.bookedByAgent || null;

      if (isFromIntake) {
        if (!bookedByAgent && b.agentId && creatorMap[b.agentId.toString()]) {
          bookedByAgent = creatorMap[b.agentId.toString()].name;
          agentUsername = creatorMap[b.agentId.toString()].username;
        } else if (!bookedByAgent && createdBy && createdBy.role === 'agent') {
          bookedByAgent = createdBy.name;
          agentUsername = createdBy.username;
        }
      }

      // Filter out any non-tracking sync/seed logs from trackingHistory so only real courier updates are exposed
      const cleanTrackingHistory = (b.trackingHistory || []).filter(t => {
        const desc = (t?.description || "").toLowerCase();
        return !desc.includes("seed") && !desc.includes("sync to main") && !desc.includes("verified and seeded") && !desc.includes("booking verified by");
      });

      let updatedBooking = {
        ...b,
        trackingHistory: cleanTrackingHistory,
        createdBy,
        bookingSource: isFromIntake ? (b.bookingSource || "Agent") : (b.bookingSource || "admin"),
        bookedByAgent: bookedByAgent || b.bookedByAgent,
        agentUsername: agentUsername || b.agentUsername
      };

      if ((!b.edl || !b.km) && b.receiverDetails?.pincode) {
        const pin = pinMap[b.receiverDetails.pincode];
        if (pin) {
          updatedBooking = { ...updatedBooking, edl: pin.edl || 0, km: pin.km || 0 };
        }
      }
      return updatedBooking;
    });

    const summaryData = (paymentStats && paymentStats.length > 0) ? paymentStats[0] : {};
    const paymentSummary = {
      totalPaidAmount: Math.round(summaryData.totalPaidAmount || 0),
      totalPendingAmount: Math.round(summaryData.totalPendingAmount || 0),
      totalAmount: Math.round(summaryData.totalAmount || 0),
      paidCount: summaryData.paidCount || 0,
      pendingCount: summaryData.pendingCount || 0,
      partialCount: summaryData.partialCount || 0,
      totalCount: summaryData.totalCount || 0
    };

    const vData = (verificationStats && verificationStats.length > 0) ? verificationStats[0] : {};
    const verificationSummary = {
      checkedCount: vData.checkedCount || 0,
      day1Count: vData.day1Count || 0,
      day2Count: vData.day2Count || 0,
      day3Count: vData.day3Count || 0,
      totalAttentionCount: (vData.day1Count || 0) + (vData.day2Count || 0) + (vData.day3Count || 0)
    };

    res.json({
      bookings,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total,
      paymentSummary,
      verificationSummary,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

/** ------------------------
 * 📊 Export All Filtered Bookings
 * ------------------------ */
router.get("/export", adminAuth, async (req, res) => {
  try {
    const { status, serviceType, search, startDate, endDate, vendorNotAssigned, vendorFilter, courierFilter, partnerFilter, officeId, createdBy, paymentStatus } = req.query;
    const query = {};
 
    if (createdBy && createdBy !== "all") {
      query.createdBy = createdBy;
    }

    if (status && status !== "all") query.status = status;
    if (serviceType && serviceType !== "all") query.serviceType = serviceType;

    if (req.admin && req.admin.officeId) {
      query.officeId = req.admin.officeId;
    } else if (officeId && officeId !== "all") {
      if (officeId === "main") {
        query.officeId = { $in: [null, undefined] };
      } else {
        query.officeId = officeId;
      }
    }

    const courierFilterVal = courierFilter || vendorFilter;
    if (courierFilterVal && courierFilterVal !== "all") {
      query.$and = query.$and || [];
      if (courierFilterVal === "none") {
        query.$and.push({
          $or: [
            { courierName: { $exists: false } },
            { courierName: "" },
            { courierName: null }
          ]
        });
      } else if (courierFilterVal === "other") {
        query.$and.push({
          courierName: {
            $exists: true,
            $nin: [null, ""],
            $not: /hirak|sanjay|dtdc|bluedart|delhivery|safe\s*express|safex|india\s*post|i\s*carry|icl/i
          }
        });
      } else {
        const courierRegex = getCourierRegex(courierFilterVal);
        query.$and.push({
          $or: [
            { courierName: courierRegex },
            { vendorName: courierRegex }
          ]
        });
      }
    } else if (vendorNotAssigned === "true") {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { courierName: { $exists: false } },
          { courierName: "" },
          { courierName: null }
        ]
      });
    }

    // Partner Filter
    if (partnerFilter && partnerFilter !== "all") {
      query.$and = query.$and || [];
      if (partnerFilter === "none") {
        query.$and.push({
          $or: [
            { isVendorBooking: { $ne: true } },
            { partnerId: { $exists: false } },
            { partnerId: "" },
            { partnerId: null }
          ]
        });
      } else {
        const partnerRegex = new RegExp(escapeRegex(partnerFilter.trim()), "i");
        query.$and.push({
          $or: [
            { partnerId: partnerFilter },
            { partnerName: partnerRegex },
            { vendorId: partnerFilter }
          ]
        });
      }
    }

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      const end = endDate ? new Date(endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);

      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          {
            isVendorBooking: true,
            pickupDate: {
              $exists: true,
              $ne: null,
              ...(start && { $gte: start }),
              ...(end && { $lte: end })
            }
          },
          {
            $or: [
              { isVendorBooking: { $ne: true } },
              { pickupDate: { $in: [null, undefined] } }
            ],
            createdAt: {
              ...(start && { $gte: start }),
              ...(end && { $lte: end })
            }
          }
        ]
      });
    }

    if (search && search.trim()) {
      const cleanSearch = escapeRegex(search.trim());
      const searchOr = [
        { bookingId: { $regex: cleanSearch, $options: "i" } },
        { trackingId: { $regex: cleanSearch, $options: "i" } },
        { vendorTrackingId: { $regex: cleanSearch, $options: "i" } },
        { "senderDetails.name": { $regex: cleanSearch, $options: "i" } },
        { "receiverDetails.name": { $regex: cleanSearch, $options: "i" } },
        { "senderDetails.phone": { $regex: cleanSearch, $options: "i" } },
        { "receiverDetails.phone": { $regex: cleanSearch, $options: "i" } },
      ];
      query.$and = query.$and || [];
      query.$and.push({ $or: searchOr });
    }

    if (paymentStatus && paymentStatus !== "all") {
      const lowerPayment = paymentStatus.toLowerCase();
      if (lowerPayment === "pending") {
        const pendingCondition = {
          $or: [
            { paymentStatus: "pending" },
            { paymentStatus: "partial" },
            { paymentStatus: { $exists: false } },
            { paymentStatus: null },
            { paymentStatus: "" }
          ]
        };
        if (query.$and) {
          query.$and.push(pendingCondition);
        } else {
          query.$and = [pendingCondition];
        }
      } else if (lowerPayment === "paid") {
        query.paymentStatus = "paid";
      } else if (lowerPayment === "partial") {
        query.paymentStatus = "partial";
      } else {
        query.paymentStatus = lowerPayment;
      }
    }

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .select("bookingId trackingId vendorTrackingId serviceType status senderDetails receiverDetails pricing createdAt packageDetails weight km edl vendorName paymentStatus paymentMethod")
      .lean();

    res.json(bookings);
  } catch (error) {
    console.error("Export Error:", error);
    res.status(500).json({ message: "Server error during export" });
  }
});
/** ------------------------
 * 📊 Bulk Actions
 * ------------------------ */
router.put("/bulk/status", adminAuth, async (req, res) => {
  try {
    const { bookingIds, status, location, description, timestamp, updates } = req.body;
    if (!bookingIds || !Array.isArray(bookingIds)) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    let trackEntries = [];
    let finalStatus = status;

    if (updates && Array.isArray(updates) && updates.length > 0) {
      // Validate all updates have a status
      for (const up of updates) {
        if (!up.status) {
          return res.status(400).json({ message: "All updates must have a status" });
        }
      }

      trackEntries = updates.map(up => ({
        status: up.status,
        location: up.location || "Hub",
        timestamp: up.timestamp ? new Date(up.timestamp) : new Date(),
        description: up.description || `Bulk status update to ${up.status.toUpperCase()} by admin.`
      }));

      // Sort updates chronologically by timestamp
      trackEntries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      finalStatus = trackEntries[trackEntries.length - 1].status;
    } else {
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      const trackEntry = {
        status,
        location: location || "Hub",
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        description: description || `Bulk status update to ${status.toUpperCase()} by admin.`
      };
      trackEntries.push(trackEntry);
      finalStatus = status;
    }

    await Booking.updateMany(
      { _id: { $in: bookingIds } },
      {
        $set: { status: finalStatus },
        $push: { trackingHistory: { $each: trackEntries } }
      }
    );

    // ✅ Trigger emails for bulk delivered status
    if (finalStatus?.toLowerCase() === "delivered" && req.body.notify) {
      const bookings = await Booking.find({ _id: { $in: bookingIds } });
      bookings.forEach(b => sendDeliveryEmail(b));
    }

    // Notify Admins
    const io = req.app.get("socketio");
    if (io) {
      io.emit("status_update", {
        bookingIds,
        status: finalStatus.toUpperCase(),
        description: `Bulk status update to ${finalStatus.toUpperCase()}`,
        bookingSource: "Bulk"
      });
    }

    res.json({ success: true, message: `Successfully updated ${bookingIds.length} bookings.` });
  } catch (error) {
    console.error("Bulk Status Error:", error);
    res.status(500).json({ message: "Server error during bulk status update" });
  }
});

router.put("/bulk/assign", adminAuth, async (req, res) => {
  try {
    const { bookingIds, riderId, assignedFor } = req.body;
    if (!bookingIds || !Array.isArray(bookingIds) || !riderId) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    const User = require("../models/User");
    const rider = await User.findById(riderId);
    if (!rider) return res.status(404).json({ message: "Rider not found" });

    const updateObj = {
      $set: {
        assignedRider: riderId,
        assignedFor: assignedFor || "pickup"
      },
      $push: {
        trackingHistory: {
          location: "Hub",
          timestamp: new Date(),
          description: `Bulk assigned to Rider ${rider.name} for ${assignedFor || "pickup"}`
        }
      }
    };

    if (assignedFor === "pickup") updateObj.$set.pickupRider = riderId;
    else if (assignedFor === "delivery") updateObj.$set.deliveryRider = riderId;
    else if (assignedFor === "both") {
      updateObj.$set.pickupRider = riderId;
      updateObj.$set.deliveryRider = riderId;
    }

    await Booking.updateMany(
      { _id: { $in: bookingIds } },
      updateObj
    );

    // Notify Admins
    const io = req.app.get("socketio");
    if (io) {
      io.emit("status_update", {
        bookingIds,
        status: "ASSIGNED",
        description: `Bulk assigned to Rider ${rider.name}`,
        bookingSource: "Bulk"
      });
    }

    res.json({ success: true, message: `Assigned ${bookingIds.length} bookings to ${rider.name}.` });
  } catch (error) {
    console.error("Bulk Assign Error:", error);
    res.status(500).json({ message: "Server error during bulk assignment" });
  }
});

// Bulk Assign Corporate Partner (B2B Client)
router.put(["/bulk/assign-vendor", "/bulk/assign-partner"], adminAuth, async (req, res) => {
  try {
    const { bookingIds, vendorId, vendorName, partnerId, partnerName } = req.body;
    const targetPartnerId = partnerId || vendorId;
    const targetPartnerName = partnerName || vendorName;

    if (!bookingIds || !Array.isArray(bookingIds) || !targetPartnerId || !targetPartnerName) {
      return res.status(400).json({ message: "Invalid request data: Partner ID and Name are required." });
    }

    const partner = await Partner.findOne({ partnerId: targetPartnerId });
    const pricePerKg = partner?.pricePerKg || 0;

    const bookings = await Booking.find({ _id: { $in: bookingIds } });

    for (const booking of bookings) {
      let weight = booking.packageDetails?.weight || 0;
      if (booking.packageDetails?.weightUnit === 'g') {
        weight = weight / 1000;
      }
      let chargeable = Math.ceil(weight);
      if (chargeable < 1) chargeable = 1;

      let updateDoc = {
        partnerId: targetPartnerId,
        partnerName: targetPartnerName,
        vendorId: targetPartnerId,
        vendorName: targetPartnerName,
        isVendorBooking: true,
        "packageDetails.chargeableWeight": chargeable,
        "packageDetails.chargeableWeightUnit": "kg"
      };

      if (pricePerKg > 0) {
        updateDoc["pricing.totalAmount"] = Math.round(chargeable * pricePerKg * 100) / 100;
      } else {
        // If partner doesn't have a special per-kg rate, preserve or calculate proper totalAmount
        const currentTotal = Number(booking.pricing?.totalAmount) || 0;
        if (currentTotal <= 0) {
          const base = Number(booking.pricing?.basePrice) || 0;
          const pkg = Number(booking.pricing?.packagingCharge) || 0;
          const tax = Number(booking.pricing?.tax) || 0;
          const disc = Number(booking.pricing?.discount || booking.couponDiscount) || 0;
          const computed = Math.round((base + pkg + tax - disc) * 100) / 100;
          if (computed > 0) {
            updateDoc["pricing.totalAmount"] = computed;
          }
        }
      }

      await Booking.updateOne(
        { _id: booking._id },
        { $set: updateDoc }
      );
    }

    // Notify Admins
    const io = req.app.get("socketio");
    if (io) {
      io.emit("status_update", {
        bookingIds,
        status: "VENDOR_ASSIGNED",
        description: `Bulk assigned to Partner ${targetPartnerName}`,
        bookingSource: "Bulk"
      });
    }

    res.json({ success: true, message: `Assigned ${bookingIds.length} bookings to Partner ${targetPartnerName}.` });
  } catch (error) {
    console.error("Bulk Assign Partner Error:", error);
    res.status(500).json({ message: "Server error during bulk partner assignment" });
  }
});

// Bulk Assign Courier Partner & Docket (DTDC, Delhivery, BlueDart, etc.)
router.put("/bulk/assign-docket", adminAuth, async (req, res) => {
  try {
    const { bookingIds, vendorTrackingId, vendorName } = req.body;
    if (!bookingIds || !Array.isArray(bookingIds) || !vendorTrackingId || !vendorName) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    // Update all bookings
    await Booking.updateMany(
      { _id: { $in: bookingIds } },
      {
        $set: {
          vendorTrackingId,
          vendorName,
          courierName: vendorName
        },
        $push: {
          trackingHistory: {
            location: "Hub",
            timestamp: new Date(),
            description: `Bulk assigned to Docket ${vendorTrackingId} (${vendorName})`
          }
        }
      }
    );

    // Get the bookings to get their bookingIds (epId)
    const updatedBookings = await Booking.find({ _id: { $in: bookingIds } }).select("bookingId _id");
    const epIds = updatedBookings.map(b => b.bookingId);
    const ObjectIds = updatedBookings.map(b => b._id);

    // Sync with Docket Inventory
    await DocketInventory.findOneAndUpdate(
      { docketId: vendorTrackingId.toString().trim() },
      {
        $set: { status: "used", usedAt: new Date() },
        $addToSet: {
          usedBy: { $each: ObjectIds },
          epId: { $each: epIds }
        }
      }
    );

    // Notify Admins
    const io = req.app.get("socketio");
    if (io) {
      io.emit("status_update", {
        bookingIds,
        status: "DOCKET_ASSIGNED",
        description: `Bulk assigned to Docket ${vendorTrackingId}`,
        bookingSource: "Bulk"
      });
    }

    res.json({ success: true, message: `Assigned docket ${vendorTrackingId} to ${bookingIds.length} bookings.` });
  } catch (error) {
    console.error("Bulk Assign Docket Error:", error);
    res.status(500).json({ message: "Server error during bulk docket assignment" });
  }
});

// @route   PUT /api/bookings/bulk/payment-status
// @desc    Bulk mark bookings as paid / update payment status
router.put("/bulk/payment-status", adminAuth, async (req, res) => {
  try {
    const { bookingIds, paymentStatus = "paid", paymentMode, paymentNotes } = req.body;
    if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      return res.status(400).json({ message: "No booking IDs provided." });
    }

    const bookingsToUpdate = await Booking.find({ _id: { $in: bookingIds } });
    if (!bookingsToUpdate || bookingsToUpdate.length === 0) {
      return res.status(404).json({ message: "No matching bookings found." });
    }

    let updatedCount = 0;
    const updatedIds = [];

    for (const booking of bookingsToUpdate) {
      const fullAmount = Number(booking.pricing?.totalAmount || booking.totalAmount || 0);
      booking.paymentStatus = paymentStatus;
      if (paymentStatus === "paid") {
        booking.amountReceived = fullAmount;
      }
      if (paymentMode) {
        booking.paymentMode = paymentMode;
      }
      if (paymentNotes) {
        booking.paymentNotes = paymentNotes;
      }
      booking.paymentUpdatedAt = new Date();
      booking.paymentUpdatedBy = req.admin?._id || req.user?._id;
      await booking.save();
      updatedCount++;
      updatedIds.push(booking._id);
    }

    // Notify connected clients via socket.io
    const io = req.app.get("socketio");
    if (io) {
      io.emit("payment_update", {
        bookingIds: updatedIds,
        paymentStatus,
        updatedCount,
      });
    }

    res.json({
      success: true,
      message: `Successfully marked ${updatedCount} bookings as ${paymentStatus.toUpperCase()}.`,
      updatedCount,
    });
  } catch (error) {
    console.error("Bulk payment status error:", error);
    res.status(500).json({ message: "Failed to update payment status in bulk." });
  }
});

router.get("/edocket-count", adminAuth, async (req, res) => {
  try {
    // Count intake bookings that are not yet adminVerified
    const mongoose = require("mongoose");
    const IntakeBooking = mongoose.model("IntakeBooking");
    const count = await IntakeBooking.countDocuments({ adminVerified: false });
    res.json({ count });
  } catch (error) {
    console.error("Error fetching E-Docket count:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/** ------------------------
 * 📋 Get Tomorrow's Task Count
 * ------------------------ */
router.get("/tasks/tomorrow-count", authMiddleware, async (req, res) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Format to start/end of day for accurate comparison
    const startOfTomorrow = new Date(tomorrow);
    startOfTomorrow.setHours(0, 0, 0, 0);
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const count = await Booking.countDocuments({
      pickupDate: {
        $gte: startOfTomorrow,
        $lte: endOfTomorrow
      },
      status: { $nin: ["delivered", "cancelled"] }
    });
    res.json({ count });
  } catch (error) {
    console.error("Error fetching tomorrow's task count:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/** ------------------------
 * 🚲 Get Recent Rider Activity
 * ------------------------ */
router.get("/stats/recent-rider-activity", authMiddleware, async (req, res) => {
  try {
    // Find bookings that have recent tracking updates from riders
    // For simplicity, we'll get the 10 most recently updated bookings
    const recentUpdates = await Booking.find({
      assignedRider: { $ne: null },
      "trackingHistory.0": { $exists: true }
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate("assignedRider", "name phone")
      .lean();

    const activities = recentUpdates.map(booking => {
      const lastUpdate = booking.trackingHistory[booking.trackingHistory.length - 1];
      const declaredVal = booking.packageDetails?.value || booking.packageDetails?.itemValue || booking.value || 0;
      return {
        _id: lastUpdate?._id || booking._id,
        bookingId: booking.bookingId,
        bookingMongoId: booking._id,
        status: booking.status,
        assignedRider: booking.assignedRider,
        timestamp: lastUpdate?.timestamp || booking.updatedAt,
        declaredValue: declaredVal
      };
    });

    res.json(activities);
  } catch (error) {
    console.error("Error fetching recent rider activity:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    let query = {};

    // Check if ID is a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      query = { _id: req.params.id };
    } else {
      // Otherwise, treat as human-readable bookingId
      query = { bookingId: req.params.id };
    }

    const booking = await Booking.findOne(query)
      .populate('assignedRider', 'name phone')
      .populate('pickupRider', 'name phone')
      .populate('deliveryRider', 'name phone')
      .populate('salesAgent', 'name')
      .populate('handlingAgent', 'name')
      .populate('packagingAgent', 'name')
      .populate('trackingAgent', 'name')
      .populate('createdBy', 'name username')
      .populate('agentId', 'name username role')
      .populate('seededBy', 'name username')
      .populate('verifiedBy', 'name username');

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    const bObj = booking.toObject();
    bObj.trackingHistory = (bObj.trackingHistory || []).filter(t => {
      const desc = (t?.description || "").toLowerCase();
      return !desc.includes("seed") && !desc.includes("sync to main") && !desc.includes("verified and seeded") && !desc.includes("booking verified by");
    });
    res.json(bObj);
  } catch (error) {
    console.error("Booking fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/** ------------------------
 * 📄 Download Receipt PDF
 * ------------------------ */
router.get("/:id/receipt", authMiddleware, async (req, res) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { bookingId: req.params.id };

    const booking = await Booking.findOne(query).lean();
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // On-the-fly Razorpay Link generation if missing but amount > 0
    if (booking.pricing?.totalAmount > 0 && !booking.paymentLink && razorpay) {
      try {
        const paymentLink = await razorpay.paymentLink.create({
          amount: booking.pricing.totalAmount * 100,
          currency: "INR",
          accept_partial: false,
          description: `Payment for Shipment ${booking.bookingId}`,
          customer: {
            name: booking.senderDetails.name,
            email: booking.senderDetails.email || "info@engineersparcel.com",
            contact: /^(\d)\1{9}$/.test(booking.senderDetails.phone) ? "" : (booking.senderDetails.phone || "")
          },
          notify: { sms: false, email: false }, // Don't spam during download
          notes: { bookingId: booking.bookingId }
        });

        if (paymentLink) {
          await Booking.findByIdAndUpdate(booking._id, { $set: { paymentLink: paymentLink.short_url } }, { runValidators: false });
        }
      } catch (razorpayErr) {
        console.error("Razorpay Link Error (Download):", razorpayErr);
      }
    }

    // Fetch invoice to get senderGst if it exists
    const Invoice = require("../models/Invoice");
    const invoice = await Invoice.findOne({ bookingId: booking._id });
    const senderGst = invoice ? invoice.senderGst : req.query.gst;

    // Generate PDF
    const { receipt, label, declaration } = req.query;
    const { generateCombinedPDF } = require("../utils/pdfService");
    const pdfBuffer = await generateCombinedPDF(booking, { receipt, label, declaration, senderGst });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=Booking-${booking.bookingId || 'Shipment'}.pdf`,
      "Content-Length": pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Receipt Download Error:", error);
    res.status(500).json({ message: "Failed to generate receipt" });
  }
});

/** ------------------------
 * ✏️ Update booking (general fields)
 * ------------------------ */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const idParam = req.params.id ? req.params.id.toString().trim() : "";
    const isObjectId = mongoose.Types.ObjectId.isValid(idParam) && idParam.length === 24;

    const query = isObjectId
      ? {
        $or: [
          { _id: idParam },
          { bookingId: idParam },
          { bookingId: new RegExp(`^${idParam}$`, 'i') },
          { trackingId: idParam },
          { vendorTrackingId: idParam }
        ]
      }
      : {
        $or: [
          { bookingId: idParam },
          { bookingId: new RegExp(`^${idParam}$`, 'i') },
          { trackingId: idParam },
          { vendorTrackingId: idParam }
        ]
      };

    // Helper to flatten nested objects (like packageDetails) to prevent 
    // Mongoose validation errors on missing required sub-document fields
    const flattenObject = (ob) => {
      const toReturn = {};
      for (const i in ob) {
        if (!ob.hasOwnProperty(i)) continue;
        if (typeof ob[i] === 'object' && ob[i] !== null && ob[i].constructor === Object) {
          const flatObject = flattenObject(ob[i]);
          for (const x in flatObject) {
            if (!flatObject.hasOwnProperty(x)) continue;
            toReturn[i + '.' + x] = flatObject[x];
          }
        } else {
          toReturn[i] = ob[i];
        }
      }
      return toReturn;
    };

    // Prevent populated objects and immutable metadata from causing CastErrors during flatten/update
    const cleanBody = { ...req.body };
    delete cleanBody._id;
    delete cleanBody.__v;
    delete cleanBody.createdAt;
    delete cleanBody.updatedAt;
    delete cleanBody.createdBy;
    delete cleanBody.agentId;
    delete cleanBody.seededBy;
    delete cleanBody.verifiedBy;
    delete cleanBody.roleChangesHistory;
    delete cleanBody.trackingHistory;
    delete cleanBody.vendorPaymentHistory;

    const idFields = ['assignedRider', 'pickupRider', 'deliveryRider', 'userId', 'salesAgent', 'handlingAgent', 'packagingAgent', 'trackingAgent'];

    idFields.forEach(field => {
      if (cleanBody.hasOwnProperty(field)) {
        const val = cleanBody[field];
        if (val === "" || val === null || val === undefined || val === "none" || val === "None") {
          cleanBody[field] = null;
        } else if (typeof val === 'object') {
          if (val._id && mongoose.Types.ObjectId.isValid(val._id)) {
            cleanBody[field] = val._id;
          } else {
            cleanBody[field] = null;
          }
        } else if (typeof val === 'string') {
          if (mongoose.Types.ObjectId.isValid(val)) {
            cleanBody[field] = val;
          } else {
            cleanBody[field] = null;
          }
        }
      }
    });

    if (cleanBody.courierName && !cleanBody.vendorName) {
      cleanBody.vendorName = cleanBody.courierName;
    }
    if (cleanBody.partnerId && !cleanBody.vendorId) {
      cleanBody.vendorId = cleanBody.partnerId;
    }

    const updateData = flattenObject(cleanBody);

    const currentBooking = await Booking.findOne(query);
    if (!currentBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Ensure pricing.totalAmount is properly computed if basePrice exists and totalAmount is 0/missing
    const bBasePrice = updateData['pricing.basePrice'] !== undefined 
      ? Number(updateData['pricing.basePrice']) 
      : Number(currentBooking.pricing?.basePrice || 0);

    if (bBasePrice > 0) {
      const bPkg = updateData['pricing.packagingCharge'] !== undefined ? Number(updateData['pricing.packagingCharge']) : Number(currentBooking.pricing?.packagingCharge || 0);
      const bTax = updateData['pricing.tax'] !== undefined ? Number(updateData['pricing.tax']) : Number(currentBooking.pricing?.tax || 0);
      const bDisc = updateData['pricing.discount'] !== undefined ? Number(updateData['pricing.discount']) : Number(currentBooking.pricing?.discount || currentBooking.couponDiscount || 0);
      
      const reqTotal = updateData['pricing.totalAmount'] !== undefined ? Number(updateData['pricing.totalAmount']) : Number(currentBooking.pricing?.totalAmount || 0);
      
      if (!reqTotal || reqTotal <= 0) {
        updateData['pricing.totalAmount'] = Math.round((bBasePrice + bPkg + bTax - bDisc) * 100) / 100;
      }
    }

    // Vendor tracking validation
    const isVendor = (updateData.isVendorBooking !== undefined) ? Boolean(updateData.isVendorBooking) : Boolean(currentBooking.isVendorBooking);

    // ✅ Validate if vendorTrackingId (Docket ID) is already in use
    if (updateData.vendorTrackingId) {
      const trackingId = updateData.vendorTrackingId.toString().trim();

      if (currentBooking.vendorTrackingId !== trackingId) {
        // Check if another booking is using it
        const otherBooking = await Booking.findOne({
          vendorTrackingId: trackingId,
          _id: { $ne: currentBooking._id }
        });

        if (otherBooking) {
          return res.status(400).json({ message: `Docket ID ${trackingId} is already associated with booking ${otherBooking.bookingId}.` });
        }

        // Check if it's marked as used in DocketInventory by a different booking
        const existingDocket = await DocketInventory.findOne({ docketId: trackingId });
        if (existingDocket && existingDocket.status === "used") {
          const isUsedByUs = existingDocket.usedBy && existingDocket.usedBy.some(id => id.toString() === currentBooking._id.toString());
          if (!isUsedByUs && existingDocket.usedBy && existingDocket.usedBy.length > 0) {
            return res.status(400).json({ message: `Docket ID ${trackingId} is already marked as used in the inventory.` });
          }
        }
      }
    }

    // ✅ Internal Roles Audit Trail & Access Control
    const roleFields = ['salesAgent', 'handlingAgent', 'packagingAgent', 'trackingAgent'];
    const activeUser = req.admin || req.user;
    let pushUpdates = {};

    const isRoleUpdate = roleFields.some(field => updateData[field] !== undefined && updateData[field] !== (currentBooking[field] ? currentBooking[field].toString() : null));

    if (isRoleUpdate) {
      const isAdmin = req.admin || (req.user && (req.user.role === 'admin' || req.user.role === 'main_admin' || req.user.role === 'office_admin'));
      const isStaffOrAgent = req.user && ['staff', 'agent'].includes(req.user.role);
      const activeUserId = activeUser?._id?.toString();
      const isCreator = activeUser && (
        (currentBooking.createdBy && currentBooking.createdBy.toString() === activeUserId) ||
        (currentBooking.agentId && currentBooking.agentId.toString() === activeUserId) ||
        (currentBooking.seededBy && currentBooking.seededBy.toString() === activeUserId) ||
        (currentBooking.bookedByAgent && activeUser.name && currentBooking.bookedByAgent.trim().toLowerCase() === activeUser.name.trim().toLowerCase()) ||
        (currentBooking.agentUsername && activeUser.username && currentBooking.agentUsername.trim().toLowerCase() === activeUser.username.trim().toLowerCase())
      );

      if (!isAdmin && !isCreator && !isStaffOrAgent) {
        return res.status(403).json({ message: "You are not authorized to edit internal roles for this booking." });
      }

      // Collect IDs to resolve names for friendly history
      const relevantUserIds = [];
      roleFields.forEach(field => {
        if (updateData[field] !== undefined) {
          if (currentBooking[field]) relevantUserIds.push(currentBooking[field]);
          if (updateData[field]) relevantUserIds.push(updateData[field]);
        }
      });
      const usersMap = {};
      if (relevantUserIds.length > 0) {
        const users = await User.find({ _id: { $in: relevantUserIds } }).select('name role');
        users.forEach(u => { usersMap[u._id.toString()] = `${u.name} (${u.role})`; });
      }

      let roleChanges = [];
      roleFields.forEach(field => {
        if (updateData[field] !== undefined) {
          const oldVal = currentBooking[field] ? currentBooking[field].toString() : null;
          const newVal = updateData[field] ? updateData[field].toString() : null;
          if (oldVal !== newVal) {
            const oldLabel = oldVal ? (usersMap[oldVal] || oldVal) : 'None';
            const newLabel = newVal ? (usersMap[newVal] || newVal) : 'None';
            roleChanges.push({
              action: `Updated ${field}`,
              updatedBy: activeUser?._id,
              details: `Changed from ${oldLabel} to ${newLabel}`,
              timestamp: new Date()
            });
          }
        }
      });

      if (roleChanges.length > 0) {
        pushUpdates.roleChangesHistory = { $each: roleChanges };
      }
    }

    const updateQuery = { $set: updateData };
    if (Object.keys(pushUpdates).length > 0) {
      updateQuery.$push = pushUpdates;
    }

    const booking = await Booking.findOneAndUpdate(
      query,
      updateQuery,
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // ✅ Sync with Docket Inventory
    if (req.body.vendorTrackingId) {
      try {
        await DocketInventory.findOneAndUpdate(
          { docketId: req.body.vendorTrackingId.toString().trim() },
          {
            $set: { status: "used", usedAt: new Date() },
            $addToSet: { usedBy: booking._id, epId: booking.bookingId }
          }
        );
      } catch (inventoryErr) {
        console.error("Inventory sync error:", inventoryErr);
      }
    }

    // ✅ Trigger email if status is changed to delivered and notify is true
    if (updateData.status?.toLowerCase() === "delivered" && req.body.notify) {
      sendDeliveryEmail(booking);
    }

    res.json(booking);
  } catch (error) {
    console.error(error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: "Validation failed", errors: error.errors });
    }
    res.status(500).json({ message: "Server error" });
  }
});

/** ------------------------
 * 👥 Update Internal Roles (Performance Tracking)
 * Only allowed for the creator of the booking or administrators
 * ------------------------ */
router.put("/:id/internal-roles", authMiddleware, async (req, res) => {
  try {
    const idParam = req.params.id ? req.params.id.toString().trim() : "";
    const isObjectId = mongoose.Types.ObjectId.isValid(idParam) && idParam.length === 24;

    const query = isObjectId
      ? {
        $or: [
          { _id: idParam },
          { bookingId: idParam },
          { bookingId: new RegExp(`^${idParam}$`, 'i') },
          { trackingId: idParam },
          { vendorTrackingId: idParam }
        ]
      }
      : {
        $or: [
          { bookingId: idParam },
          { bookingId: new RegExp(`^${idParam}$`, 'i') },
          { trackingId: idParam },
          { vendorTrackingId: idParam }
        ]
      };

    const booking = await Booking.findOne(query);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const activeUser = req.admin || req.user;
    const isAdmin = req.admin || (req.user && ['admin', 'main_admin', 'office_admin'].includes(req.user.role));
    const isStaffOrAgent = req.user && ['staff', 'agent'].includes(req.user.role);
    const activeUserId = activeUser?._id?.toString();

    const isCreator = activeUser && (
      (booking.createdBy && booking.createdBy.toString() === activeUserId) ||
      (booking.agentId && booking.agentId.toString() === activeUserId) ||
      (booking.seededBy && booking.seededBy.toString() === activeUserId) ||
      (booking.bookedByAgent && activeUser.name && booking.bookedByAgent.trim().toLowerCase() === activeUser.name.trim().toLowerCase()) ||
      (booking.agentUsername && activeUser.username && booking.agentUsername.trim().toLowerCase() === activeUser.username.trim().toLowerCase())
    );

    if (!isAdmin && !isCreator && !isStaffOrAgent) {
      return res.status(403).json({
        message: "You are not authorized to edit internal roles."
      });
    }

    const { salesAgent, handlingAgent, packagingAgent, trackingAgent } = req.body;
    const roleFields = { salesAgent, handlingAgent, packagingAgent, trackingAgent };
    let roleChanges = [];

    const relevantIds = [];
    for (const [field, val] of Object.entries(roleFields)) {
      if (val !== undefined) {
        if (booking[field]) relevantIds.push(booking[field]);
        if (val && typeof val === 'object' && val._id) relevantIds.push(val._id);
        else if (val && typeof val === 'string' && val !== "none" && val !== "None" && mongoose.Types.ObjectId.isValid(val)) relevantIds.push(val);
      }
    }
    const usersMap = {};
    if (relevantIds.length > 0) {
      const users = await User.find({ _id: { $in: relevantIds } }).select('name role');
      users.forEach(u => { usersMap[u._id.toString()] = `${u.name} (${u.role})`; });
    }

    const updateFields = {};
    for (const [field, val] of Object.entries(roleFields)) {
      if (val !== undefined) {
        const oldVal = booking[field] ? booking[field].toString() : null;
        let newVal = null;
        if (val && typeof val === 'object' && val._id) {
          newVal = val._id.toString();
        } else if (val && typeof val === 'string' && val !== "none" && val !== "None" && val !== "" && mongoose.Types.ObjectId.isValid(val)) {
          newVal = val;
        }

        updateFields[field] = newVal;

        if (oldVal !== newVal) {
          const oldLabel = oldVal ? (usersMap[oldVal] || oldVal) : 'None';
          const newLabel = newVal ? (usersMap[newVal] || newVal) : 'None';
          roleChanges.push({
            action: `Updated ${field}`,
            updatedBy: activeUser._id,
            details: `Changed from ${oldLabel} to ${newLabel}`,
            timestamp: new Date()
          });
        }
      }
    }

    const updateQuery = { $set: updateFields };
    if (roleChanges.length > 0) {
      updateQuery.$push = { roleChangesHistory: { $each: roleChanges } };
    }

    const updatedBooking = await Booking.findByIdAndUpdate(booking._id, updateQuery, { new: true })
      .populate('assignedRider', 'name phone')
      .populate('pickupRider', 'name phone')
      .populate('deliveryRider', 'name phone')
      .populate('salesAgent', 'name')
      .populate('handlingAgent', 'name')
      .populate('packagingAgent', 'name')
      .populate('trackingAgent', 'name')
      .populate('createdBy', 'name username')
      .populate('agentId', 'name username role')
      .populate('seededBy', 'name username')
      .populate('verifiedBy', 'name username');

    res.json({
      success: true,
      message: "Internal roles updated successfully",
      booking: updatedBooking
    });
  } catch (error) {
    console.error("Error updating internal roles:", error);
    res.status(500).json({ message: "Server error updating internal roles" });
  }
});

/** ------------------------
 * 🗑️ Delete booking
 * ------------------------ */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { bookingId: req.params.id };

    const booking = await Booking.findOneAndDelete(query);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json({ success: true, message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ message: "Server error deleting booking" });
  }
});

/** ------------------------
 * 🚚 Add tracking update
 * ------------------------ */
// ✅ Use this endpoint for tracking history updates
router.put("/:id/tracking", authMiddleware, async (req, res) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { bookingId: req.params.id };

    const { status, location, description, timestamp } = req.body;

    const booking = await Booking.findOne(query);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const newEntry = {
      status: status || "No Status",
      location: location || "No Location",
      description: description || "N/A",
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    };

    if (!Array.isArray(booking.trackingHistory)) {
      booking.trackingHistory = [];
    }

    const updated = await Booking.findOneAndUpdate(
      query,
      {
        $set: { status: status || booking.status, currentLocation: location || booking.currentLocation },
        $push: { trackingHistory: newEntry }
      },
      { new: true, runValidators: false }
    );

    // ✅ NEW: Automated Delivery Email
    if (status?.toLowerCase() === "delivered" && req.body.notify) {
      sendDeliveryEmail(booking);
    }

    // Notify Admins

    // Notify Admins
    const io = req.app.get("socketio");
    if (io) {
      io.emit("status_update", {
        bookingId: booking.bookingId,
        bookingMongoId: booking._id,
        status: (status || booking.status).toUpperCase(),
        description: description || `Status updated to ${status}`,
        bookingSource: booking.bookingSource
      });
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating tracking history" });
  }
});

/** ------------------------
 * 💰 Generate & Send Payment Link (Razorpay)
 * ------------------------ */
router.post("/:id/payment-link", authMiddleware, async (req, res) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { bookingId: req.params.id };

    const booking = await Booking.findOne(query);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (!razorpay) return res.status(500).json({ message: "Razorpay not configured on server" });

    // Amount should be > 0
    const amount = booking.pricing?.totalAmount || 0;
    if (amount <= 0) return res.status(400).json({ message: "Cannot generate link for zero amount" });

    const paymentLink = await razorpay.paymentLink.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      accept_partial: false,
      description: `Payment for Shipment ${booking.bookingId}`,
      customer: {
        name: booking.senderDetails.name,
        email: booking.senderDetails.email || "info@engineersparcel.com",
        contact: /^(\d)\1{9}$/.test(booking.senderDetails.phone) ? "" : (booking.senderDetails.phone || "")
      },
      notify: { sms: true, email: true },
      notes: { bookingId: booking.bookingId }
    });

    if (paymentLink && paymentLink.short_url) {
      booking.paymentLink = paymentLink.short_url;
      await Booking.findOneAndUpdate(query, { $set: { paymentLink: paymentLink.short_url } }, { runValidators: false });
      return res.json({ paymentLink: paymentLink.short_url });
    }

    res.status(500).json({ message: "Failed to receive link from Razorpay" });
  } catch (error) {
    console.error("Razorpay Link Error:", error);
    res.status(500).json({ message: error.description || "Razorpay API Error" });
  }
});

/** ------------------------
 * ✏️ Edit specific tracking update
 * ------------------------ */
router.put("/:id/tracking/:trackingId", authMiddleware, async (req, res) => {
  try {
    const { status, location, description, timestamp } = req.body;
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { bookingId: req.params.id };

    const booking = await Booking.findOne(query);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const trackIndex = booking.trackingHistory.findIndex(
      (t) => t._id.toString() === req.params.trackingId
    );

    if (trackIndex === -1) {
      return res.status(404).json({ message: "Tracking update not found" });
    }

    // Update specific fields
    if (status) booking.trackingHistory[trackIndex].status = status;
    if (location) booking.trackingHistory[trackIndex].location = location;
    if (description) booking.trackingHistory[trackIndex].description = description;
    if (timestamp) booking.trackingHistory[trackIndex].timestamp = timestamp;

    const updated = await Booking.findOneAndUpdate(
      query,
      {
        $set: {
          status: (trackIndex === booking.trackingHistory.length - 1 && status) ? status : booking.status,
          currentLocation: (trackIndex === booking.trackingHistory.length - 1 && location) ? location : booking.currentLocation,
          trackingHistory: booking.trackingHistory
        }
      },
      { new: true, runValidators: false }
    );
    res.json(updated);
  } catch (error) {
    console.error("Error editing tracking step:", error);
    res.status(500).json({ message: "Error editing tracking step" });
  }
});

/** ------------------------
 * 🗑️ Delete specific tracking update
 * ------------------------ */
router.delete("/:id/tracking/:trackingId", authMiddleware, async (req, res) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { bookingId: req.params.id };

    const updated = await Booking.findOneAndUpdate(
      query,
      {
        $pull: { trackingHistory: { _id: req.params.trackingId } }
      },
      { new: true, runValidators: false }
    );

    if (!updated) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Error deleting tracking step:", error);
    res.status(500).json({ message: "Error deleting tracking step" });
  }
});

/** ------------------------
 * 🚲 Assign Rider to Booking
 * ------------------------ */
router.put("/:id/assign", adminAuth, async (req, res) => {
  try {
    const { riderId, assignedFor } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const updateObj = {
      $set: {
        assignedRider: riderId || null,
        assignedFor: assignedFor || "pickup"
      }
    };

    if (assignedFor === "pickup") {
      updateObj.$set.pickupRider = riderId || null;
    } else if (assignedFor === "delivery") {
      updateObj.$set.deliveryRider = riderId || null;
    } else if (assignedFor === "both") {
      updateObj.$set.pickupRider = riderId || null;
      updateObj.$set.deliveryRider = riderId || null;
    }

    if (riderId) {
      const User = require("../models/User");
      const rider = await User.findById(riderId);
      if (rider) {
        // Check if there's already an assignment entry for this specific purpose in the tracking history
        const alreadyAssigned = booking.trackingHistory.some(entry =>
          entry.description && entry.description.includes(`assigned for ${assignedFor || "pickup"}`)
        );

        if (!alreadyAssigned) {
          updateObj.$push = {
            trackingHistory: {
              status: booking.status,
              location: "Hub",
              timestamp: new Date(),
              description: `Rider ${rider.name} assigned for ${assignedFor || "pickup"}`
            }
          };
        }
      }
    }

    const updated = await Booking.findByIdAndUpdate(
      req.params.id,
      updateObj,
      { new: true, runValidators: false }
    ).populate('assignedRider', 'name phone')
      .populate('pickupRider', 'name phone')
      .populate('deliveryRider', 'name phone');
    res.json(updated);
  } catch (error) {
    console.error("Error assigning rider:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/** ------------------------
 * 🔄 Reschedule/Recover Booking
 * ------------------------ */
router.put("/:id/reschedule", adminAuth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const trackingEntry = {
      status: "pending",
      location: booking.currentLocation || "Hub",
      timestamp: new Date(),
      description: "Booking rescheduled from cancelled state by admin."
    };

    const updated = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: "pending",
          isRejected: false,
          rejectionReason: ""
        },
        $push: { trackingHistory: trackingEntry }
      },
      { new: true, runValidators: false }
    );

    res.json(enrichedBooking(updated));
  } catch (error) {
    console.error("Error rescheduling booking:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/** ------------------------
 * 🔄 Reschedule/Recover Booking
 * ------------------------ */
router.put("/:id/reschedule-campus", adminAuth, async (req, res) => {
  try {
    const { rescheduleType, newDate, newSlot, source } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const typeLabel = rescheduleType === "pickup" ? "Box Pickup" : "Box Delivery";
    const sourceLabel = source === "admin" ? "Admin/Internal Reasons" : "Customer Request";

    const trackingUpdate = {
      status: booking.status,
      location: booking.currentLocation || "Hub",
      timestamp: new Date(),
      description: `${typeLabel} Rescheduled to ${new Date(newDate).toLocaleDateString()} (${newSlot}) due to ${sourceLabel}.`
    };

    // Use findByIdAndUpdate to avoid triggering full document validation (e.g. missing weight)
    const updatePayload = {
      $push: { trackingHistory: trackingUpdate }
    };

    if (rescheduleType === "pickup") {
      updatePayload.pickupDate = new Date(newDate);
      updatePayload.pickupSlot = newSlot;
    } else {
      updatePayload.boxDeliveryDate = new Date(newDate);
      updatePayload.boxDeliverySlot = newSlot;
    }

    const updated = await Booking.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: false } // runValidators: false is key here to bypass structural validation errors on unrelated fields
    );

    // Trigger Email Notification
    if (updated.senderDetails?.email) {
      let emailHtml = "";
      let subject = "";

      if (source === "admin") {
        subject = `Schedule Update for your Booking ${updated.bookingId}`;
        emailHtml = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #ea580c;">Important Schedule Update</h2>
            <p>Dear ${updated.senderDetails.name},</p>
            <p>Due to unforeseen circumstances, we are unable to complete your <strong>${typeLabel}</strong> as scheduled.</p>
            <p>We have rescheduled it for:</p>
            <div style="background-color: #fff7ed; padding: 15px; border-radius: 8px; border: 1px solid #ffedd5; margin: 20px 0;">
              <p style="margin: 0;"><strong>Date:</strong> ${new Date(newDate).toLocaleDateString()}</p>
              <p style="margin: 5px 0 0 0;"><strong>Time Slot:</strong> ${newSlot}</p>
            </div>
            <p>We sincerely apologize for any inconvenience caused.</p>
            <p>Best regards,<br><strong>Engineers Parcel Team</strong></p>
          </div>
        `;
      } else {
        subject = `Rescheduled: ${updated.bookingId}`;
        emailHtml = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #ea580c;">Schedule Confirmed</h2>
            <p>Dear ${updated.senderDetails.name},</p>
            <p>As per your request, your Campus Parcel <strong>${typeLabel}</strong> has been successfully rescheduled.</p>
            <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #dcfce7; margin: 20px 0;">
              <p style="margin: 0;"><strong>New Date:</strong> ${new Date(newDate).toLocaleDateString()}</p>
              <p style="margin: 5px 0 0 0;"><strong>New Time Slot:</strong> ${newSlot}</p>
            </div>
            <p>Thank you for choosing Engineers Parcel.</p>
            <p>Best regards,<br><strong>Engineers Parcel Team</strong></p>
          </div>
        `;
      }

      try {
        await sendEmail({
          to: updated.senderDetails.email,
          subject,
          html: emailHtml,
          bookingId: updated.bookingId
        });
        console.log(`✅ Reschedule email sent for ${updated.bookingId}`);
      } catch (emailErr) {
        console.error("❌ Failed to send reschedule email:", emailErr);
      }
    }

    res.json(enrichedBooking(updated));
  } catch (error) {
    console.error("Error rescheduling campus booking:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/** ------------------------
 * ❌ Cancel Booking
 * ------------------------ */
router.put("/:id/cancel", authMiddleware, async (req, res) => {
  try {
    const { reason, initiatedBy = "admin" } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const cancelReason = reason || "No reason provided";
    const statusEntry = {
      status: "cancelled",
      location: booking.currentLocation || "Hub",
      timestamp: new Date(),
      description: `Booking cancelled by ${initiatedBy}. Reason: ${cancelReason}`
    };

    const updated = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        $set: { status: "cancelled" },
        $push: { trackingHistory: statusEntry }
      },
      { new: true, runValidators: false }
    );

    // Send Cancellation Email
    if (updated.senderDetails?.email) {
      const subject = `Booking Cancelled: ${updated.bookingId}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #dc2626;">Booking Cancellation Notification</h2>
          <p>Dear ${updated.senderDetails.name},</p>
          <p>Your booking with ID <strong>${updated.bookingId}</strong> has been cancelled.</p>
          <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fee2e2; margin: 20px 0;">
            <p style="margin: 0;"><strong>Reason:</strong> ${cancelReason}</p>
          </div>
          <p style="font-weight: bold; color: #ef4444;">
            If you have made any payment, it will be refunded to your original payment mode within 7 working days.
          </p>
          <p>We apologize for any inconvenience caused.</p>
          <p>Best regards,<br><strong>Engineers Parcel Team</strong></p>
        </div>
      `;

      try {
        await sendEmail({
          to: updated.senderDetails.email,
          subject,
          html: emailHtml,
          bookingId: updated.bookingId
        });
        console.log(`✅ Cancellation email sent for ${updated.bookingId}`);
      } catch (emailErr) {
        console.error("❌ Failed to send cancellation email:", emailErr);
      }
    }

    res.json(updated);
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

/** ------------------------
 * 📄 Office Label Download
 * ------------------------ */
router.get("/:id/office-label", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).lean();
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const pdfBuffer = await generateOfficeLabelPDF(booking);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=Office-Label-${booking.bookingId || 'Shipment'}.pdf`
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Office Label Download Error:", error);
    res.status(500).json({ message: "Failed to generate office label" });
  }
});

// Helper to return standardized booking response if needed
const enrichedBooking = (b) => {
  return b; // Adjust if you have a specific mapping
};

/** ------------------------
 * 🗓️ Tomorrow's Tasks (Pickups/Deliveries)
 * ------------------------ */

// Get count of unique bookings for tomorrow
router.get("/tasks/tomorrow-count", adminAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Tomorrow start: today + 1 day
    const tomorrowStart = new Date(today);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    // Day after tomorrow start: today + 2 days
    const tomorrowEnd = new Date(today);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 2);

    console.log(`Fetching tasks between ${tomorrowStart.toISOString()} and ${tomorrowEnd.toISOString()}`);

    const count = await Booking.countDocuments({
      serviceType: "campus-parcel",
      $or: [
        {
          pickupDate: { $gte: tomorrowStart, $lt: tomorrowEnd },
          status: { $nin: ['picked', 'in-transit', 'out-for-delivery', 'delivered', 'cancelled'] }
        },
        {
          boxDeliveryDate: { $gte: tomorrowStart, $lt: tomorrowEnd },
          isBoxDelivered: { $ne: true }
        }
      ]
    });

    res.json({ count: count || 0 });
  } catch (error) {
    console.error("Error in /tasks/tomorrow-count:", error);
    res.status(500).json({
      message: "Server error fetching task count",
      error: error.message
    });
  }
});

// Get detail of bookings for tasks (default tomorrow, or specific date / range)
router.get("/tasks/tomorrow", adminAuth, async (req, res) => {
  try {
    const { date, range } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let targetStart = new Date(today);
    let targetEnd = new Date(today);

    if (range === 'last7days') {
      targetStart.setDate(targetStart.getDate() - 7);
      targetEnd.setDate(targetEnd.getDate() + 1); // Up to the end of today
    } else if (range === 'next7days') {
      targetStart = new Date(today);
      targetEnd = new Date(today);
      targetEnd.setDate(targetEnd.getDate() + 7);
    } else if (req.query.startDate && req.query.endDate) {
      targetStart = new Date(req.query.startDate);
      targetStart.setHours(0, 0, 0, 0);
      targetEnd = new Date(req.query.endDate);
      targetEnd.setHours(23, 59, 59, 999);
    } else if (date) {
      targetStart = new Date(date);
      targetStart.setHours(0, 0, 0, 0);
      targetEnd = new Date(targetStart);
      targetEnd.setDate(targetEnd.getDate() + 1);
    } else {
      // Default to next 7 days as requested
      targetStart = new Date(today);
      targetEnd = new Date(today);
      targetEnd.setDate(targetEnd.getDate() + 7);
    }

    const bookings = await Booking.find({
      serviceType: "campus-parcel",
      $or: [
        { pickupDate: { $gte: targetStart, $lt: targetEnd } },
        { boxDeliveryDate: { $gte: targetStart, $lt: targetEnd } }
      ]
    }).select('bookingId senderDetails receiverDetails pickupDate pickupSlot boxDeliveryDate boxDeliverySlot serviceType status isBoxDelivered assignedRider pickupRider deliveryRider')
      .populate('assignedRider', 'name phone')
      .populate('pickupRider', 'name phone')
      .populate('deliveryRider', 'name phone');

    // Categorize
    const boxPickups = bookings.filter(b =>
      b.pickupDate &&
      new Date(b.pickupDate) >= targetStart &&
      new Date(b.pickupDate) < targetEnd
    );

    const boxDeliveries = bookings.filter(b =>
      b.boxDeliveryDate &&
      new Date(b.boxDeliveryDate) >= targetStart &&
      new Date(b.boxDeliveryDate) < targetEnd
    );

    res.json({
      boxPickups: boxPickups || [],
      boxDeliveries: boxDeliveries || []
    });
  } catch (error) {
    console.error("Error in /tasks/tomorrow:", error);
    res.status(500).json({
      message: "Server error fetching tasks",
      error: error.message
    });
  }
});

// Mark a task as completed
router.put("/:id/tasks/complete", adminAuth, async (req, res) => {
  try {
    const { type } = req.body; // 'pickup' or 'delivery'
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const trackEntry = {
      status: (type === 'pickup' ? 'picked' : booking.status),
      location: booking.currentLocation || "Hub",
      timestamp: new Date(),
      description: type === 'delivery' ? "Empty boxes / packaging material delivered to customer." : "Shipment successfully picked up from customer."
    };

    const updated = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: (type === 'pickup' ? 'picked' : booking.status),
          isBoxDelivered: (type === 'delivery' ? true : booking.isBoxDelivered)
        },
        $push: { trackingHistory: trackEntry }
      },
      { new: true, runValidators: false }
    );

    res.json({ message: "Task marked as completed", booking: updated });
  } catch (error) {
    console.error("Error completing task:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/** ------------------------
 * ✅ Finalize Booking Status
 * ------------------------ */
router.put("/:id/finalize", adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const finalStatus = status || 'delivered';

    const updated = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        $set: { status: finalStatus },
        $push: {
          trackingHistory: {
            status: finalStatus,
            location: booking.currentLocation || "Hub",
            timestamp: new Date(),
            description: `Booking finalized by Admin. Shipment marked as ${finalStatus.toUpperCase()}.`
          }
        }
      },
      { new: true, runValidators: false }
    );
    res.json(updated);
  } catch (error) {
    console.error("Error finalizing booking:", error);
    res.status(500).json({ message: "Server error" });
  }
});
/** ------------------------
 * ✅ Unassign Docket ID
 * ------------------------ */
router.put("/:id/unassign-docket", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const docketIdToUnassign = booking.vendorTrackingId;

    if (docketIdToUnassign) {
      // 1. Release the docket in DocketInventory
      await DocketInventory.findOneAndUpdate(
        { docketId: docketIdToUnassign.toString().trim() },
        {
          $set: { status: "available" },
          $unset: { usedAt: "" },
          $pull: { usedBy: booking._id, epId: booking.bookingId }
        }
      );
    }

    // 2. Clear from booking
    const updated = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        $set: { vendorTrackingId: "" }
      },
      { new: true, runValidators: false }
    );

    res.json(updated);
  } catch (error) {
    console.error("Error unassigning docket:", error);
    res.status(500).json({ message: "Server error" });
  }
});
/** ------------------------
 * ✅ Update Payment Status
 * ------------------------ */
router.put("/:id/payment-status", authMiddleware, uploadPaymentProof.single("paymentProof"), async (req, res) => {
  try {
    const { paymentStatus, amountReceived } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const updateData = { paymentStatus };

    if (amountReceived !== undefined) {
      updateData.amountReceived = Number(amountReceived);
    }

    if (req.file) {
      updateData.paymentProof = `/uploads/payments/${req.file.filename}`;
    }

    const updated = await Booking.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: false }
    );

    res.json(updated);
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/** ------------------------
 * 🔍 Mark Booking Checked for Updates (Staff/Admin Verification)
 * ------------------------ */
router.put("/:id/mark-checked", authMiddleware, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userName = req.user ? (req.user.name || req.user.email) : (req.admin ? req.admin.name : "Staff");
    const userId = req.user ? req.user.id : (req.admin ? req.admin.id : null);
    const now = new Date();

    const updated = await Booking.findByIdAndUpdate(
      bookingId,
      {
        $set: {
          lastCheckedAt: now,
          lastCheckedBy: userId,
          lastCheckedByName: userName,
          lastCheckedNotes: req.body.notes || ""
        }
      },
      { new: true, runValidators: false }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    res.json({
      success: true,
      message: "Booking marked as checked",
      lastCheckedAt: updated.lastCheckedAt,
      lastCheckedByName: updated.lastCheckedByName
    });
  } catch (error) {
    console.error("Error marking booking as checked:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/** ------------------------
 * 💰 Direct Shipment Costs / Expenses Tracking
 * ------------------------ */
router.put("/:id/expenses", authMiddleware, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { courierCost = 0, packagingCost = 0, riderCost = 0, otherCost = 0, notes = "" } = req.body;

    const numCourier = Math.max(0, parseFloat(courierCost) || 0);
    const numPackaging = Math.max(0, parseFloat(packagingCost) || 0);
    const numRider = Math.max(0, parseFloat(riderCost) || 0);
    const numOther = Math.max(0, parseFloat(otherCost) || 0);
    const totalExpenses = numCourier + numPackaging + numRider + numOther;

    const userName = req.admin ? req.admin.username : (req.user ? req.user.name : "Staff");
    const userId = req.admin ? req.admin._id : (req.user ? req.user._id : null);

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    booking.expenses = {
      courierCost: numCourier,
      packagingCost: numPackaging,
      riderCost: numRider,
      otherCost: numOther,
      totalExpenses,
      notes: notes.trim(),
      updatedAt: new Date(),
      updatedBy: userId,
      updatedByName: userName
    };

    await booking.save();

    const revenue = Number(booking.pricing?.totalAmount || booking.totalAmount || 0);
    const netProfit = revenue - totalExpenses;
    const marginPercent = revenue > 0 ? Number(((netProfit / revenue) * 100).toFixed(2)) : 0;

    res.json({
      success: true,
      message: "Shipment expenses updated successfully",
      expenses: booking.expenses,
      netProfit,
      marginPercent
    });
  } catch (error) {
    console.error("Error updating shipment expenses:", error);
    res.status(500).json({ success: false, message: error.message || "Server error updating shipment expenses" });
  }
});

module.exports = router;

