const express = require("express");
const nodemailer = require("nodemailer");

const router = express.Router();

router.post("/send-email", async (req, res) => {
  const { to, subject, text, html } = req.body;

  if (!to || !subject || !text) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"A1 Network Admin" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ success: false, message: "Failed to send email", error });
  }
});

module.exports = router; // 👈 ye line zaroor honi chahiye
