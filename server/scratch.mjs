import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/scriptbridge").then(async () => {
  const comp = await mongoose.connection.db.collection('competitions').findOne({ _id: new mongoose.Types.ObjectId("6a6a38b6588d5f7cb41a2a90") });
  console.log("detailedPrizes:", JSON.stringify(comp.detailedPrizes, null, 2));
  console.log("resources:", JSON.stringify(comp.resources, null, 2));
  process.exit(0);
}).catch(console.error);
