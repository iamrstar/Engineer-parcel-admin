const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: { type: String, default: 'Guest Lead', trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, default: '', trim: true },
  source: { type: String, default: 'Admin Leads' },
  details: { type: Object, default: {} },
  notes: { type: String, default: '' },

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
    refPath: 'assignedToModel',
    default: null
  },
  assignedToModel: {
    type: String,
    enum: ['User', 'Admin'],
    default: 'User'
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
  }],
  remarks: [{
    text: { type: String, required: true, trim: true },
    authorId: { type: mongoose.Schema.Types.ObjectId },
    authorModel: { type: String, enum: ['User', 'Admin'], default: 'User' },
    authorName: { type: String, default: 'Staff' },
    authorRole: { type: String, default: 'staff' },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);
