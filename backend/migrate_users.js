const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/courier-admin');
        console.log("Connected to DB");

        const usersCol = mongoose.connection.collection('users');
        const intakeCol = mongoose.connection.collection('intake_users');

        const oldUsers = await usersCol.find({}).toArray();
        console.log(`Found ${oldUsers.length} users in 'users' collection`);

        let migrated = 0;
        let skipped = 0;

        for (const user of oldUsers) {
            // Check if user already exists in intake_users by phone or username
            const existing = await intakeCol.findOne({
                $or: [
                    ...(user.phone ? [{ phone: user.phone }] : []),
                    ...(user.username ? [{ username: user.username }] : []),
                ]
            });

            if (existing) {
                console.log(`  Skipped: ${user.name || user.username} (already exists in intake_users)`);
                skipped++;
                continue;
            }

            // Build the document to insert
            const doc = {
                name: user.name || user.username || 'Unknown',
                phone: user.phone,
                username: user.username,
                email: user.email,
                password: user.password, // Already hashed
                role: user.role || 'rider',
                designation: user.designation || '',
                isActive: user.isActive !== false,
                createdAt: user.createdAt || new Date(),
                updatedAt: user.updatedAt || new Date(),
            };

            await intakeCol.insertOne(doc);
            console.log(`  Migrated: ${doc.name} (${doc.role})`);
            migrated++;
        }

        console.log(`\nMigration complete: ${migrated} migrated, ${skipped} skipped`);
        process.exit(0);
    } catch (err) {
        console.error("Migration error:", err);
        process.exit(1);
    }
}

migrate();
