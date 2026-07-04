const jwt = require("jsonwebtoken");
const Partner = require("../models/Partner");

const partnerPortalAuth = async (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({ message: "No authentication token, access denied" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== "partner") {
            return res.status(403).json({ message: "Access denied. Partners only." });
        }

        const partner = await Partner.findById(decoded.id);
        if (!partner) {
            return res.status(401).json({ message: "Partner authorization failed" });
        }

        req.partner = partner;
        next();
    } catch (err) {
        res.status(401).json({ message: "Token is invalid" });
    }
};

module.exports = partnerPortalAuth;
