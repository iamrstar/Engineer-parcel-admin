import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import Pincode from "@/models/Pincode"

export async function GET(request) {
  try {
    const authResult = verifyToken(request)
    if (!authResult.success) {
      return NextResponse.json({ message: authResult.message }, { status: 401 })
    }

    await connectDB()

    const pincodes = await Pincode.find().sort({ pincode: 1 })
    return NextResponse.json(pincodes)
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

    const { pincode, city, state } = await request.json()

    await connectDB()

    const existingPincode = await Pincode.findOne({ pincode })
    if (existingPincode) {
      return NextResponse.json({ message: "Pincode already exists" }, { status: 400 })
    }

    const newPincode = new Pincode({ pincode, city, state })
    await newPincode.save()

    return NextResponse.json(newPincode, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
