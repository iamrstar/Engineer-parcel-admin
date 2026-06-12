const express = require("express");
const Booking = require("../models/Booking");
const DocketInventory = require("../models/DocketInventory");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const Razorpay = require("razorpay");
const { generateReceiptPDF, generateOfficeLabelPDF } = require("../utils/pdfService");
const sendEmail = require("../utils/sendEmail");

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
 * 📧 Helper: Send Delivery Email
 * ------------------------ */
const sendDeliveryEmail = async (booking) => {
  try {
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

    const totalBookings = await Booking.countDocuments(query);
    const pendingBookings = await Booking.countDocuments({ ...query, status: "pending" });
    const deliveredBookings = await Booking.countDocuments({ ...query, status: "delivered" });
    const inTransitBookings = await Booking.countDocuments({ ...query, status: "in-transit" });

    const totalRevenue = await Booking.aggregate([
      { $match: { ...query, paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$pricing.totalAmount" } } },
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
    const { startDate, endDate, serviceType } = req.query;
    const match = { paymentStatus: "paid" };

    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        match.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        match.createdAt.$lte = end;
      }
    }

    if (serviceType && serviceType !== "all") {
      match.serviceType = serviceType;
    }

    if (req.admin && req.admin.officeId) {
      match.officeId = req.admin.officeId;
    } else if (req.query.officeId && req.query.officeId !== "all") {
      match.officeId = req.query.officeId;
    }

    const reportData = await Booking.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          totalAmount: { $sum: "$pricing.totalAmount" },
          totalBookings: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      {
        $project: {
          _id: 0,
          month: "$_id",
          totalAmount: 1,
          totalBookings: 1
        }
      }
    ]);

    res.json({ success: true, reportData });
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
    const { page = 1, limit = 10, status, serviceType, search, startDate, endDate } = req.query;
    const query = {};

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

    if (req.query.vendorFilter) {
      if (req.query.vendorFilter === "none") {
        query.$or = [
          { vendorName: { $exists: false } },
          { vendorName: "" },
          { vendorName: null }
        ];
      } else if (req.query.vendorFilter !== "all") {
        query.vendorName = new RegExp(req.query.vendorFilter, "i");
      }
    } else if (req.query.vendorNotAssigned === "true") {
      query.$or = [
        { vendorName: { $exists: false } },
        { vendorName: "" },
        { vendorName: null }
      ];
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

    if (search) {
      query.$or = [
        { bookingId: { $regex: search, $options: "i" } },
        { trackingId: { $regex: search, $options: "i" } },
        { vendorTrackingId: { $regex: search, $options: "i" } },
        { "senderDetails.name": { $regex: search, $options: "i" } },
        { "receiverDetails.name": { $regex: search, $options: "i" } },
        { "senderDetails.phone": { $regex: search, $options: "i" } },
        { "receiverDetails.phone": { $regex: search, $options: "i" } },
      ];
    }

    const bookingsRaw = await Booking.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("createdBy", "name username")
      .lean();

    // Look up EDL/KM for items that don't have it (older bookings) - Optimized Bulk Lookup
    const Pincode = require("../models/Pincode");
    const uniquePincodes = [...new Set(bookingsRaw.map(b => b.receiverDetails?.pincode).filter(Boolean))];
    const pinInfo = await Pincode.find({ pincode: { $in: uniquePincodes } }).lean();
    const pinMap = Object.fromEntries(pinInfo.map(p => [p.pincode, p]));

    const bookings = bookingsRaw.map((b) => {
      if ((!b.edl || !b.km) && b.receiverDetails?.pincode) {
        const pin = pinMap[b.receiverDetails.pincode];
        if (pin) {
          return { ...b, edl: pin.edl || 0, km: pin.km || 0 };
        }
      }
      return b;
    });

    const total = await Booking.countDocuments(query);

    res.json({
      bookings,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total,
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
    const { status, serviceType, search, startDate, endDate, vendorNotAssigned, vendorFilter, officeId } = req.query;
    const query = {};

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
    
    if (vendorFilter) {
      if (vendorFilter === "none") {
        query.$or = [{ vendorName: { $exists: false } }, { vendorName: "" }, { vendorName: null }];
      } else if (vendorFilter !== "all") {
        query.vendorName = new RegExp(vendorFilter, "i");
      }
    } else if (vendorNotAssigned === "true") {
      query.$or = [{ vendorName: { $exists: false } }, { vendorName: "" }, { vendorName: null }];
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
    if (search) {
      query.$or = [
        { bookingId: { $regex: search, $options: "i" } },
        { trackingId: { $regex: search, $options: "i" } },
        { vendorTrackingId: { $regex: search, $options: "i" } },
        { "senderDetails.name": { $regex: search, $options: "i" } },
        { "receiverDetails.name": { $regex: search, $options: "i" } },
        { "senderDetails.phone": { $regex: search, $options: "i" } },
        { "receiverDetails.phone": { $regex: search, $options: "i" } },
      ];
    }

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .select("bookingId serviceType status senderDetails receiverDetails pricing createdAt packageDetails weight km edl vendorName paymentStatus paymentMethod")
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

router.put("/bulk/assign-vendor", adminAuth, async (req, res) => {
  try {
    const { bookingIds, vendorId, vendorName } = req.body;
    if (!bookingIds || !Array.isArray(bookingIds) || !vendorId || !vendorName) {
      return res.status(400).json({ message: "Invalid request data" });
    }

    await Booking.updateMany(
      { _id: { $in: bookingIds } },
      { 
        $set: { vendorId, vendorName, isVendorBooking: true },
        $push: {
          trackingHistory: {
            location: "Hub",
            timestamp: new Date(),
            status: "pending",
            description: `Bulk assigned to Vendor ${vendorName}`
          }
        }
      }
    );

    // Notify Admins
    const io = req.app.get("socketio");
    if (io) {
      io.emit("status_update", {
        bookingIds,
        status: "VENDOR_ASSIGNED",
        description: `Bulk assigned to Vendor ${vendorName}`,
        bookingSource: "Bulk"
      });
    }

    res.json({ success: true, message: `Assigned ${bookingIds.length} bookings to ${vendorName}.` });
  } catch (error) {
    console.error("Bulk Assign Vendor Error:", error);
    res.status(500).json({ message: "Server error during bulk vendor assignment" });
  }
});

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
        $set: { vendorTrackingId, vendorName, isVendorBooking: true },
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
      .populate('deliveryRider', 'name phone');
      
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.json(booking);
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

    // Generate PDF
    const { receipt, label, declaration } = req.query;
    const { generateCombinedPDF } = require("../utils/pdfService");
    const pdfBuffer = await generateCombinedPDF(booking, { receipt, label, declaration });

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
    const query = mongoose.Types.ObjectId.isValid(req.params.id) 
      ? { _id: req.params.id } 
      : { bookingId: req.params.id };

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

    // Prevent populated objects from causing CastErrors during flatten/update
    const cleanBody = { ...req.body };
    const idFields = ['assignedRider', 'pickupRider', 'deliveryRider', 'userId', 'vendorId'];
    
    idFields.forEach(field => {
      if (cleanBody[field]) {
        if (typeof cleanBody[field] === 'object') {
          if (cleanBody[field]._id) {
            cleanBody[field] = cleanBody[field]._id;
          } else {
            delete cleanBody[field];
          }
        } else if (typeof cleanBody[field] === 'string') {
          // If it's a string but not a valid ObjectId (like "Vivek "), remove it
          if (!mongoose.Types.ObjectId.isValid(cleanBody[field])) {
            delete cleanBody[field];
          }
        }
      }
    });

    const updateData = flattenObject(cleanBody);

    // ✅ Validate if vendorTrackingId (Docket ID) is already in use
    if (updateData.vendorTrackingId) {
      const trackingId = updateData.vendorTrackingId.toString().trim();
      const currentBooking = await Booking.findOne(query);
      
      if (currentBooking && currentBooking.vendorTrackingId !== trackingId) {
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

    const booking = await Booking.findOneAndUpdate(
      query, 
      { $set: updateData }, 
      { new: true, runValidators: true }
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

module.exports = router;
