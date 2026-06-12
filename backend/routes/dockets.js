const express = require("express");
const router = express.Router();
const DocketInventory = require("../models/DocketInventory");

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
    
    let query = { vendorName: { $regex: new RegExp(`^${vendorName}$`, "i") } };
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
    
    // Find the oldest available docket for this vendor
    const nextDocket = await DocketInventory.findOne({
      vendorName: { $regex: new RegExp(`^${vendorName}$`, "i") },
      status: "available",
    }).sort({ createdAt: 1 });

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

module.exports = router;
