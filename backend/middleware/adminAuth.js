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

    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({ message: "Token is not valid" });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error("Admin auth failed:", error);
    res.status(401).json({ message: "Admin token invalid or expired" });
  }
};

module.exports = adminAuth;
