const express = require("express");
const router = express.Router();
const DocketInventory = require("../models/DocketInventory");
const adminAuth = require("../middleware/adminAuth");

// @route   POST /api/dockets/upload
// @desc    Bulk upload docket IDs for a vendor
router.post("/upload", async (req, res) => {
  try {
    const { vendorName, ids } = req.body;

    if (!vendorName || !ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: "Vendor name and an array of IDs are required." });
    }

    const normalizedVendor = vendorName.trim();
    const docketEntries = ids.map((id) => ({
      vendorName: normalizedVendor,
      docketId: id.toString().trim(),
      status: "available",
    }));

    let insertedCount = 0;
    try {
      const result = await DocketInventory.insertMany(docketEntries, { ordered: false });
      insertedCount = result.length;
    } catch (err) {
      insertedCount = err.insertedDocs ? err.insertedDocs.length : 0;
    }

    res.status(201).json({
      message: `${insertedCount} new IDs added, ${docketEntries.length - insertedCount} skipped (duplicates).`,
      success: true,
      added: insertedCount,
      skipped: docketEntries.length - insertedCount
    });
  } catch (error) {
    console.error("Docket upload error:", error);
    res.status(500).json({ error: "Failed to upload dockets." });
  }
});

// Get all dockets for a vendor (with optional status filter)
router.get("/vendor/:vendorName", async (req, res) => {
  try {
    const { vendorName } = req.params;
    const { status } = req.query; // 'available' or 'used'
    
    console.log("Fetching dockets for vendor:", vendorName);
    const escapedVendorName = vendorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let query = { vendorName: { $regex: new RegExp(`^${escapedVendorName}$`, "i") } };
    if (status) query.status = status;

    const dockets = await DocketInventory.find(query)
      .populate("usedBy", "senderDetails receiverDetails")
      .populate("assignedBy", "name role")
      .populate("assignedByOffice", "name code")
      .sort({ createdAt: -1 });
    res.json(dockets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a docket ID
router.delete("/:id", async (req, res) => {
  try {
    const docket = await DocketInventory.findById(req.params.id);
    if (!docket) return res.status(404).json({ message: "Docket not found" });
    
    await docket.deleteOne();
    res.json({ message: "Docket deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a docket ID
router.put("/:id", async (req, res) => {
  try {
    const { docketId } = req.body;
    if (!docketId) return res.status(400).json({ message: "Docket ID is required" });

    // Check for duplicates
    const existing = await DocketInventory.findOne({ 
      docketId: docketId.trim(), 
      _id: { $ne: req.params.id } 
    });
    if (existing) return res.status(400).json({ message: "This Docket ID already exists" });

    const docket = await DocketInventory.findByIdAndUpdate(
      req.params.id,
      { docketId: docketId.trim() },
      { new: true }
    );
    if (!docket) return res.status(404).json({ message: "Docket not found" });
    
    res.json(docket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/dockets/next/:vendorName
// @desc    Get the next available docket ID for a vendor (FIFO)
router.get("/next/:vendorName", async (req, res) => {
  try {
    const { vendorName } = req.params;
    const { startsWith } = req.query;
    console.log("NEXT DOCKET REQ:", req.url, req.params, req.query);
    
    // Find the oldest available docket for this vendor
    const escapedVendorName = vendorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let query = {
      vendorName: { $regex: new RegExp(`^${escapedVendorName}$`, "i") },
      status: "available",
    };

    if (startsWith) {
      const escapedStarts = startsWith.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.docketId = { $regex: new RegExp(`^${escapedStarts}`, "i") };
    }

    const nextDocket = await DocketInventory.findOne(query).sort({ createdAt: 1 });

    if (!nextDocket) {
      return res.status(404).json({ message: "No available dockets found for this vendor." });
    }

    res.json({ docketId: nextDocket.docketId });
  } catch (error) {
    console.error("Fetch next docket error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// @route   GET /api/dockets/stats
// @desc    Get inventory stats per vendor
router.get("/stats", async (req, res) => {
  try {
    const stats = await DocketInventory.aggregate([
      {
        $group: {
          _id: "$vendorName",
          available: { $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] } },
          used: { $sum: { $cond: [{ $eq: ["$status", "used"] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(stats);
  } catch (error) {
    console.error("Docket stats error:", error);
    res.status(500).json({ error: "Failed to fetch stats." });
  }
});

// @route   GET /api/dockets/used
// @desc    Get list of used docket IDs with booking details
router.get("/used", async (req, res) => {
  try {
    const usedDockets = await DocketInventory.find({ status: "used" })
      .populate("usedBy", "senderDetails receiverDetails")
      .populate("assignedBy", "name role")
      .populate("assignedByOffice", "name code")
      .sort({ usedAt: -1 })
      .limit(100);

    res.json(usedDockets);
  } catch (error) {
    console.error("Used dockets error:", error);
    res.status(500).json({ error: "Failed to fetch used dockets." });
  }
});

// @route   PUT /api/dockets/:id/mark-used-offline
// @desc    Mark a docket ID as used offline with booking ID and proof details
router.put("/:id/mark-used-offline", adminAuth, async (req, res) => {
  try {
    const { bookingId, customerName, reason, proof, notes } = req.body;

    if (!bookingId || !bookingId.trim()) {
      return res.status(400).json({ message: "Booking ID or Reference is required." });
    }

    const docket = await DocketInventory.findById(req.params.id);
    if (!docket) {
      return res.status(404).json({ message: "Docket not found." });
    }

    const trimmedId = bookingId.trim();
    const assignedUser = req.admin || req.user;

    docket.status = "used";
    docket.usedAt = new Date();
    docket.epId = [trimmedId];
    if (assignedUser?._id) {
      docket.assignedBy = assignedUser._id;
    }
    if (assignedUser?.officeId) {
      docket.assignedByOffice = assignedUser.officeId;
    }
    docket.metadata = {
      isOffline: true,
      bookingId: trimmedId,
      customerName: customerName ? customerName.trim() : "",
      reason: reason ? reason.trim() : "Offline Booking",
      proof: proof ? proof.trim() : "",
      notes: notes ? notes.trim() : "",
      markedAt: new Date(),
      markedBy: assignedUser?.name || "Admin",
      markedByRole: assignedUser?.role || "admin",
    };

    await docket.save();

    const populatedDocket = await DocketInventory.findById(docket._id)
      .populate("assignedBy", "name role")
      .populate("assignedByOffice", "name code");

    res.json({
      success: true,
      message: `Docket ${docket.docketId} marked as used offline.`,
      docket: populatedDocket,
    });
  } catch (error) {
    console.error("Mark docket offline error:", error);
    res.status(500).json({ message: "Failed to mark docket as used offline." });
  }
});

// @route   PUT /api/dockets/:id/mark-available
// @desc    Revert an offline-marked docket back to available inventory
router.put("/:id/mark-available", adminAuth, async (req, res) => {
  try {
    const docket = await DocketInventory.findById(req.params.id);
    if (!docket) {
      return res.status(404).json({ message: "Docket not found." });
    }

    docket.status = "available";
    docket.usedAt = null;
    docket.epId = [];
    docket.usedBy = [];
    docket.metadata = null;

    await docket.save();

    res.json({
      success: true,
      message: `Docket ${docket.docketId} marked back as available.`,
      docket,
    });
  } catch (error) {
    console.error("Revert docket error:", error);
    res.status(500).json({ message: "Failed to revert docket status." });
  }
});

module.exports = router;

