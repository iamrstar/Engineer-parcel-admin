const mongoose = require('mongoose');
const Booking = require('./models/Booking');

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://rajchatterji20:jaR5QNAU3n587zDb@cluster0.uzthk7v.mongodb.net/engineersparcel?retryWrites=true').then(async () => {
    const bs = await Booking.find({ vendorId: { $regex: /PAT/i } }).limit(5);
    console.log(bs.map(b => ({ id: b.bookingId, vendorId: b.vendorId, isVendorBooking: b.isVendorBooking, date: b.createdAt })));
    process.exit(0);
});
