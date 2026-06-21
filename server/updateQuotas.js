import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log("Connected to MongoDB");
    const result = await User.updateMany(
        {},
        { $set: { "subscription.contactsLimit": 10 } }
    );
    console.log(`Updated ${result.modifiedCount} users.`);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
