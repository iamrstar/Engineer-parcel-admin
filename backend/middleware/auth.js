const jwt = require("jsonwebtoken") 
const Admin = require("../models/Admin")
const User = require("../models/User")

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" })
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_super_secret_jwt_key_here_make_it_long_and_complex",
    )
    
    // First try Admin
    let userOrAdmin = await Admin.findById(decoded.id)
    if (userOrAdmin) {
      req.admin = userOrAdmin;
      return next();
    }

    // If not Admin, try User
    userOrAdmin = await User.findById(decoded.id)
    if (userOrAdmin && userOrAdmin.isActive) {
      req.user = userOrAdmin;
      return next();
    }

    return res.status(401).json({ message: "Token is not valid or account deactivated" })
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" })
  }
}

module.exports = authMiddleware
