module.exports = function bookingConfirmationTemplate(booking) {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Booking Confirmation</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f5f5f5;
          padding: 0;
          margin: 0;
        }
        .container {
          background: #ffffff;
          max-width: 600px;
          margin: auto;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          padding: 10px 0;
        }
        .header h1 {
          color: #ff6b00;
          margin-bottom: 0;
        }
        .content {
          color: #333;
          font-size: 16px;
          line-height: 1.6;
        }
        .highlight {
          font-size: 18px;
          font-weight: bold;
          color: #ff6b00;
        }
        .btn {
          background: #ff6b00;
          color: #fff;
          padding: 12px 18px;
          border-radius: 6px;
          text-decoration: none;
          display: inline-block;
          margin: 20px 0;
          font-weight: bold;
        }
        .footer {
          margin-top: 30px;
          font-size: 13px;
          text-align: center;
          color: #666;
        }
      </style>
    </head>

    <body>
      <div class="container">
        <div class="header">
          <h1>Engineers Parcel</h1>
          <p>Booking Confirmation</p>
        </div>

        <div class="content">
          <p>Hi <strong>${booking.senderDetails?.name || "Customer"}</strong>,</p>
          <p>Your booking has been successfully created! 🎉</p>

          <p>Your <span class="highlight">Booking ID: ${booking.bookingId}</span></p>

          <p>You can track your shipment anytime using the button below:</p>

          <a href="https://www.engineersparcel.in/track-order"
             class="btn">
            Track Your Order 🚚
          </a>

          <h3>📦 Parcel Details:</h3>
          <p><strong>From:</strong> ${booking.senderDetails?.city || ""}, ${booking.senderDetails?.state || ""}</p>
          <p><strong>To:</strong> ${booking.receiverDetails?.city || ""}, ${booking.receiverDetails?.state || ""}</p>
          <p><strong>Service Type:</strong> ${booking.serviceType}</p>
          <p><strong>Price:</strong> ₹${booking.totalAmount}</p>
          <p><strong>Pickup Date:</strong> ${booking.pickupDate}</p>

          <p>Our team will update you about your shipment status regularly.</p>

          <p>Thank you for choosing Engineers Parcel!</p>
        </div>

        <div class="footer">
          <p>For any queries, contact support@engineersparcel.in</p>
          <p>© ${new Date().getFullYear()} Engineers Parcel</p>
        </div>
      </div>
    </body>
  </html>
  `;
};
