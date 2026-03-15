import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import Booking from "@/models/Booking";

export async function GET(request) {
    try {
        const authResult = verifyToken(request);
        if (!authResult.success) {
            return NextResponse.json({ message: authResult.message }, { status: 401 });
        }

        await connectDB();

        // Count bookings that are NOT verified by the admin
        // This represents new intake orders from the E-Docket agents
        const unverifiedCount = await Booking.countDocuments({ adminVerified: false });

        return NextResponse.json({ count: unverifiedCount });
    } catch (error) {
        console.error("Error fetching e-docket count:", error);
        return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
}
