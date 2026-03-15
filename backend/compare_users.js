const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/courier-admin');
        console.log("Connected to DB");

        const intakeUsers = await mongoose.connection.collection('intake_users').find({}).toArray();
        console.log("Intake Users Count:", intakeUsers.length);
        console.log("Intake Users Data:", JSON.stringify(intakeUsers.map(u => ({
            name: u.name,
            phone: u.phone,
            username: u.username,
            role: u.role
        })), null, 2));

        const users = await mongoose.connection.collection('users').find({}).toArray();
        console.log("Main Users Count:", users.length);
        console.log("Main Users Data:", JSON.stringify(users.map(u => ({
            name: u.name,
            phone: u.phone,
            username: u.username,
            role: u.role
        })), null, 2));

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

check();
