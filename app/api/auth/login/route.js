import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { connectDB } from "@/lib/mongodb"
import Admin from "@/models/Admin"

export async function POST(request) {
  try {
    const { username, password } = await request.json()

    await connectDB()

    // Check if admin exists, if not create default admin
    let admin = await Admin.findOne({ username })

    if (!admin && username === "admin@123") {
      admin = new Admin({
        username: "admin@123",
        password: "engineerparcel123",
      })
      await admin.save()
    }

    if (!admin) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 400 })
    }

    // Check password
    const isMatch = await admin.comparePassword(password)
    if (!isMatch) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 400 })
    }

    // Create JWT token
    const token = jwt.sign(
      { id: admin._id },
      process.env.JWT_SECRET || "your_super_secret_jwt_key_here_make_it_long_and_complex",
      { expiresIn: "24h" },
    )

    return NextResponse.json({
      token,
      admin: {
        id: admin._id,
        username: admin.username,
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
