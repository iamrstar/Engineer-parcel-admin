const fs = require("fs");
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");

require("dotenv").config({ path: "../.env" });

// Setup transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 1️⃣ Generate invoice PDF
const generateInvoice = (bookingId) => {
  const doc = new PDFDocument();
  const filePath = `./Invoice-${bookingId}.pdf`;
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(20).text("Engineers Parcel Invoice", { align: "center" });
  doc.moveDown();
  doc.fontSize(14).text(`Booking ID: ${bookingId}`);
  doc.text(`Date: ${new Date().toLocaleDateString()}`);
  doc.text("Item: Sample Parcel");
  doc.text("Amount: ₹1000");
  doc.end();

  return filePath;
};

// 2️⃣ Send email with invoice
const sendInvoiceEmail = async () => {
  const bookingId = "TEST123"; // example
  const invoicePath = generateInvoice(bookingId);

  try {
    const info = await transporter.sendMail({
      from: `"EngineersParcel" <${process.env.EMAIL_USER}>`,
      to: "rajchatterji20@gmail.com",
      subject: `Invoice for Booking ${bookingId}`,
      text: "Please find attached your invoice.",
      html: "<h2>Please find attached your invoice.</h2>",
      attachments: [
        {
          filename: `Invoice-${bookingId}.pdf`,
          path: invoicePath,
          contentType: "application/pdf",
        },
      ],
    });

    console.log("✅ Email sent with invoice!");
    console.log("Message ID:", info.messageId);
  } catch (err) {
    console.error("❌ Error sending email:", err);
  }
};

sendInvoiceEmail();
