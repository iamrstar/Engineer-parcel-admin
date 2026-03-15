import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import Booking from "@/models/Booking"

export async function GET(request) {
  try {
    const authResult = verifyToken(request)
    if (!authResult.success) {
      return NextResponse.json({ message: authResult.message }, { status: 401 })
    }

    await connectDB()

    const totalBookings = await Booking.countDocuments()
    const pendingBookings = await Booking.countDocuments({ status: "pending" })
    const deliveredBookings = await Booking.countDocuments({ status: "delivered" })
    const inTransitBookings = await Booking.countDocuments({ status: "in-transit" })

    const totalRevenue = await Booking.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$pricing.totalAmount" } } },
    ])

    return NextResponse.json({
      totalBookings,
      pendingBookings,
      deliveredBookings,
      inTransitBookings,
      totalRevenue: totalRevenue[0]?.total || 0,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
