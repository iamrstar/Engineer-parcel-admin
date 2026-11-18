const express = require('express');
const router = express.Router();
const Office = require('../models/Office');
const User = require('../models/User');
const GeofenceSetting = require('../models/GeofenceSetting');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth'); // ensure protected

// Only Main Admin can create offices (we could use middleware here)

// Create new office
router.post('/', async (req, res) => {
  try {
    const { name, code, address, contactNumber, username, password, permissions, bookingPrefix, bookingIdStart } = req.body;

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
      bookingPrefix,
      bookingIdStart,
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

// Default Multi-Office Authorized Workplace Locations
const DEFAULT_AUTHORIZED_LOCATIONS = [
  {
    id: "office_1",
    name: "Engineers Parcel Head Office (IIT ISM Dhanbad)",
    placeId: "ChIJO9LYJiignysRoxbn5RCefB4",
    address: "4th Floor, I2H Building, IIT (ISM) Dhanbad, Jharkhand 826004, India",
    latitude: 23.814343,
    longitude: 86.441198,
    radiusMeters: 500,
    isActive: true,
    isHeadOffice: true,
  },
  {
    id: "office_2",
    name: "Engineers Parcel Second Office",
    placeId: "ChIJO6nl04679jkR9J18NwQUqVo",
    address: "Engineers Parcel Second Branch Premises",
    latitude: 23.812500,
    longitude: 86.440000,
    radiusMeters: 500,
    isActive: true,
    isHeadOffice: false,
  },
];

async function getOrCreateGeofenceSetting() {
  let setting = await GeofenceSetting.findOne();
  if (!setting) {
    setting = new GeofenceSetting({
      globalMode: "offices_only",
      enforceGeofence: true,
      authorizedLocations: DEFAULT_AUTHORIZED_LOCATIONS,
    });
    await setting.save();
  } else if (!setting.authorizedLocations || setting.authorizedLocations.length === 0) {
    setting.authorizedLocations = DEFAULT_AUTHORIZED_LOCATIONS;
    await setting.save();
  } else {
    // Ensure Office 2 exists in setting
    const hasOffice2 = setting.authorizedLocations.some(
      (loc) => loc.placeId === "ChIJO6nl04679jkR9J18NwQUqVo" || loc.id === "office_2"
    );
    if (!hasOffice2) {
      setting.authorizedLocations.push(DEFAULT_AUTHORIZED_LOCATIONS[1]);
      await setting.save();
    }
  }
  return setting;
}

// 1. Get current active multi-office geofence configuration
router.get('/geofence-config', async (req, res) => {
  try {
    const setting = await getOrCreateGeofenceSetting();
    res.json({
      globalMode: setting.globalMode || "offices_only",
      enforceGeofence: setting.enforceGeofence !== false,
      authorizedLocations: setting.authorizedLocations || DEFAULT_AUTHORIZED_LOCATIONS,
    });
  } catch (err) {
    console.error("Geofence config error:", err);
    res.json({
      globalMode: "offices_only",
      enforceGeofence: true,
      authorizedLocations: DEFAULT_AUTHORIZED_LOCATIONS,
    });
  }
});

// 2. Update global geofence settings & authorized locations (Admin)
router.put('/geofence-config', async (req, res) => {
  try {
    const { globalMode, enforceGeofence, authorizedLocations } = req.body;
    let setting = await getOrCreateGeofenceSetting();

    if (globalMode && ["offices_only", "pan_india", "global"].includes(globalMode)) {
      setting.globalMode = globalMode;
    }
    if (typeof enforceGeofence !== "undefined") {
      setting.enforceGeofence = Boolean(enforceGeofence);
    }
    if (Array.isArray(authorizedLocations)) {
      setting.authorizedLocations = authorizedLocations;
    }

    await setting.save();
    res.json({ message: "Geofence settings updated successfully", setting });
  } catch (err) {
    console.error("Update geofence error:", err);
    res.status(500).json({ message: "Failed to update geofence configuration" });
  }
});

// 3. Quick toggle active status for an authorized office location (e.g. Office 2)
router.put('/geofence-config/location/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    let setting = await getOrCreateGeofenceSetting();

    const loc = setting.authorizedLocations.find(l => l.id === id || l._id?.toString() === id);
    if (!loc) {
      return res.status(404).json({ message: "Location not found" });
    }

    loc.isActive = !loc.isActive;
    await setting.save();

    res.json({
      message: `${loc.name} access ${loc.isActive ? "enabled" : "disabled"} successfully`,
      location: loc,
      setting
    });
  } catch (err) {
    console.error("Toggle location error:", err);
    res.status(500).json({ message: "Failed to toggle location" });
  }
});

// 4. Add a new authorized office/place
router.post('/geofence-config/location', async (req, res) => {
  try {
    const { name, placeId, address, latitude, longitude, radiusMeters, isActive } = req.body;
    if (!name || !placeId) {
      return res.status(400).json({ message: "Name and Place ID are required" });
    }

    let setting = await getOrCreateGeofenceSetting();
    const newLoc = {
      id: "office_" + Date.now(),
      name,
      placeId,
      address: address || "",
      latitude: Number(latitude) || 23.814343,
      longitude: Number(longitude) || 86.441198,
      radiusMeters: Number(radiusMeters) || 500,
      isActive: isActive !== false,
      isHeadOffice: false
    };

    setting.authorizedLocations.push(newLoc);
    await setting.save();

    res.status(201).json({ message: "Authorized office added successfully", location: newLoc, setting });
  } catch (err) {
    console.error("Add location error:", err);
    res.status(500).json({ message: "Failed to add office location" });
  }
});

// 5. Delete an authorized office
router.delete('/geofence-config/location/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let setting = await getOrCreateGeofenceSetting();

    setting.authorizedLocations = setting.authorizedLocations.filter(
      l => l.id !== id && l._id?.toString() !== id
    );
    await setting.save();

    res.json({ message: "Office location removed", setting });
  } catch (err) {
    console.error("Delete location error:", err);
    res.status(500).json({ message: "Failed to delete office location" });
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

// Toggle mail service (Order Confirmations)
router.put('/:id/mail-service', async (req, res) => {
  try {
    const { enableMailService } = req.body;
    const office = await Office.findByIdAndUpdate(
      req.params.id,
      { enableMailService },
      { new: true }
    );
    if (!office) return res.status(404).json({ message: "Office not found" });

    res.json({ message: "Mail service updated", office });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update mail service" });
  }
});

// Toggle delivery email service
router.put('/:id/delivery-email', async (req, res) => {
  try {
    const { enableDeliveryEmail } = req.body;
    const office = await Office.findByIdAndUpdate(
      req.params.id,
      { enableDeliveryEmail },
      { new: true }
    );
    if (!office) return res.status(404).json({ message: "Office not found" });

    res.json({ message: "Delivery email service updated", office });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update delivery email service" });
  }
});

// Delete an office
router.delete('/:id', async (req, res) => {
  try {
    const office = await Office.findById(req.params.id);
    if (!office) return res.status(404).json({ message: "Office not found" });

    // Optionally, delete the admin user associated with this office
    if (office.adminUser) {
      await User.findByIdAndDelete(office.adminUser);
    }

    await Office.findByIdAndDelete(req.params.id);
    res.json({ message: "Office deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete office" });
  }
});

module.exports = router;
