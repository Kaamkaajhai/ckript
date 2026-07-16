import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const runMigration = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB.");

        const rolesToUpdate = ["investor", "producer", "director"];

        const result = await User.updateMany(
            { 
                role: { $in: rolesToUpdate },
                "subscription.meetingsLimit": { $exists: false }
            },
            {
                $set: {
                    "subscription.meetingsLimit": 10,
                    "subscription.scheduledMeetings": []
                }
            }
        );

        console.log(`Successfully updated ${result.modifiedCount} users with meetingsLimit: 10.`);

        const activeResult = await User.updateMany(
            {
                role: { $in: rolesToUpdate },
                "subscription.isActive": true,
                "subscription.meetingsLimit": { $exists: false }
            },
            {
                $set: {
                    "subscription.meetingsLimit": 10,
                    "subscription.scheduledMeetings": []
                }
            }
        );
        
        console.log(`Successfully updated ${activeResult.modifiedCount} active users with meetingsLimit.`);

        // General fallback for active subs missing the field
        const fallback = await User.updateMany(
            {
                "subscription.isActive": true,
                "subscription.meetingsLimit": { $exists: false }
            },
            {
                $set: {
                    "subscription.meetingsLimit": 10,
                    "subscription.scheduledMeetings": []
                }
            }
        );
        console.log(`Successfully updated ${fallback.modifiedCount} fallback users with meetingsLimit.`);

        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};

runMigration();
