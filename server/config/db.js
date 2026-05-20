import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    // In development don't kill the process — allow the server to start
    // and nodemon to stay running so the front-end can be viewed.
  }
};

export default connectDB;
