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

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page")) || 1
    const limit = Number.parseInt(searchParams.get("limit")) || 10
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    await connectDB()

    const query = {}

    if (status && status !== "all") {
      query.status = status
    }

    if (search) {
      query.$or = [
        { bookingId: { $regex: search, $options: "i" } },
        { "senderDetails.name": { $regex: search, $options: "i" } },
        { "receiverDetails.name": { $regex: search, $options: "i" } },
        { "senderDetails.phone": { $regex: search, $options: "i" } },
        { "receiverDetails.phone": { $regex: search, $options: "i" } },
      ]
    }

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Booking.countDocuments(query)

    return NextResponse.json({
      bookings,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
