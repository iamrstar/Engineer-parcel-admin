const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

// Get leads for the current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch pending leads that this user has NOT declined
    const pendingLeads = await Lead.find({
      status: 'New',
      declinedBy: { $ne: userId }
    }).sort({ createdAt: -1 });

    // Fetch leads assigned to this user
    const myLeads = await Lead.find({
      assignedTo: userId
    }).sort({ createdAt: -1 });

    res.json({ success: true, pendingLeads, myLeads });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Accept a lead
router.put('/:id/accept', authMiddleware, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    if (lead.status !== 'New') return res.status(400).json({ success: false, message: 'Lead already accepted or updated' });

    lead.status = 'Accepted';
    lead.assignedTo = req.user._id;
    await lead.save();

    // Emit event that lead was accepted so it removes from others' screens
    const io = req.app.get('socketio');
    if (io) {
      io.emit('lead_accepted', { leadId: lead._id, assignedTo: req.user._id });
    }

    res.json({ success: true, lead });
  } catch (error) {
    console.error('Error accepting lead:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Decline a lead
router.put('/:id/decline', authMiddleware, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    if (!lead.declinedBy.includes(req.user._id)) {
      lead.declinedBy.push(req.user._id);
    }

    // Check if declined by ALL staff/admins
    const totalStaff = await User.countDocuments({ role: { $in: ['admin', 'staff'] } });
    
    if (lead.declinedBy.length >= totalStaff) {
      // Reset and trigger popup again
      lead.declinedBy = [];
      await lead.save();

      const io = req.app.get('socketio');
      if (io) {
        io.emit('new_lead', lead);
      }
    } else {
      await lead.save();
    }

    res.json({ success: true, lead });
  } catch (error) {
    console.error('Error declining lead:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update lead status/temperature
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status, temperature } = req.body;
    const lead = await Lead.findById(req.params.id);
    
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    if (lead.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this lead' });
    }

    if (status) lead.status = status;
    if (temperature) lead.temperature = temperature;

    await lead.save();
    res.json({ success: true, lead });
  } catch (error) {
    console.error('Error updating lead status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get summarized report
router.get('/report', authMiddleware, async (req, res) => {
  try {
    const totalOnlineLeads = await Lead.countDocuments({ source: 'Price Estimator' });
    const convertedLeads = await Lead.countDocuments({ status: 'Converted' });
    const notConvertedLeads = await Lead.countDocuments({ status: 'Not Converted' });
    const acceptedLeads = await Lead.countDocuments({ status: 'Accepted' });

    res.json({
      success: true,
      totalOnlineLeads,
      convertedLeads,
      notConvertedLeads,
      acceptedLeads
    });
  } catch (error) {
    console.error('Error fetching lead report:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
