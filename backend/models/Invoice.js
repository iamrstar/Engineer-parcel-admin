const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
  },
  senderGst: {
    type: String,
    required: true,
  },
  companyName: {
    type: String,
    enum: ['SRQ ENGINEERS PARCEL AND HAUL PRIVATE LIMITED', 'ENGGPARCEL SERVICES LLP'],
    required: true,
  },
  bankName: {
    type: String,
    enum: ['UCO Bank', 'ICICI Bank'],
    required: true,
  },
  dateGenerated: {
    type: Date,
    default: Date.now,
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // assuming there is a user generating it (admin)
  }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
