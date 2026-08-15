import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/scriptbridge").then(async () => {
  const comps = await mongoose.connection.db.collection('competitions').find({}).toArray();
  for (const comp of comps) {
    console.log(`Comp: ${comp._id}`);
    console.log(`detailedPrizes:`, comp.detailedPrizes);
    console.log(`resources:`, comp.resources);
    
    // Fix them if they are primitive arrays (strings/objectids)
    let needsFix = false;
    let newDetailedPrizes = comp.detailedPrizes;
    if (Array.isArray(comp.detailedPrizes)) {
      if (comp.detailedPrizes.some(p => typeof p === 'string' || p instanceof mongoose.Types.ObjectId)) {
        newDetailedPrizes = [];
        needsFix = true;
      }
    }
    
    let newResources = comp.resources;
    if (Array.isArray(comp.resources)) {
      if (comp.resources.some(p => typeof p === 'string' || p instanceof mongoose.Types.ObjectId)) {
        newResources = [];
        needsFix = true;
      }
    }
    
    if (needsFix) {
      await mongoose.connection.db.collection('competitions').updateOne(
        { _id: comp._id },
        { $set: { detailedPrizes: newDetailedPrizes, resources: newResources } }
      );
      console.log(`Fixed comp ${comp._id}`);
    }
  }
  process.exit(0);
}).catch(console.error);
