const express = require("express")
const Coupon = require("../models/Coupon")
const authMiddleware = require("../middleware/auth")
const router = express.Router()

// Get all coupons
router.get("/", authMiddleware, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 })
    res.json(coupons)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Create new coupon
router.post("/", authMiddleware, async (req, res) => {
  try {
    const couponData = req.body
    couponData.code = couponData.code.toUpperCase()

    const existingCoupon = await Coupon.findOne({ code: couponData.code })
    if (existingCoupon) {
      return res.status(400).json({ message: "Coupon code already exists" })
    }

    const newCoupon = new Coupon(couponData)
    await newCoupon.save()

    res.status(201).json(newCoupon)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Update coupon
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" })
    }

    res.json(coupon)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete coupon
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id)
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" })
    }
    res.json({ message: "Coupon deleted successfully" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Toggle coupon status
router.patch("/:id/toggle", authMiddleware, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" })
    }

    coupon.isActive = !coupon.isActive
    await coupon.save()

    res.json(coupon)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
