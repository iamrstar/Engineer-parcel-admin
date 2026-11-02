const mongoose = require("mongoose");

const entrySchema = new mongoose.Schema({
  dayNumber: {
    type: Number,
    required: true,
  },
  date: {
    type: String, // e.g. "01-Nov-2026" or "2026-11-01"
    required: true,
  },
  displayDate: {
    type: String, // e.g. "01-Nov"
  },
  dayOfWeek: {
    type: String, // e.g. "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
  },
  status: {
    type: String,
    enum: ["Present", "Leave", "Half Day", "Weekly Off", "Holiday", ""],
    default: "",
  },
  values: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  isFilled: {
    type: Boolean,
    default: false,
  },
  filledAt: {
    type: Date,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const dailyWorksheetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    staffName: {
      type: String,
      default: "",
    },
    staffRole: {
      type: String,
      default: "Operations & Customer Relations Executive",
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorksheetTemplate",
      required: true,
    },
    month: {
      type: String, // "YYYY-MM", e.g. "2026-11"
      required: true,
    },
    monthStartDate: {
      type: String, // e.g. "01-Nov-2026"
    },
    daysInMonth: {
      type: Number,
      default: 30,
    },
    entries: [entrySchema],
    summary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    lastFilledAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Unique index: each user has one daily worksheet per month
dailyWorksheetSchema.index({ user: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("DailyWorksheet", dailyWorksheetSchema);
