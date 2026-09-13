const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const Admin = require('../models/Admin');

// Helper to extract active user/admin information safely
const getActiveUser = (req) => {
  if (req.user) {
    const userRole = (req.user.role || '').toLowerCase();
    return {
      _id: req.user._id,
      name: req.user.name || req.user.username || 'User',
      role: req.user.role || 'staff',
      isAdmin: !req.user.role || ['admin', 'office_admin', 'main_admin'].includes(userRole),
      model: 'User'
    };
  }
  if (req.admin) {
    const adminRole = (req.admin.role || 'admin').toLowerCase();
    return {
      _id: req.admin._id,
      name: req.admin.username || req.admin.name || 'Admin',
      role: req.admin.role || 'admin',
      isAdmin: !req.admin.role || ['admin', 'office_admin', 'main_admin'].includes(adminRole),
      model: req.admin.constructor?.modelName || 'Admin'
    };
  }
  return null;
};

// Get leads for the current user and admin views
router.get('/', authMiddleware, async (req, res) => {
  try {
    const active = getActiveUser(req);
    if (!active) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Fetch pending leads that this user has NOT declined
    const pendingLeads = await Lead.find({
      status: 'New',
      declinedBy: { $ne: active._id }
    }).sort({ createdAt: -1 });

    // Fetch leads assigned to this user
    const myLeadsRaw = await Lead.find({
      assignedTo: active._id
    })
      .populate('assignedTo', 'name username email role')
      .populate('acceptedBy', 'name username email role')
      .sort({ createdAt: -1 });

    // Fetch all processed leads (for Admins and Team visibility)
    const allLeadsRaw = await Lead.find({
      status: { $ne: 'New' }
    })
      .populate('assignedTo', 'name username email role')
      .populate('acceptedBy', 'name username email role')
      .sort({ createdAt: -1 });

    const formatLead = (l) => {
      const obj = l.toObject ? l.toObject() : l;
      if (!obj.acceptedByName && obj.assignedTo) {
        obj.acceptedByName = obj.assignedTo.name || obj.assignedTo.username || 'Staff Member';
      }
      if (!obj.acceptedAt) {
        obj.acceptedAt = obj.updatedAt || obj.createdAt;
      }
      return obj;
    };

    const myLeads = myLeadsRaw.map(formatLead);
    const allLeads = allLeadsRaw.map(formatLead);

    // Always fetch active staff list so Admin can assign leads
    const staffList = await User.find({ isActive: true })
      .select('_id name username role email')
      .sort({ name: 1 });

    res.json({
      success: true,
      pendingLeads,
      myLeads,
      allLeads,
      isAdmin: active.isAdmin,
      currentUserId: active._id,
      staffList,
      staff: staffList
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get staff list for lead reassignment
router.get('/staff-list', authMiddleware, async (req, res) => {
  try {
    const active = getActiveUser(req);
    if (!active) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const staff = await User.find({ isActive: true })
      .select('_id name username role email')
      .sort({ name: 1 });

    res.json({ success: true, staff, staffList: staff });
  } catch (error) {
    console.error('Error fetching staff list:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create a new lead
// Staff: Only provides name and phone, auto-assigned to them.
// Admin: Can provide full details or choose assignment directly to any staff member.
router.post('/', authMiddleware, async (req, res) => {
  try {
    const active = getActiveUser(req);
    if (!active) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { name, phone, email, notes, temperature } = req.body;
    // Source should default to 'Admin Leads' when added from dashboard
    const source = (req.body.source && req.body.source.trim() !== '') ? req.body.source.trim() : 'Admin Leads';

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and Phone number are required' });
    }

    const isStaff = !active.isAdmin;

    const leadData = {
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : '',
      source: source || 'Admin Leads',
      notes: notes || '',
      temperature: temperature || 'None',
      createdBy: active._id,
      createdByModel: active.model,
      createdByName: active.name
    };

    // If submitted by staff: auto-assign directly to this staff member
    if (isStaff) {
      leadData.status = 'Accepted';
      leadData.assignedTo = active._id;
      leadData.acceptedBy = active._id;
      leadData.acceptedByModel = active.model;
      leadData.acceptedByName = active.name;
      leadData.acceptedAt = new Date();
    } else {
      // If submitted by Admin:
      // If admin selected a specific staff member in assignedTo
      if (req.body.assignedTo && req.body.assignedTo.trim() !== '' && req.body.assignedTo !== 'unassigned') {
        const targetUserId = req.body.assignedTo.trim();
        let targetName = 'Staff Member';
        const targetUser = await User.findById(targetUserId);
        if (targetUser) {
          targetName = targetUser.name || targetUser.username;
        }

        leadData.status = 'Accepted';
        leadData.assignedTo = targetUserId;
        leadData.acceptedBy = targetUserId;
        leadData.acceptedByModel = 'User';
        leadData.acceptedByName = targetName;
        leadData.acceptedAt = new Date();
      } else {
        // Unassigned -> Pending available for team pool
        leadData.status = 'New';
        leadData.assignedTo = null;
      }
    }

    const lead = new Lead(leadData);
    await lead.save();

    const io = req.app.get('socketio');
    if (io) {
      if (lead.status === 'New') {
        io.emit('new_lead', lead);
      } else {
        io.emit('lead_accepted', {
          leadId: lead._id,
          assignedTo: lead.assignedTo,
          acceptedByName: lead.acceptedByName,
          acceptedAt: lead.acceptedAt
        });
      }
    }

    res.status(201).json({ 
      success: true, 
      message: isStaff 
        ? `Lead created and auto-assigned to you successfully!` 
        : 'Lead created successfully', 
      lead 
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error creating lead' });
  }
});

// Reassign a lead to another staff member (Admin only)
router.put('/:id/assign', authMiddleware, async (req, res) => {
  try {
    const active = getActiveUser(req);
    if (!active) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!active.isAdmin) {
      return res.status(403).json({ success: false, message: 'Only administrators can reassign leads' });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Target user ID is required' });
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Target staff user not found' });
    }

    const targetName = targetUser.name || targetUser.username || 'Staff Member';

    lead.assignedTo = targetUser._id;
    lead.acceptedByName = targetName;
    lead.acceptedBy = targetUser._id;
    lead.acceptedByModel = 'User';
    if (lead.status === 'New') {
      lead.status = 'Accepted';
    }
    if (!lead.acceptedAt) {
      lead.acceptedAt = new Date();
    }
    await lead.save();

    const io = req.app.get('socketio');
    if (io) {
      io.emit('lead_accepted', {
        leadId: lead._id,
        assignedTo: targetUser._id,
        acceptedByName: targetName,
        acceptedAt: lead.acceptedAt
      });
    }

    res.json({ success: true, message: `Lead successfully reassigned to ${targetName}`, lead });
  } catch (error) {
    console.error('Error reassigning lead:', error);
    res.status(500).json({ success: false, message: 'Server error reassigning lead' });
  }
});

// Accept a lead
router.put('/:id/accept', authMiddleware, async (req, res) => {
  try {
    const active = getActiveUser(req);
    if (!active) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    if (lead.status !== 'New') return res.status(400).json({ success: false, message: 'Lead already accepted or updated' });

    const userName = active.name;
    lead.status = 'Accepted';
    lead.assignedTo = active._id;
    lead.acceptedBy = active._id;
    lead.acceptedByModel = active.model;
    lead.acceptedByName = userName;
    lead.acceptedAt = new Date();
    await lead.save();

    // Emit event that lead was accepted so it updates real-time across users
    const io = req.app.get('socketio');
    if (io) {
      io.emit('lead_accepted', {
        leadId: lead._id,
        assignedTo: active._id,
        acceptedByName: userName,
        acceptedAt: lead.acceptedAt
      });
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
    const active = getActiveUser(req);
    if (!active) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    if (!lead.declinedBy.includes(active._id)) {
      lead.declinedBy.push(active._id);
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

// Update lead status/temperature/notes
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const active = getActiveUser(req);
    if (!active) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { status, temperature, notes } = req.body;
    const lead = await Lead.findById(req.params.id);
    
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    
    const isOwner = lead.assignedTo && lead.assignedTo.toString() === active._id.toString();
    if (!isOwner && !active.isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this lead' });
    }

    if (status) lead.status = status;
    if (temperature) lead.temperature = temperature;
    if (notes !== undefined) lead.notes = notes;

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
    const active = getActiveUser(req);
    const filter = (active && !active.isAdmin) ? { assignedTo: active._id } : {};

    const totalOnlineLeads = await Lead.countDocuments({ ...filter, source: { $ne: 'Admin Leads' } });
    const totalAdminLeads = await Lead.countDocuments({ ...filter, source: 'Admin Leads' });
    const totalLeads = await Lead.countDocuments(filter);
    const convertedLeads = await Lead.countDocuments({ ...filter, status: 'Converted' });
    const notConvertedLeads = await Lead.countDocuments({ ...filter, status: 'Not Converted' });
    const acceptedLeads = await Lead.countDocuments({ ...filter, status: 'Accepted' });

    res.json({
      success: true,
      totalOnlineLeads,
      totalAdminLeads,
      totalLeads,
      convertedLeads,
      notConvertedLeads,
      acceptedLeads
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
