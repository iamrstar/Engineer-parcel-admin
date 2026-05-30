const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");


const adminAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_super_secret_jwt_key_here"
    );

    let admin = await Admin.findById(decoded.id);
    
    // If not found in Admin collection, check if they are a User with admin role
    if (!admin) {
      const User = require("../models/User");
      const user = await User.findById(decoded.id);
      if (user && (user.role === 'admin' || user.role === 'staff') && user.isActive) {
        admin = user; // Treat this user as an admin
      }
    }

    if (!admin) {
      return res.status(401).json({ message: "Token is not valid or insufficient permissions" });
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      console.warn("Auth token expired.");
    } else {
      console.error("Admin auth failed:", error.message);
    }
    res.status(401).json({ message: "Admin token invalid or expired" });
  }
};

module.exports = adminAuth;
