const mongoose = require("mongoose");
const Booking = require("./models/Booking");
require("dotenv").config({ path: "./.env" });

async function checkIds() {
  await mongoose.connect(process.env.MONGODB_URI);
  const regex = new RegExp(`^EP943\\d+$`);
  const b = await Booking.find({ bookingId: regex });
  console.log("EP943...:", b.map(x => x.bookingId));
  process.exit();
}
checkIds();
