const nodemailer = require("nodemailer");
require("dotenv").config();

const sendEmail = async ({ to, subject, html, invoicePath, bookingId }) => {
  console.log("📨 Preparing to send email...");
  console.log("📌 To:", to);

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // required for Gmail
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // MUST be App Password
      },
    });

    const mailOptions = {
      from: `"Engineers Parcel" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      attachments: invoicePath
        ? [
            {
              filename: `Invoice-${bookingId}.pdf`,
              path: invoicePath,
            },
          ]
        : [],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("📧 Email sent successfully:", info.messageId);

    return info;
  } catch (error) {
    console.error("❌ Email sending failed:");
    console.error("Error Code:", error.code);
    console.error("Response:", error.response);
    console.error("Full Error:", error);
    throw error;
  }
};

module.exports = sendEmail;
