require("dotenv").config();
const nodemailer = require("nodemailer");

/**
 * Create a reusable transporter object using environment variables
 */
const createTransporter = () => {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT);
  const secure = port === 465; // true for SSL (Gmail recommended)
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !port || !user || !pass) {
    console.error("❌ Missing environment variables in emailService.js");
    console.error({ host, port, user, pass });
    throw new Error("Missing .env configuration for email service");
  }

  console.log(`✅ Email transporter configured: ${host}:${port} (secure=${secure})`);

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: port === 587 ? { rejectUnauthorized: false } : undefined,
  });
};

/**
 * Send an email with optional attachments
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Subject of the email
 * @param {string} [options.text] - Plain text version
 * @param {string} [options.html] - HTML version
 * @param {Array} [options.attachments] - Optional attachments
 */
const sendEmail = async ({ to, subject, text, html, attachments = [] }) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"EngineersParcel" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("📨 Email sent successfully!");
    console.log("Message ID:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Email sending error in emailService.js:", error.message);
    throw error;
  }
};

module.exports = { sendEmail };
