import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search");

        if (!search) {
            return NextResponse.json([]);
        }

        await connectDB();
        const db = mongoose.connection.db;
        if (!db) {
            throw new Error("Database connection failed");
        }

        const vendorsCollection = db.collection("vendors");

        // Search by name or vendorId (case-insensitive)
        const query = {
            $or: [
                { name: { $regex: search, $options: "i" } },
                { vendorId: { $regex: search, $options: "i" } }
            ]
        };

        const vendors = await vendorsCollection
            .find(query)
            .limit(10)
            .toArray();

        // Map _id to string for JSON safety if needed, though Next.js handles it usually
        const results = vendors.map(v => ({
            ...v,
            _id: v._id.toString()
        }));

        return NextResponse.json(results);

    } catch (error: any) {
        console.error("Vendor Search Error:", error);
        return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
    }
}
