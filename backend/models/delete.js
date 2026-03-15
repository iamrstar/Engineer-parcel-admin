const mongoose = require('mongoose');
const Booking = require('../models/Booking'); // Path to your Booking model

const mongoURI = "mongodb+srv://rajchatterji20:jaR5QNAU3n587zDb@cluster0.uzthk7v.mongodb.net/engineersparcel?retryWrites=true&w=majority&appName=Cluster0"// 🔁 Replace with your DB name

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
})
  .then(() => {
    console.log('✅ MongoDB connected');

    // Function to delete bookings with "Harsit Raj Pathak" as sender or receiver
    const deleteBookingsByName = async () => {
      try {
        const nameToDelete = "Raj chatterjee";

        const result = await Booking.deleteMany({
          $or: [
            { "senderDetails.name": nameToDelete },  // Delete if sender name is "Harsit Raj Pathak"
            { "receiverDetails.name": nameToDelete }  // Delete if receiver name is "Harsit Raj Pathak"
          ]
        });

        console.log(`🗑️ ${result.deletedCount} bookings deleted where name is "${nameToDelete}".`);
      } catch (error) {
        console.error("❌ Error deleting bookings:", error);
      } finally {
        mongoose.connection.close();  // Ensure the connection is closed after the operation
      }
    };

    // Run the function to delete bookings
    deleteBookingsByName();
  })
  .catch((error) => {
    console.error("⚠️ Error connecting to MongoDB:", error);
  });