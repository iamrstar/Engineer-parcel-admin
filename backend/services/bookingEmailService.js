const { sendEmail } = require("./emailService");
const { generateBookingConfirmationTemplate } = require("./emailTemplates");

/**
 * Sends booking confirmation email to sender
 * @param {Object} booking - Booking document
 */
const sendBookingConfirmation = async (booking) => {
  try {
    if (!booking.senderDetails?.email) {
      console.warn("⚠️ No sender email found for booking:", booking._id);
      return;
    }

    const htmlContent = generateBookingConfirmationTemplate(booking);

    const emailOptions = {
      to: booking.senderDetails.email,
      subject: `Booking Confirmation - ${booking.bookingId || booking._id}`,
      html: htmlContent,
    };

    await sendEmail(emailOptions);

    console.log(`✅ Confirmation email sent to ${booking.senderDetails.email}`);
  } catch (error) {
    console.error("❌ Error in sendBookingConfirmation:", error.message);
  }
};

module.exports = { sendBookingConfirmation };
