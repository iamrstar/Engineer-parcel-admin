const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    type: {
      type: String,
      enum: ["tracking", "general"],
      default: "general"
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin", // Assuming assigned by admin
    },
    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium"
    },
    dueDate: {
      type: Date
    },
    bookings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
      },
    ],
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
    },
    completedAt: {
      type: Date,
    },
    completionNote: {
      type: String,
    },
    completionImage: {
      type: String,
    },
    comments: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "comments.userModel" },
        userModel: { type: String, required: true, enum: ['User', 'Admin'] },
        name: { type: String, required: true },
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
