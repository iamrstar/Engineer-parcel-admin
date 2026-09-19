const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const mongoose = require("mongoose");
const Expense = require("../models/Expense");
const Booking = require("../models/Booking");
const authMiddleware = require("../middleware/auth");

// Ensure upload directory exists for receipts
const uploadDir = path.join(__dirname, "../uploads/expenses");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "receipt-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * @route   GET /api/expenses/categories
 * @desc    Get predefined expense categories
 */
router.get("/categories", authMiddleware, (req, res) => {
  res.json({ success: true, categories: Expense.expenseCategories });
});

/**
 * @route   GET /api/expenses/pnl-analytics
 * @desc    Calculate comprehensive Profit & Loss (P&L) and Actual Net Profit
 */
router.get("/pnl-analytics", authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, officeId } = req.query;

    // Build Date Filter
    let dateQuery = {};
    let start, end;

    if (startDate || endDate) {
      start = startDate ? new Date(startDate) : new Date("2020-01-01");
      start.setHours(0, 0, 0, 0);

      end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);

      dateQuery = { $gte: start, $lte: end };
    }

    // 1. Build Booking Match Filter (Exclude cancelled)
    const bookingMatch = {
      status: { $not: /^\s*cancelled\s*$/i }
    };
    if (startDate || endDate) {
      bookingMatch.createdAt = dateQuery;
    }
    if (officeId && officeId !== "all") {
      bookingMatch.officeId = new mongoose.Types.ObjectId(officeId);
    } else if (req.admin && req.admin.officeId) {
      bookingMatch.officeId = req.admin.officeId;
    }

    // 2. Build Expense Match Filter
    const expenseMatch = {};
    if (startDate || endDate) {
      expenseMatch.date = dateQuery;
    }
    if (officeId && officeId !== "all") {
      expenseMatch.officeId = new mongoose.Types.ObjectId(officeId);
    } else if (req.admin && req.admin.officeId) {
      expenseMatch.officeId = req.admin.officeId;
    }

    // Run parallel aggregations
    const [bookingStatsResult, expenseStatsResult, categoryBreakdown, timeSeriesBookings, timeSeriesExpenses] = await Promise.all([
      // A. Booking Revenue & Direct Shipment Costs
      Booking.aggregate([
        { $match: bookingMatch },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            grossRevenue: {
              $sum: {
                $ifNull: [
                  "$pricing.totalAmount",
                  { $ifNull: ["$totalAmount", 0] }
                ]
              }
            },
            cashCollected: {
              $sum: { $ifNull: ["$amountReceived", 0] }
            },
            courierCost: {
              $sum: { $ifNull: ["$expenses.courierCost", 0] }
            },
            packagingCost: {
              $sum: { $ifNull: ["$expenses.packagingCost", 0] }
            },
            riderCost: {
              $sum: { $ifNull: ["$expenses.riderCost", 0] }
            },
            otherCost: {
              $sum: { $ifNull: ["$expenses.otherCost", 0] }
            },
            totalDirectCosts: {
              $sum: {
                $add: [
                  { $ifNull: ["$expenses.courierCost", 0] },
                  { $ifNull: ["$expenses.packagingCost", 0] },
                  { $ifNull: ["$expenses.riderCost", 0] },
                  { $ifNull: ["$expenses.otherCost", 0] }
                ]
              }
            }
          }
        }
      ]),

      // B. Overall Operational Expenses
      Expense.aggregate([
        { $match: expenseMatch },
        {
          $group: {
            _id: null,
            totalOperatingExpenses: { $sum: "$amount" },
            paidOperatingExpenses: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "Paid"] }, "$amount", 0]
              }
            },
            pendingOperatingExpenses: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "Pending"] }, "$amount", 0]
              }
            },
            expenseCount: { $sum: 1 }
          }
        }
      ]),

      // C. Expense Breakdown by Category
      Expense.aggregate([
        { $match: expenseMatch },
        {
          $group: {
            _id: "$category",
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalAmount: -1 } }
      ]),

      // D. Booking Daily Trends
      Booking.aggregate([
        { $match: bookingMatch },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: {
              $sum: {
                $ifNull: ["$pricing.totalAmount", { $ifNull: ["$totalAmount", 0] }]
              }
            },
            collected: { $sum: { $ifNull: ["$amountReceived", 0] } },
            directCosts: {
              $sum: {
                $add: [
                  { $ifNull: ["$expenses.courierCost", 0] },
                  { $ifNull: ["$expenses.packagingCost", 0] },
                  { $ifNull: ["$expenses.riderCost", 0] },
                  { $ifNull: ["$expenses.otherCost", 0] }
                ]
              }
            },
            orders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // E. Expense Daily Trends
      Expense.aggregate([
        { $match: expenseMatch },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            operatingExpenses: { $sum: "$amount" },
            expenseCount: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const bStats = bookingStatsResult[0] || {
      totalBookings: 0,
      grossRevenue: 0,
      cashCollected: 0,
      courierCost: 0,
      packagingCost: 0,
      riderCost: 0,
      otherCost: 0,
      totalDirectCosts: 0
    };

    const eStats = expenseStatsResult[0] || {
      totalOperatingExpenses: 0,
      paidOperatingExpenses: 0,
      pendingOperatingExpenses: 0,
      expenseCount: 0
    };

    // Calculate core P&L figures
    const grossRevenue = Math.round(bStats.grossRevenue);
    const cashCollected = Math.round(bStats.cashCollected);
    const totalDirectCosts = Math.round(bStats.totalDirectCosts);
    const totalOperatingExpenses = Math.round(eStats.totalOperatingExpenses);
    const totalAllExpenses = totalDirectCosts + totalOperatingExpenses;

    const grossProfit = grossRevenue - totalDirectCosts;
    const grossMarginPercent = grossRevenue > 0 ? Number(((grossProfit / grossRevenue) * 100).toFixed(2)) : 0;

    const actualNetProfit = grossRevenue - totalAllExpenses;
    const netProfitMarginPercent = grossRevenue > 0 ? Number(((actualNetProfit / grossRevenue) * 100).toFixed(2)) : 0;

    const cashRealizedNetProfit = cashCollected - totalAllExpenses;

    // Merge time series for chart display
    const trendMap = {};
    timeSeriesBookings.forEach(item => {
      trendMap[item._id] = {
        date: item._id,
        revenue: Math.round(item.revenue || 0),
        collected: Math.round(item.collected || 0),
        directCosts: Math.round(item.directCosts || 0),
        operatingExpenses: 0,
        totalExpenses: Math.round(item.directCosts || 0),
        netProfit: Math.round((item.revenue || 0) - (item.directCosts || 0)),
        orders: item.orders || 0
      };
    });

    timeSeriesExpenses.forEach(item => {
      if (!trendMap[item._id]) {
        trendMap[item._id] = {
          date: item._id,
          revenue: 0,
          collected: 0,
          directCosts: 0,
          operatingExpenses: Math.round(item.operatingExpenses || 0),
          totalExpenses: Math.round(item.operatingExpenses || 0),
          netProfit: -Math.round(item.operatingExpenses || 0),
          orders: 0
        };
      } else {
        trendMap[item._id].operatingExpenses = Math.round(item.operatingExpenses || 0);
        trendMap[item._id].totalExpenses += Math.round(item.operatingExpenses || 0);
        trendMap[item._id].netProfit -= Math.round(item.operatingExpenses || 0);
      }
    });

    const timeSeries = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

    // Combine category breakdown including direct shipment costs for comprehensive donut chart
    const fullCategoryBreakdown = [...categoryBreakdown.map(c => ({
      name: c._id,
      amount: Math.round(c.totalAmount),
      count: c.count,
      isDirectShipment: false
    }))];

    if (bStats.courierCost > 0) {
      fullCategoryBreakdown.push({
        name: "Shipment Courier Freight",
        amount: Math.round(bStats.courierCost),
        count: bStats.totalBookings,
        isDirectShipment: true
      });
    }
    if (bStats.packagingCost > 0) {
      fullCategoryBreakdown.push({
        name: "Shipment Packaging",
        amount: Math.round(bStats.packagingCost),
        count: bStats.totalBookings,
        isDirectShipment: true
      });
    }
    if (bStats.riderCost > 0) {
      fullCategoryBreakdown.push({
        name: "Rider Payouts / Fuel",
        amount: Math.round(bStats.riderCost),
        count: bStats.totalBookings,
        isDirectShipment: true
      });
    }

    fullCategoryBreakdown.sort((a, b) => b.amount - a.amount);

    res.json({
      success: true,
      summary: {
        grossRevenue,
        cashCollected,
        pendingCollection: Math.max(0, grossRevenue - cashCollected),
        totalBookings: bStats.totalBookings,
        
        // Direct Costs
        directCosts: {
          courierCost: Math.round(bStats.courierCost),
          packagingCost: Math.round(bStats.packagingCost),
          riderCost: Math.round(bStats.riderCost),
          otherCost: Math.round(bStats.otherCost),
          total: totalDirectCosts
        },

        grossProfit,
        grossMarginPercent,

        // Operational Expenses
        operatingExpenses: {
          total: totalOperatingExpenses,
          paid: Math.round(eStats.paidOperatingExpenses),
          pending: Math.round(eStats.pendingOperatingExpenses),
          count: eStats.expenseCount
        },

        // Bottom Line
        totalAllExpenses,
        actualNetProfit,
        netProfitMarginPercent,
        cashRealizedNetProfit
      },
      categoryBreakdown: fullCategoryBreakdown,
      timeSeries
    });
  } catch (error) {
    console.error("Error in P&L analytics:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to calculate P&L analytics" });
  }
});

/**
 * @route   GET /api/expenses
 * @desc    Get paginated expenses with filters
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      category = "all",
      paymentMode = "all",
      paymentStatus = "all",
      startDate,
      endDate,
      officeId
    } = req.query;

    const query = {};

    if (category && category !== "all") {
      query.category = category;
    }

    if (paymentMode && paymentMode !== "all") {
      query.paymentMode = paymentMode;
    }

    if (paymentStatus && paymentStatus !== "all") {
      query.paymentStatus = paymentStatus;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    if (officeId && officeId !== "all") {
      query.officeId = officeId;
    } else if (req.admin && req.admin.officeId) {
      query.officeId = req.admin.officeId;
    }

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { title: regex },
        { paidTo: regex },
        { notes: regex },
        { expenseId: regex }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [expenses, totalCount, totalAmountAgg] = await Promise.all([
      Expense.find(query)
        .populate("officeId", "name")
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Expense.countDocuments(query),
      Expense.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);

    const totalAmount = totalAmountAgg.length > 0 ? totalAmountAgg[0].total : 0;

    res.json({
      success: true,
      expenses,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      },
      filteredTotalAmount: Math.round(totalAmount)
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({ success: false, message: "Server error fetching expenses" });
  }
});

/**
 * @route   POST /api/expenses
 * @desc    Create a new expense
 */
router.post("/", authMiddleware, upload.single("receipt"), async (req, res) => {
  try {
    const {
      title,
      category,
      amount,
      paymentMode,
      paymentStatus,
      date,
      paidTo,
      officeId,
      notes
    } = req.body;

    if (!title || !category || amount === undefined) {
      return res.status(400).json({ success: false, message: "Title, category, and amount are required" });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({ success: false, message: "Amount must be a valid positive number" });
    }

    const userName = req.admin ? req.admin.username : (req.user ? req.user.name : "Admin");
    const userId = req.admin ? req.admin._id : (req.user ? req.user._id : null);

    const expense = new Expense({
      title: title.trim(),
      category,
      amount: numAmount,
      paymentMode: paymentMode || "UPI",
      paymentStatus: paymentStatus || "Paid",
      date: date ? new Date(date) : new Date(),
      paidTo: paidTo ? paidTo.trim() : "",
      officeId: officeId || (req.admin?.officeId || req.user?.officeId || null),
      receiptImage: req.file ? `/uploads/expenses/${req.file.filename}` : "",
      notes: notes ? notes.trim() : "",
      createdBy: userId,
      createdByName: userName
    });

    await expense.save();

    res.status(201).json({
      success: true,
      message: "Expense recorded successfully",
      expense
    });
  } catch (error) {
    console.error("Error creating expense:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to create expense" });
  }
});

/**
 * @route   PUT /api/expenses/:id
 * @desc    Update an existing expense
 */
router.put("/:id", authMiddleware, upload.single("receipt"), async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    const {
      title,
      category,
      amount,
      paymentMode,
      paymentStatus,
      date,
      paidTo,
      officeId,
      notes
    } = req.body;

    if (title) expense.title = title.trim();
    if (category) expense.category = category;
    if (amount !== undefined) {
      const numAmount = parseFloat(amount);
      if (!isNaN(numAmount) && numAmount >= 0) {
        expense.amount = numAmount;
      }
    }
    if (paymentMode) expense.paymentMode = paymentMode;
    if (paymentStatus) expense.paymentStatus = paymentStatus;
    if (date) expense.date = new Date(date);
    if (paidTo !== undefined) expense.paidTo = paidTo.trim();
    if (officeId !== undefined) expense.officeId = officeId || null;
    if (notes !== undefined) expense.notes = notes.trim();

    if (req.file) {
      expense.receiptImage = `/uploads/expenses/${req.file.filename}`;
    }

    await expense.save();

    res.json({
      success: true,
      message: "Expense updated successfully",
      expense
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update expense" });
  }
});

/**
 * @route   DELETE /api/expenses/:id
 * @desc    Delete an expense
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByIdAndDelete(id);

    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    // Attempt to remove receipt file if exists
    if (expense.receiptImage) {
      const filePath = path.join(__dirname, "..", expense.receiptImage);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({ success: true, message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Error deleting expense:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to delete expense" });
  }
});

module.exports = router;
