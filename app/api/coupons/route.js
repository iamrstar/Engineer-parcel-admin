import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import Coupon from "@/models/Coupon"

export async function GET(request) {
  try {
    const authResult = verifyToken(request)
    if (!authResult.success) {
      return NextResponse.json({ message: authResult.message }, { status: 401 })
    }

    await connectDB()

    const coupons = await Coupon.find().sort({ createdAt: -1 })
    return NextResponse.json(coupons)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const authResult = verifyToken(request)
    if (!authResult.success) {
      return NextResponse.json({ message: authResult.message }, { status: 401 })
    }

    const couponData = await request.json()
    couponData.code = couponData.code.toUpperCase()

    await connectDB()

    const existingCoupon = await Coupon.findOne({ code: couponData.code })
    if (existingCoupon) {
      return NextResponse.json({ message: "Coupon code already exists" }, { status: 400 })
    }

    const newCoupon = new Coupon(couponData)
    await newCoupon.save()

    return NextResponse.json(newCoupon, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
