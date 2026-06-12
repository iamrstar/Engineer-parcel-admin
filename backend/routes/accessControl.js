const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get users for access control (only staff and office admins)
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({ role: { $in: ['staff', 'office_admin'] } }).select('-password -plainPassword');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch users" });
    }
});

// Update specific user's permissions
router.put('/users/:id', async (req, res) => {
    try {
        const { permissions } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, { permissions }, { new: true }).select('-password -plainPassword');
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: "Failed to update permissions" });
    }
});

// Update multiple users' permissions at once (for "all staff" option)
router.put('/bulk-update', async (req, res) => {
    try {
        const { userIds, permissions } = req.body;
        await User.updateMany(
            { _id: { $in: userIds } },
            { $set: { permissions } }
        );
        res.json({ message: "Updated successfully" });
    } catch (err) {
        res.status(500).json({ message: "Failed to update multiple users" });
    }
});

module.exports = router;
