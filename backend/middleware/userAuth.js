const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Admin = require("../models/Admin");

const userAuth = async (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({ message: "No token, authorization denied" });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "your_super_secret_jwt_key_here_make_it_long_and_complex"
        );

        let user = await User.findById(decoded.id);

        // If not found in User, check Admin collection (Admins can perform all user actions)
        if (!user) {
            const admin = await Admin.findById(decoded.id);
            if (admin) {
                user = {
                    _id: admin._id,
                    id: admin._id,
                    name: admin.username,
                    username: admin.username,
                    role: "admin",
                    isActive: true,
                    permissions: ["ALL"],
                    locationAccessMode: "global",
                };
            }
        }

        if (!user) {
            return res.status(401).json({ message: "Token is not valid" });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: "Account is deactivated" });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            console.warn("User auth token expired.");
        } else {
            console.error("User auth failed:", error.message);
        }
        res.status(401).json({ message: "Token invalid or expired" });
    }
};

module.exports = userAuth;
