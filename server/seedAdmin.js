// Run with: node seedAdmin.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

import User from "./models/User.js";

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const existing = await User.findOne({ email: "admin@ckript.com" });
        if (existing) {
            // Update role to admin and ensure email is verified
            existing.role = "admin";
            existing.emailVerified = true;
            await existing.save();
            console.log("Updated existing user to admin:", existing._id);
        } else {
            const admin = await User.create({
                name: "Admin",
                email: "admin@ckript.com",
                password: "admin123",
                role: "admin",
                emailVerified: true,
            });
            console.log("Admin user created:", admin._id);
            console.log("Email: admin@ckript.com");
            console.log("Password: admin123");
        }

        await mongoose.disconnect();
        console.log("Done!");
    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
};

seedAdmin();