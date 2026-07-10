const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth'); // Check if this exists, usually it's auth.js or protect
const Invoice = require('../models/Invoice');
const Counter = require('../models/Counter');
const Booking = require('../models/Booking');
const { generateReceiptPDF } = require('../utils/pdfService');

// Initialize counters if they don't exist
const initializeCounters = async () => {
  try {
    const ucoCounter = await Counter.findOne({ id: 'invoice_uco' });
    if (!ucoCounter) {
      await Counter.create({ id: 'invoice_uco', seq: 5 });
    }
    const iciciCounter = await Counter.findOne({ id: 'invoice_icici' });
    if (!iciciCounter) {
      await Counter.create({ id: 'invoice_icici', seq: 2 });
    }
  } catch (err) {
    console.error("Error initializing invoice counters", err);
  }
};

initializeCounters();

// Generate Invoice (Supports Bulk)
router.post('/generate', async (req, res) => {
  try {
    const { bookingIds, senderGst, company } = req.body;

    if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0 || !senderGst || !company) {
      return res.status(400).json({ message: 'Missing required fields or invalid bookingIds' });
    }

    // Determine bank and counter ID based on company
    let bankName = '';
    let counterId = '';
    
    if (company === 'SRQ ENGINEERS PARCEL AND HAUL PRIVATE LIMITED') {
      bankName = 'UCO Bank';
      counterId = 'invoice_uco';
    } else if (company === 'ENGGPARCEL SERVICES LLP') {
      bankName = 'ICICI Bank';
      counterId = 'invoice_icici';
    } else {
      return res.status(400).json({ message: 'Invalid company selected' });
    }

    const generatedInvoices = [];
    const skippedBookings = [];

    for (const bookingId of bookingIds) {
      // Check if an invoice already exists for this booking
      const existingInvoice = await Invoice.findOne({ bookingId });
      if (existingInvoice) {
        skippedBookings.push({ bookingId, reason: 'Invoice already generated' });
        continue;
      }

      // Fetch the booking to verify it exists
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        skippedBookings.push({ bookingId, reason: 'Booking not found' });
        continue;
      }

      // Increment counter
      const counter = await Counter.findOneAndUpdate(
        { id: counterId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      // Format sequence: e.g., 6 -> "06"
      const paddedSeq = String(counter.seq).padStart(2, '0');
      const invoiceNumber = `INV/26-27/${paddedSeq}`;

      // Create the invoice
      const newInvoice = new Invoice({
        invoiceNumber,
        bookingId,
        senderGst,
        companyName: company,
        bankName,
      });

      await newInvoice.save();
      generatedInvoices.push(newInvoice);
    }

    res.status(201).json({ 
      message: `Successfully generated ${generatedInvoices.length} invoices.`, 
      invoices: generatedInvoices,
      skipped: skippedBookings
    });

  } catch (error) {
    console.error("Error generating invoices:", error);
    res.status(500).json({ message: 'Server error generating invoices', error: error.message });
  }
});

// Fetch Invoice by Booking ID
router.get('/booking/:bookingId', async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ bookingId: req.params.bookingId });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({ message: 'Server error fetching invoice' });
  }
});

// Delete Invoice (Smart Delete)
router.delete('/booking/:bookingId', async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const invoice = await Invoice.findOne({ bookingId });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Determine counter ID
    let counterId = '';
    if (invoice.companyName === 'SRQ ENGINEERS PARCEL AND HAUL PRIVATE LIMITED') {
      counterId = 'invoice_uco';
    } else if (invoice.companyName === 'ENGGPARCEL SERVICES LLP') {
      counterId = 'invoice_icici';
    }

    if (counterId) {
      // Extract sequence number from invoiceNumber (e.g., INV/26-27/06 -> 6)
      const parts = invoice.invoiceNumber.split('/');
      const seqStr = parts[parts.length - 1]; // "06"
      const seqNum = parseInt(seqStr, 10);

      const counter = await Counter.findOne({ id: counterId });
      
      // Smart Delete: If this invoice is the very last one generated, roll back the counter
      if (counter && counter.seq === seqNum) {
        await Counter.findOneAndUpdate(
          { id: counterId },
          { $inc: { seq: -1 } }
        );
      }
    }

    await Invoice.findOneAndDelete({ bookingId });
    res.json({ message: 'Invoice deleted successfully' });

  } catch (error) {
    console.error("Error deleting invoice:", error);
    res.status(500).json({ message: 'Server error deleting invoice' });
  }
});

// Download PDF
router.get('/booking/:bookingId/pdf', async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const invoice = await Invoice.findOne({ bookingId });
    const booking = await Booking.findById(bookingId);

    if (!invoice || !booking) {
      return res.status(404).json({ message: 'Invoice or Booking not found' });
    }

    const pdfBuffer = await generateReceiptPDF(booking, invoice);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice_${invoice.invoiceNumber.replace(/\//g, '-')}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    return res.end(pdfBuffer);
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    res.status(500).json({ message: 'Server error generating PDF' });
  }
});

module.exports = router;
