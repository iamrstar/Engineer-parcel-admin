const mongoose = require("mongoose");
const Booking = require("./backend/models/Booking");
require("dotenv").config({ path: "./backend/.env" });

async function checkIds() {
  await mongoose.connect(process.env.MONGO_URI);
  const bookings = await Booking.find({}, { bookingId: 1 }).lean();
  console.log("Found bookings:", bookings.length);
  bookings.sort((a, b) => {
    let numA = parseInt(a.bookingId.replace("EP", ""));
    let numB = parseInt(b.bookingId.replace("EP", ""));
    return numB - numA; // Descending
  });
  console.log("Top 10 numerical IDs:", bookings.slice(0, 10).map(b => b.bookingId));
  
  const bookingsStrSort = [...bookings].sort((a, b) => b.bookingId.localeCompare(a.bookingId));
  console.log("Top 10 string IDs:", bookingsStrSort.slice(0, 10).map(b => b.bookingId));
  
  process.exit();
}

checkIds();
