const mongoose = require("mongoose");

const recipientLogSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  phone: { type: String, default: "" },
  email: { type: String, default: "" },
  channel: { type: String, enum: ["email", "whatsapp"], default: "email" },
  status: { type: String, enum: ["sent", "failed", "pending", "opened"], default: "pending" },
  error: { type: String, default: "" },
  sentAt: { type: Date, default: Date.now },
});

const broadcastCampaignSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    festivalType: {
      type: String,
      enum: ["diwali", "chhath_puja", "new_year", "holi", "eid", "christmas", "national", "offer", "custom"],
      default: "diwali",
    },
    channel: {
      type: String,
      enum: ["email", "whatsapp", "both"],
      default: "both",
    },
    subject: {
      type: String,
      default: "",
    },
    messageText: {
      type: String,
      required: true,
    },
    htmlContent: {
      type: String,
      default: "",
    },
    bannerUrl: {
      type: String,
      default: "",
    },
    couponCode: {
      type: String,
      default: "",
    },
    targetAudience: {
      type: String,
      enum: ["all", "senders", "receivers", "partners", "leads", "custom"],
      default: "all",
    },
    totalRecipients: {
      type: Number,
      default: 0,
    },
    emailsSent: {
      type: Number,
      default: 0,
    },
    emailsFailed: {
      type: Number,
      default: 0,
    },
    whatsappSent: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["draft", "in_progress", "completed", "failed"],
      default: "draft",
    },
    logs: [recipientLogSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdByName: {
      type: String,
      default: "Admin",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BroadcastCampaign", broadcastCampaignSchema);

