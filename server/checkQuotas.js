import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const users = await User.find({ "subscription.contactsLimit": 15 });
    console.log("Users with 15:", users.map(u => u.email));
    const allUsers = await User.find({});
    console.log("All limits:", allUsers.map(u => u.subscription?.contactsLimit));
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
