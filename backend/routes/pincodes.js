const express = require("express")
const Pincode = require("../models/Pincode")
const authMiddleware = require("../middleware/auth")
const router = express.Router()

// Get all pincodes or check specific pincode
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { code } = req.query;

    if (code) {
      if (!/^\d{6}$/.test(code)) {
        return res.status(400).json({
          success: false,
          message: "Invalid pincode format. Must be 6 digits."
        });
      }

      const pincodeData = await Pincode.findOne({ pincode: code });

      if (!pincodeData) {
        return res.json({
          success: false,
          available: false,
          message: "Pincode not found in our database",
          data: { pincode: code, isServiceable: false }
        });
      }

      return res.json({
        success: true,
        available: pincodeData.isServiceable,
        message: pincodeData.isServiceable ? "Service Available! ✅" : "Service temporarily unavailable ❌",
        city: pincodeData.city,
        state: pincodeData.state,
        district: pincodeData.district,
        country: pincodeData.country,
        deliveryDays: pincodeData.deliveryDays,
        serviceTypes: pincodeData.serviceTypes,
        additionalCharges: pincodeData.additionalCharges,
        data: pincodeData
      });
    }

    const pincodes = await Pincode.find().sort({ pincode: 1 })
    res.json(pincodes)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Add new pincode
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { pincode, city, state } = req.body

    const existingPincode = await Pincode.findOne({ pincode })
    if (existingPincode) {
      return res.status(400).json({ message: "Pincode already exists" })
    }

    const newPincode = new Pincode({ pincode, city, state })
    await newPincode.save()

    res.status(201).json(newPincode)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete pincode
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const pincode = await Pincode.findByIdAndDelete(req.params.id)
    if (!pincode) {
      return res.status(404).json({ message: "Pincode not found" })
    }
    res.json({ message: "Pincode deleted successfully" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Toggle pincode status
router.patch("/:id/toggle", authMiddleware, async (req, res) => {
  try {
    const pincode = await Pincode.findById(req.params.id)
    if (!pincode) {
      return res.status(404).json({ message: "Pincode not found" })
    }

    pincode.isActive = !pincode.isActive
    await pincode.save()

    res.json(pincode)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
