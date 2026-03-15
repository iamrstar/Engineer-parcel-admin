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

    // Fetch bookings that have pricing and are not cancelled.
    // We could filter by status "delivered" or just any successful payment.
    // For now, let's fetch all bookings that aren't cancelled and have totalAmount.
    const query = {
      status: { $ne: "cancelled" },
      "pricing.totalAmount": { $exists: true, $gt: 0 },
    }

    const bookings = await Booking.find(query).select("createdAt pricing.totalAmount").sort({ createdAt: 1 })

    // Aggregate by month (YYYY-MM format)
    const monthlySales = {}

    bookings.forEach((booking) => {
      const date = new Date(booking.createdAt)
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const amount = booking.pricing?.totalAmount || 0

      if (!monthlySales[yearMonth]) {
        monthlySales[yearMonth] = {
          totalAmount: 0,
          totalBookings: 0,
        }
      }

      monthlySales[yearMonth].totalAmount += amount
      monthlySales[yearMonth].totalBookings += 1
    })

    // Convert to array and sort by date descending
    const reportData = Object.entries(monthlySales)
      .map(([month, data]) => ({
        month,
        ...data,
      }))
      .sort((a, b) => b.month.localeCompare(a.month))

    return NextResponse.json({
      success: true,
      reportData,
    })
  } catch (error) {
    console.error("Sales report error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
