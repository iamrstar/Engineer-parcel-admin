const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  source: { type: String },
  details: { type: Object },

  // Admin Management Fields
  status: {
    type: String,
    enum: ['New', 'Accepted', 'Converted', 'Not Converted'],
    default: 'New'
  },
  temperature: {
    type: String,
    enum: ['None', 'Hot', 'Cold', 'Warm'],
    default: 'None'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  declinedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);
