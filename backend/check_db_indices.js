const mongoose = require('mongoose');
require('dotenv').config();

const UserSchema = new mongoose.Schema({
    phone: String,
    username: String,
    id: Number
}, { strict: false });

const User = mongoose.model('User', UserSchema);

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/courier-admin');
        console.log("Connected to DB");

        const users = await User.find({}, { phone: 1, username: 1, id: 1 }).limit(10);
        console.log("Existing Users (first 10):", JSON.stringify(users, null, 2));

        const indexes = await User.collection.listIndexes().toArray();
        console.log("Indexes (Full):", JSON.stringify(indexes, null, 2));

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

check();
