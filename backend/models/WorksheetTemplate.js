const mongoose = require("mongoose");

const fieldSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["number", "text", "textarea", "dropdown"],
    default: "number",
  },
  options: [{
    type: String,
  }],
  placeholder: {
    type: String,
    default: "",
  },
  required: {
    type: Boolean,
    default: false,
  },
  summaryType: {
    type: String,
    enum: ["sum", "average", "count", "none"],
    default: "sum",
  },
  order: {
    type: Number,
    default: 0,
  },
});

const worksheetTemplateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      default: "Daily Work Log",
    },
    designation: {
      type: String,
      default: "Operations & Customer Relations Executive",
    },
    companyName: {
      type: String,
      default: "Engineers Parcel",
    },
    instructions: {
      type: String,
      default: "YELLOW cells = you fill. Fill ONCE at day end (before leaving). Numbers only - 0 if nothing happened. Leave a day completely blank only if you were on leave.",
    },
    // Assigned to specific users, or empty for all staff
    assignedUserIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    applicableRoles: [
      {
        type: String,
        default: ["staff"],
      },
    ],
    fields: [fieldSchema],
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WorksheetTemplate", worksheetTemplateSchema);
