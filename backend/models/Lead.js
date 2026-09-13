const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  source: { type: String, default: 'Admin Leads' },
  details: { type: Object },
  notes: { type: String },

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
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'acceptedByModel',
    default: null
  },
  acceptedByModel: {
    type: String,
    enum: ['User', 'Admin'],
    default: 'User'
  },
  acceptedByName: {
    type: String,
    default: ''
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'createdByModel',
    default: null
  },
  createdByModel: {
    type: String,
    enum: ['User', 'Admin'],
    default: 'Admin'
  },
  createdByName: {
    type: String,
    default: ''
  },
  declinedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);
