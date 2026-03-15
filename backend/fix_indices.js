const mongoose = require('mongoose');
require('dotenv').config();

async function fix() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/courier-admin');
        console.log("Connected to DB");

        const collection = mongoose.connection.collection('users');

        // 1. Drop old indices
        const indicesToDrop = ['id_1', 'username_1', 'email_1'];
        for (const index of indicesToDrop) {
            try {
                await collection.dropIndex(index);
                console.log(`Dropped index: ${index}`);
            } catch (err) {
                console.log(`Index ${index} not found or error dropping:`, err.message);
            }
        }

        // 2. Recreate with sparse: true
        console.log("Recreating indices with sparse: true...");
        await collection.createIndex({ id: 1 }, { unique: true, sparse: true });
        await collection.createIndex({ username: 1 }, { unique: true, sparse: true });
        await collection.createIndex({ email: 1 }, { unique: true, sparse: true });

        console.log("Indices fixed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

fix();
