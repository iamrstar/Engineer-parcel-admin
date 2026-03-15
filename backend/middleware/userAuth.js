const jwt = require("jsonwebtoken");
const User = require("../models/User");

const userAuth = async (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({ message: "No token, authorization denied" });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || "your_super_secret_jwt_key_here"
        );

        const user = await User.findById(decoded.id);
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
