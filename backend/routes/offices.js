const express = require('express');
const router = express.Router();
const Office = require('../models/Office');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth'); // ensure protected

// Only Main Admin can create offices (we could use middleware here)

// Create new office
router.post('/', async (req, res) => {
    try {
        const { name, code, address, contactNumber, username, password, permissions } = req.body;

        // Ensure user does not already exist
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "Username already exists" });
        }

        // Ensure office code does not already exist
        const existingOffice = await Office.findOne({ code });
        if (existingOffice) {
            return res.status(400).json({ message: "Office code already exists" });
        }

        // Create user
        const hashedPassword = await bcrypt.hash(password, 10);
        const adminUser = new User({
            username,
            password: hashedPassword,
            plainPassword: password, // Used in legacy
            name: name + " Admin",
            role: "office_admin",
            permissions: permissions || ["Dashboard", "Booking", "E-Docket", "Create Order"],
        });

        const savedUser = await adminUser.save();

        // Create office
        const office = new Office({
            name,
            code,
            address,
            contactNumber,
            adminUser: savedUser._id
        });

        const savedOffice = await office.save();

        // Link office to user
        savedUser.officeId = savedOffice._id;
        await savedUser.save();

        res.status(201).json(savedOffice);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create office" });
    }
});

// Update office permissions
router.put('/:id/permissions', async (req, res) => {
    try {
        const { permissions } = req.body;
        const office = await Office.findById(req.params.id);
        if (!office) return res.status(404).json({ message: "Office not found" });

        const adminUser = await User.findById(office.adminUser);
        if (!adminUser) return res.status(404).json({ message: "Admin user not found for this office" });

        adminUser.permissions = permissions;
        await adminUser.save();

        res.json({ message: "Permissions updated successfully", permissions });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update permissions" });
    }
});

// Get all offices
router.get('/', async (req, res) => {
    try {
        const offices = await Office.find().populate('adminUser', 'username name permissions');
        res.json(offices);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch offices" });
    }
});

module.exports = router;
