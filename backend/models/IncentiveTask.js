const mongoose = require("mongoose");

const completionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  proofImage: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["pending_approval", "approved", "rejected"],
    default: "pending_approval"
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking"
  },
  adminNote: {
    type: String
  },
  proofNote: {
    type: String
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: {
    type: Date
  }
});

const incentiveTaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  incentiveType: {
    type: String,
    enum: ["fixed", "percentage"],
    default: "fixed"
  },
  incentiveValue: {
    type: Number,
    required: true
  },
  taskType: {
    type: String,
    enum: ["group", "individual"],
    default: "group"
  },
  deadline: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ["active", "completed", "expired"],
    default: "active"
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin"
  },
  acceptedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  completions: [completionSchema],
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    name: String,
    userModel: { type: String, enum: ['User', 'Admin'] },
    message: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model("IncentiveTask", incentiveTaskSchema);
