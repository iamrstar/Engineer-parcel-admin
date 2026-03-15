const { scryptSync } = require("crypto");
const bcrypt = require("bcryptjs");

function verifyPassword(supplied, stored) {
    if (!stored) return false;
    console.log(`Verifying: supplied='${supplied}', stored='${stored}'`);

    if (stored.startsWith("$2a$") || stored.startsWith("$2b$")) {
        try {
            const match = bcrypt.compareSync(supplied, stored);
            console.log("Bcrypt match result:", match);
            return match;
        } catch (err) {
            console.error("Bcrypt comparison error:", err);
            return false;
        }
    }

    try {
        const [hashed, salt] = stored.split(".");
        if (!hashed || !salt) return false;
        const suppliedBuf = scryptSync(supplied, salt, 64);
        const match = suppliedBuf.toString("hex") === hashed;
        console.log("Scrypt match result:", match);
        return match;
    } catch (err) {
        console.error("Scrypt comparison error:", err);
        return false;
    }
}

// Test cases from DB
const anandHash = "$2a$10$Yp0ilF.qFSU5UB.69/0Olu/5u1GwK0Nt5/fIOrTfhcAy24IJ4QgDW";
const adminHash = "58d40fa4233824f6839cdf05fd89f53a6f418de5a80a1dc76b20c79595a76a0904c8f55e04672d164301c77f2285176949eff14c885a7305b81b8b5569857a77.29a63996057c57fb9376b8f488cf91c2";

console.log("--- Testing anand ---");
verifyPassword("Anand321", anandHash);
verifyPassword("anand123", anandHash);

console.log("\n--- Testing admin ---");
verifyPassword("admin123", adminHash);
verifyPassword("Engineers123@", adminHash);
