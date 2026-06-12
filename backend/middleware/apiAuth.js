const Partner = require("../models/Partner");

const requireApiKey = async (req, res, next) => {
    const apiKey = req.header("x-api-key");
    if (!apiKey) {
        return res.status(401).json({ error: "API Key is required in x-api-key header" });
    }

    try {
        const partner = await Partner.findOne({ apiKey });
        if (!partner) {
            return res.status(401).json({ error: "Invalid API Key" });
        }
        req.partner = partner;
        next();
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
};

module.exports = requireApiKey;
